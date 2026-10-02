-- =============================================================================
-- CAMPUSBARTER DATABASE SCHEMA & BACKEND LOGIC (SUPABASE / POSTGRESQL)
-- Production-Ready Schema, Row Level Security (RLS) & Atomic Karma Economy
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- CLEAN RESET: Drop existing tables, triggers & policies if rebuilding schema
-- Ensures conflicting old tables or missing columns (e.g. requester_id) are cleanly recreated.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_pyq_uploaded ON public.pyqs;

DROP TABLE IF EXISTS public.karma_ledger CASCADE;
DROP TABLE IF EXISTS public.pyqs CASCADE;
DROP TABLE IF EXISTS public.swaps CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Extends Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    semester TEXT NOT NULL,
    karma INTEGER NOT NULL DEFAULT 300 CHECK (karma >= 0),
    avatar_url TEXT DEFAULT 'assets/images/avatar-default.jpg',
    teach_skills TEXT[] DEFAULT '{}',
    learn_skills TEXT[] DEFAULT '{}',
    rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    swaps_completed INTEGER NOT NULL DEFAULT 0 CHECK (swaps_completed >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for searching peers by department or semester
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_karma ON public.profiles(karma DESC);

-- -----------------------------------------------------------------------------
-- 2. SWAPS TABLE (4-Phase Barter State Machine)
-- States: PENDING -> ACCEPTED -> SCHEDULED -> COMPLETED (or CANCELLED)
-- -----------------------------------------------------------------------------
CREATE TABLE public.swaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    peer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_teaches TEXT NOT NULL,
    peer_teaches TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
    session_date TEXT,
    session_time TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_different_users CHECK (requester_id <> peer_id)
);

CREATE INDEX IF NOT EXISTS idx_swaps_requester ON public.swaps(requester_id);
CREATE INDEX IF NOT EXISTS idx_swaps_peer ON public.swaps(peer_id);
CREATE INDEX IF NOT EXISTS idx_swaps_status ON public.swaps(status);

-- -----------------------------------------------------------------------------
-- 3. PYQ (PREVIOUS YEAR QUESTIONS) REPOSITORY
-- -----------------------------------------------------------------------------
CREATE TABLE public.pyqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    code TEXT NOT NULL,
    semester TEXT NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('CIA-1', 'CIA-2', 'Semester End')),
    year INTEGER NOT NULL CHECK (year >= 2015 AND year <= 2030),
    file_url TEXT NOT NULL,
    file_size TEXT DEFAULT '2.5 MB',
    pages INTEGER DEFAULT 4 CHECK (pages > 0),
    downloads INTEGER NOT NULL DEFAULT 0 CHECK (downloads >= 0),
    rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    has_solutions BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pyqs_subject ON public.pyqs(subject);
CREATE INDEX IF NOT EXISTS idx_pyqs_semester ON public.pyqs(semester);
CREATE INDEX IF NOT EXISTS idx_pyqs_code ON public.pyqs(code);

-- -----------------------------------------------------------------------------
-- 4. KARMA LEDGER (Immutable Audit Trail for Economy Balance)
-- -----------------------------------------------------------------------------
CREATE TABLE public.karma_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('SIGNUP_BONUS', 'SWAP_COMPLETED', 'PYQ_UPLOAD', 'PYQ_DOWNLOAD', 'TOKEN_REFILL', 'ADMIN_ADJUSTMENT')),
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_karma_ledger_user ON public.karma_ledger(user_id);

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karma_ledger ENABLE ROW LEVEL SECURITY;

-- --- Profiles RLS ---
-- Anyone (authenticated or public) can read directory profiles
CREATE POLICY "Public profiles are viewable by all users" 
ON public.profiles FOR SELECT 
USING (true);

-- Users can update their own personal info (name, skills, bio), but CANNOT update karma directly
CREATE POLICY "Users can update own profile except karma" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Column-Tampering Defense Trigger: Block direct client updates to Karma or Swaps
-- Only trusted SECURITY DEFINER stored procedures can modify karma and swap counts!
CREATE OR REPLACE FUNCTION public.protect_profile_karma()
RETURNS TRIGGER AS $$
BEGIN
    -- If update is initiated by client 'authenticated' role, disallow karma/swap tampering
    IF current_user = 'authenticated' OR current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
        IF NEW.karma <> OLD.karma THEN
            RAISE EXCEPTION 'Security Violation: Direct modification of Karma balance is forbidden. Karma is managed atomically via stored procedures.';
        END IF;
        IF NEW.swaps_completed <> OLD.swaps_completed THEN
            RAISE EXCEPTION 'Security Violation: Direct modification of swaps_completed is forbidden.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_karma ON public.profiles;
CREATE TRIGGER trg_protect_profile_karma
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_karma();


-- --- Swaps RLS ---
-- Users can only see swaps where they are either the requester or the peer
CREATE POLICY "Users can view swaps they participate in" 
ON public.swaps FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = peer_id);

-- Authenticated users can propose a new swap
CREATE POLICY "Authenticated users can create swaps" 
ON public.swaps FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- Only participating users can update swap state (e.g., schedule, accept, complete)
CREATE POLICY "Participants can update their swaps" 
ON public.swaps FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = peer_id);

-- --- PYQ Repository RLS ---
-- Anyone authenticated can view and search exam papers
CREATE POLICY "PYQs are viewable by authenticated users" 
ON public.pyqs FOR SELECT 
USING (true);

-- Authenticated users can upload papers
CREATE POLICY "Authenticated users can insert PYQs" 
ON public.pyqs FOR INSERT 
WITH CHECK (auth.uid() = uploader_id);

-- Only uploader can modify paper details
CREATE POLICY "Uploaders can update their own PYQs" 
ON public.pyqs FOR UPDATE 
USING (auth.uid() = uploader_id);

-- --- Karma Ledger RLS ---
-- Users can view their own transaction history
CREATE POLICY "Users can view their own karma logs" 
ON public.karma_ledger FOR SELECT 
USING (auth.uid() = user_id);

-- Direct client inserts/updates to karma_ledger are strictly forbidden!
-- Only internal database functions (SECURITY DEFINER) can write to this table.


-- -----------------------------------------------------------------------------
-- 6. STRICT KARMA ECONOMY PROCEDURES & FUNCTIONS (SECURITY DEFINER)
-- -----------------------------------------------------------------------------

-- SECURE RULE 1: Automatic Welcome Bonus (+300 Karma) on Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert profile with 300 Karma
    INSERT INTO public.profiles (id, name, email, department, semester, karma, avatar_url, teach_skills, learn_skills)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'New Scholar'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'department', 'Computer Science'),
        COALESCE(NEW.raw_user_meta_data->>'semester', 'Sem 4'),
        300,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'assets/images/avatar-default.jpg'),
        ARRAY['General Studies'],
        ARRAY['Advanced Coding']
    );

    -- Record transaction in the audit ledger
    INSERT INTO public.karma_ledger (user_id, amount, action_type, reference_id, description)
    VALUES (NEW.id, 300, 'SIGNUP_BONUS', NEW.id::text, 'Initial registration welcome bonus');

    RETURN NEW;
END;
$$;

-- Trigger attached to Supabase Auth table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- SECURE RULE 2: Upload PYQ (+25 Karma)
CREATE OR REPLACE FUNCTION public.reward_pyq_upload()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.uploader_id IS NOT NULL THEN
        -- Add +25 Karma to uploader
        UPDATE public.profiles
        SET karma = karma + 25,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.uploader_id;

        -- Record transaction
        INSERT INTO public.karma_ledger (user_id, amount, action_type, reference_id, description)
        VALUES (NEW.uploader_id, 25, 'PYQ_UPLOAD', NEW.id::text, 'Earned 25 Karma for publishing PYQ ' || NEW.code);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_pyq_uploaded ON public.pyqs;
CREATE TRIGGER on_pyq_uploaded
    AFTER INSERT ON public.pyqs
    FOR EACH ROW EXECUTE FUNCTION public.reward_pyq_upload();


-- SECURE RULE 3: Download PYQ (-15 Karma with STRICT balance check)
-- This function runs as a Remote Procedure Call (RPC) called by the client
CREATE OR REPLACE FUNCTION public.download_pyq_secure(p_pyq_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_current_karma INTEGER;
    v_paper RECORD;
BEGIN
    -- 1. Identify calling authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: You must be logged in to download papers.';
    END IF;

    -- 2. Fetch paper details
    SELECT * INTO v_paper FROM public.pyqs WHERE id = p_pyq_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paper not found with ID %', p_pyq_id;
    END IF;

    -- 3. Row-level Lock on user's profile to prevent race-condition exploits
    SELECT karma INTO v_current_karma 
    FROM public.profiles 
    WHERE id = v_user_id 
    FOR UPDATE;

    -- 4. STRICT BALANCE CHECK: Must have at least 15 Karma
    IF v_current_karma < 15 THEN
        RAISE EXCEPTION 'Insufficient Karma balance: You have % Karma, but 15 Karma is required to download this paper.', v_current_karma;
    END IF;

    -- 5. Deduct 15 Karma from user
    UPDATE public.profiles
    SET karma = karma - 15,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    -- 6. Increment download counter on the paper
    UPDATE public.pyqs
    SET downloads = downloads + 1
    WHERE id = p_pyq_id;

    -- 7. Audit log transaction in ledger
    INSERT INTO public.karma_ledger (user_id, amount, action_type, reference_id, description)
    VALUES (v_user_id, -15, 'PYQ_DOWNLOAD', p_pyq_id::text, 'Downloaded exam paper ' || v_paper.code || ' (' || v_paper.subject || ')');

    -- 8. Return success payload with updated balance
    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_current_karma - 15,
        'message', 'Paper unlocked! 15 Karma deducted.',
        'file_url', v_paper.file_url
    );
END;
$$;


-- SECURE RULE 4: Complete Swap (+50 Karma to BOTH participants)
CREATE OR REPLACE FUNCTION public.complete_swap_secure(p_swap_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_swap RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Fetch and lock the swap row
    SELECT * INTO v_swap FROM public.swaps WHERE id = p_swap_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Swap not found.';
    END IF;

    -- Verify the caller is one of the swap participants
    IF v_user_id <> v_swap.requester_id AND v_user_id <> v_swap.peer_id THEN
        RAISE EXCEPTION 'Unauthorized: You are not a participant in this barter.';
    END IF;

    -- Prevent awarding points twice
    IF v_swap.status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Invalid operation: This swap has already been completed.';
    END IF;

    -- Update swap state
    UPDATE public.swaps
    SET status = 'COMPLETED',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_swap_id;

    -- Award +50 Karma to Requester and increment swap count
    UPDATE public.profiles
    SET karma = karma + 50,
        swaps_completed = swaps_completed + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_swap.requester_id;

    -- Award +50 Karma to Peer and increment swap count
    UPDATE public.profiles
    SET karma = karma + 50,
        swaps_completed = swaps_completed + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_swap.peer_id;

    -- Ledger for Requester
    INSERT INTO public.karma_ledger (user_id, amount, action_type, reference_id, description)
    VALUES (v_swap.requester_id, 50, 'SWAP_COMPLETED', p_swap_id::text, 'Successfully completed barter exchange (+50 Karma)');

    -- Ledger for Peer
    INSERT INTO public.karma_ledger (user_id, amount, action_type, reference_id, description)
    VALUES (v_swap.peer_id, 50, 'SWAP_COMPLETED', p_swap_id::text, 'Successfully completed barter exchange (+50 Karma)');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Swap finalized! +50 Karma credited to both students.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- SECURE RULE 5: Automated Karma Token Refill (Cap: 120, +30/hr, 2-Hr Batches)
-- Token refill halts automatically once balance reaches 120 Karma ("120 pahunchte hi ruk jayegi")
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refill_karma_token_secure()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_elapsed_hours NUMERIC;
    v_cycles INTEGER;
    v_refill_amount INTEGER;
    v_needed INTEGER;
    v_new_karma INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Fetch and lock profile row
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile not found.';
    END IF;

    -- Rule: If balance is at or above 120 Karma (e.g. 300 welcome bonus), refill is paused
    IF v_profile.karma >= 120 THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'PAUSED_AT_CAP',
            'current_karma', v_profile.karma,
            'message', 'Karma token refill is paused. Balance is at or above the 120⚡ maximum cap.'
        );
    END IF;

    -- Calculate hours elapsed since last update
    v_elapsed_hours := EXTRACT(EPOCH FROM (v_now - v_profile.updated_at)) / 3600.0;
    v_cycles := FLOOR(v_elapsed_hours / 2.0);

    -- Refills batch every 2 hours (+60 points = 30 points/hour)
    IF v_cycles < 1 THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'CYCLE_IN_PROGRESS',
            'current_karma', v_profile.karma,
            'hours_until_next_refill', ROUND((2.0 - MOD(v_elapsed_hours, 2.0))::numeric, 2),
            'message', 'Next refill cycle in progress (+60⚡ every 2 hours, capped at 120⚡).'
        );
    END IF;

    v_needed := 120 - v_profile.karma;
    v_refill_amount := LEAST(v_cycles * 60, v_needed);
    v_new_karma := v_profile.karma + v_refill_amount;

    -- Update balance and timestamp
    UPDATE public.profiles
    SET karma = v_new_karma,
        updated_at = v_now
    WHERE id = v_user_id;

    -- Audit ledger entry
    INSERT INTO public.karma_ledger (user_id, amount, action_type, reference_id, description)
    VALUES (v_user_id, v_refill_amount, 'TOKEN_REFILL', v_user_id::text, 'Automated 2-hr token refill (+30/hr up to 120 cap)');

    RETURN jsonb_build_object(
        'success', true,
        'status', 'REFILLED',
        'refilled_amount', v_refill_amount,
        'new_balance', v_new_karma,
        'message', 'Karma refilled by +' || v_refill_amount || '⚡! Current balance: ' || v_new_karma || '⚡'
    );
END;
$$;

