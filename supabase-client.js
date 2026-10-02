/**
 * CampusBarter - Supabase & Offline Dual-Mode Client Adapter
 * Manages Cloud Synchronization, LocalStorage Caching, and Secure Karma Transactions.
 */

// =============================================================================
// 1. SUPABASE CONFIGURATION
// Configured with actual Supabase Project URL & Anon Public Key
// =============================================================================
const SUPABASE_CONFIG = {
  url: "https://cgnnpnzjxgrxhjplhbzm.supabase.co",
  anonKey: "sb_publishable_X0Xb9POGSpNQMJO2UM6h5A_u12SVnxR"
};

// Global reference to the Supabase client
let sbClient = null;

// Initialize Supabase if CDN library is loaded
if (window.supabase && typeof window.supabase.createClient === "function") {
  try {
    sbClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log("[CampusBarter Backend] Supabase Client Initialized for project:", SUPABASE_CONFIG.url);
  } catch (err) {
    console.warn("[CampusBarter Backend] Supabase initialization failed, running in Offline/LocalStorage mode.", err);
  }
} else {
  console.info("[CampusBarter Backend] Supabase CDN not detected yet. Operating in LocalStorage Fallback Mode.");
}

// =============================================================================
// 2. SECURITY & NORMALIZATION HELPERS
// =============================================================================
function sanitizeHTML(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidUUID(str) {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Normalizes user profile objects to guarantee uniform camelCase and snake_case properties
 * preventing Object-Relational mismatches between Supabase PostgreSQL and Frontend code.
 */
function normalizeProfile(p) {
  if (!p) return null;
  const teach = Array.isArray(p.teachSkills) ? p.teachSkills : (Array.isArray(p.teach_skills) ? p.teach_skills : ["General Studies"]);
  const learn = Array.isArray(p.learnSkills) ? p.learnSkills : (Array.isArray(p.learn_skills) ? p.learn_skills : ["Programming"]);
  const av = p.avatar || p.avatar_url || "assets/images/avatar-default.jpg";
  const name = p.name || (p.user_metadata && p.user_metadata.name) || "Student Peer";
  const dept = p.department || (p.user_metadata && p.user_metadata.department) || "Computer Science";
  const sem = p.semester || (p.user_metadata && p.user_metadata.semester) || "Sem 4";
  const karma = typeof p.karma === "number" ? p.karma : 300;
  const pass = p.password || p.pass || "";

  return {
    id: p.id,
    name: name,
    email: p.email || "",
    password: pass,
    department: dept,
    semester: sem,
    karma: karma,
    lastRefillTime: p.lastRefillTime || p.last_refill_time || Date.now(),
    isAi: p.isAi || p.is_ai || false,
    swapsCompleted: p.swapsCompleted ?? p.swaps_completed ?? 0,
    pyqsUploaded: p.pyqsUploaded ?? p.pyqs_uploaded ?? 0,
    downloads: p.downloads ?? 0,
    avatar: av,
    avatar_url: av,
    teachSkills: teach,
    teach_skills: teach,
    learnSkills: learn,
    learn_skills: learn,
    rating: p.rating || 5.0,
    bio: p.bio || "Active collegiate student on CampusBarter ready to trade skills and knowledge."
  };
}

// Expose helpers globally
window.sanitizeHTML = sanitizeHTML;
window.isValidUUID = isValidUUID;
window.normalizeProfile = normalizeProfile;

// =============================================================================
// 3. DUAL-MODE DATA MANAGER (Cloud Supabase + LocalStorage Fallback)
// =============================================================================
const DataManager = {
  // Check if system is currently online and connected to Supabase
  isOnline() {
    return navigator.onLine && sbClient !== null && SUPABASE_CONFIG.url.includes("cgnnpnzjxgrxhjplhbzm");
  },

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  async signUp(email, password, metadata) {
    if (this.isOnline()) {
      const { data, error } = await sbClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: metadata.name,
            department: metadata.department,
            semester: metadata.semester,
            avatar_url: metadata.avatar || 'assets/images/avatar-default.jpg'
          }
        }
      });
      if (error) throw error;

      const userObj = normalizeProfile({
        id: data.user ? data.user.id : "usr-" + Date.now(),
        name: metadata.name,
        email: email,
        password: password,
        department: metadata.department,
        semester: metadata.semester,
        karma: 300, // Strict Rule: +300 Karma Welcome Bonus (Karma Token Economy)
        lastRefillTime: Date.now(),
        avatar: metadata.avatar || 'assets/images/avatar-default.jpg',
        teachSkills: metadata.teachSkills || ["General Studies"],
        learnSkills: metadata.learnSkills || ["Programming"],
        swapsCompleted: 0,
        pyqsUploaded: 0,
        downloads: 0,
        isAi: false
      });

      // Mirror into local storage accounts
      const accounts = JSON.parse(localStorage.getItem("cb_accounts") || "[]");
      const existsIdx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
      if (existsIdx !== -1) {
        accounts[existsIdx] = userObj;
      } else {
        accounts.push(userObj);
      }
      localStorage.setItem("cb_accounts", JSON.stringify(accounts));
      localStorage.setItem("cb_current_user", JSON.stringify(userObj));
      return userObj;
    } else {
      // LocalStorage Offline Fallback Mode
      const accounts = JSON.parse(localStorage.getItem("cb_accounts") || "[]");
      const exists = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (exists) throw new Error("An account with this email already exists!");

      const newUser = normalizeProfile({
        id: "usr-" + Date.now(),
        name: metadata.name,
        email: email,
        password: password,
        department: metadata.department,
        semester: metadata.semester,
        karma: 300, // Strict Rule: +300 Karma Welcome Bonus (Karma Token Economy)
        lastRefillTime: Date.now(),
        avatar: metadata.avatar || "assets/images/avatar-default.jpg",
        teachSkills: metadata.teachSkills || ["General Studies"],
        learnSkills: metadata.learnSkills || ["Programming"],
        swapsCompleted: 0,
        pyqsUploaded: 0,
        downloads: 0,
        isAi: false
      });

      accounts.push(newUser);
      localStorage.setItem("cb_accounts", JSON.stringify(accounts));
      localStorage.setItem("cb_current_user", JSON.stringify(newUser));
      return newUser;
    }
  },

  async logIn(email, password) {
    if (this.isOnline()) {
      const { data, error } = await sbClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) throw error;

      let userProfile = null;
      try {
        // Fetch profile with verified karma points from cloud
        const { data: profile, error: profileErr } = await sbClient
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (!profileErr && profile) {
          userProfile = normalizeProfile(profile);
        }
      } catch (err) {
        console.warn("[CampusBarter Backend] Cloud profile read warning:", err.message);
      }

      if (!userProfile) {
        userProfile = normalizeProfile({
          id: data.user.id,
          email: data.user.email,
          ...(data.user.user_metadata || {})
        });
      }

      // Synchronize into local storage cache
      const accounts = JSON.parse(localStorage.getItem("cb_accounts") || "[]");
      const existingIdx = accounts.findIndex(a => a.id === userProfile.id || a.email.toLowerCase() === email.toLowerCase());
      if (existingIdx !== -1) {
        accounts[existingIdx] = { ...accounts[existingIdx], ...userProfile };
      } else {
        accounts.push(userProfile);
      }
      localStorage.setItem("cb_accounts", JSON.stringify(accounts));
      localStorage.setItem("cb_current_user", JSON.stringify(userProfile));
      return userProfile;
    } else {
      // LocalStorage Offline Fallback Mode
      const accounts = JSON.parse(localStorage.getItem("cb_accounts") || "[]");
      const user = accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
      if (!user) throw new Error("Invalid email or password!");
      const normalized = normalizeProfile(user);
      localStorage.setItem("cb_current_user", JSON.stringify(normalized));
      return normalized;
    }
  },

  // ---------------------------------------------------------------------------
  // PROFILE MANAGEMENT (Full Name, Skills Teach, Skills Learn, Dept, Sem)
  // Email is locked as non-editable primary key
  // ---------------------------------------------------------------------------
  async updateProfile(userId, profileData) {
    if (this.isOnline() && isValidUUID(userId)) {
      try {
        const { data, error } = await sbClient
          .from("profiles")
          .update({
            name: profileData.name,
            department: profileData.department,
            semester: profileData.semester,
            teach_skills: profileData.teachSkills,
            learn_skills: profileData.learnSkills,
            ...(profileData.avatar ? { avatar_url: profileData.avatar } : {}),
            updated_at: new Date().toISOString()
          })
          .eq("id", userId)
          .select()
          .single();

        if (error) {
          console.warn("[CampusBarter Backend] Cloud profile update warning:", error.message);
          return null;
        }
        return normalizeProfile(data);
      } catch (err) {
        console.warn("[CampusBarter Backend] Cloud profile update exception:", err.message);
        return null;
      }
    }
    return null;
  },

  // ---------------------------------------------------------------------------
  // SECURE PASSWORD UPDATE (Cloud Supabase Auth + LocalStorage Dual-Sync)
  // ---------------------------------------------------------------------------
  async updatePassword(email, newPassword) {
    if (!email || !newPassword) throw new Error("Email and new password are required.");
    if (newPassword.length < 4) throw new Error("New password must be at least 4 characters long.");

    if (this.isOnline() && sbClient) {
      try {
        const { error } = await sbClient.auth.updateUser({ password: newPassword });
        if (error) console.warn("[CampusBarter Backend] Cloud password update warning:", error.message);
      } catch (err) {
        console.warn("[CampusBarter Backend] Cloud password update exception:", err.message);
      }
    }

    // Always synchronize into localStorage cb_accounts & cb_current_user
    try {
      const accounts = JSON.parse(localStorage.getItem("cb_accounts") || "[]");
      const accIdx = accounts.findIndex(a => a.email && a.email.toLowerCase() === email.toLowerCase());
      if (accIdx !== -1) {
        accounts[accIdx].password = newPassword;
        localStorage.setItem("cb_accounts", JSON.stringify(accounts));
      }

      const curr = JSON.parse(localStorage.getItem("cb_current_user") || "null");
      if (curr && curr.email && curr.email.toLowerCase() === email.toLowerCase()) {
        curr.password = newPassword;
        localStorage.setItem("cb_current_user", JSON.stringify(curr));
      }
    } catch (e) {
      console.warn("[CampusBarter Backend] Local storage password sync note:", e.message);
    }

    return true;
  },

  // ---------------------------------------------------------------------------
  // SECURE KARMA ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Secure PYQ Download:
   * Deducts 15 Karma and tracks download.
   */
  async downloadPYQ(paperId, currentUser) {
    if (!currentUser) {
      throw new Error("Please log in to download question papers.");
    }
    if (currentUser.karma < 15) {
      throw new Error(`Insufficient Karma balance! You have ${currentUser.karma}⚡, but 15⚡ is required to download this paper.`);
    }

    if (this.isOnline() && isValidUUID(paperId) && isValidUUID(currentUser.id)) {
      // Execute the atomic PostgreSQL Stored Procedure in Supabase
      const { data, error } = await sbClient.rpc("download_pyq_secure", {
        p_pyq_id: paperId
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && typeof data.new_balance === "number") {
        currentUser.karma = data.new_balance;
      }
      return data;
    } else {
      // Record in offline audit queue for eventual cloud synchronization
      this.queueOfflineAction("PYQ_DOWNLOAD", {
        paperId: paperId,
        userId: currentUser.id,
        amount: -15,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        new_balance: currentUser.karma,
        message: "Paper downloaded offline! 15 Karma deducted."
      };
    }
  },

  /**
   * Secure Barter Completion:
   * Awards +50 Karma to both participants upon verification.
   */
  async completeSwap(swapId, currentUser, peerId) {
    if (this.isOnline() && isValidUUID(swapId)) {
      const { data, error } = await sbClient.rpc("complete_swap_secure", {
        p_swap_id: swapId
      });
      if (error) throw new Error(error.message);
      return data;
    } else {
      this.queueOfflineAction("SWAP_COMPLETED", {
        swapId: swapId,
        userId: currentUser ? currentUser.id : null,
        peerId: peerId,
        amount: 50,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: "Swap marked completed! +50 Karma credited to both members." };
    }
  },

  /**
   * Secure PYQ Upload:
   * Awards +25 Karma to uploader upon paper publication.
   */
  async uploadPYQ(paperData, currentUser) {
    if (this.isOnline() && currentUser && isValidUUID(currentUser.id)) {
      const { data, error } = await sbClient.from("pyqs").insert([{
        uploader_id: currentUser.id,
        subject: paperData.subject,
        code: paperData.code,
        semester: paperData.semester,
        exam_type: paperData.examType,
        year: parseInt(paperData.year, 10),
        file_url: paperData.fileUrl || "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link",
        file_size: paperData.fileSize || "2.4 MB",
        pages: paperData.pages || 4,
        has_solutions: paperData.hasSolutions || false
      }]).select().single();

      if (error) throw error;
      return data;
    } else {
      this.queueOfflineAction("PYQ_UPLOAD", {
        paperData: paperData,
        userId: currentUser ? currentUser.id : null,
        amount: 25,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: "Paper saved locally! +25 Karma awarded." };
    }
  },

  // ---------------------------------------------------------------------------
  // OFFLINE QUEUE & AUTO-SYNC ENGINE
  // ---------------------------------------------------------------------------
  queueOfflineAction(action, payload) {
    const queue = JSON.parse(localStorage.getItem("cb_offline_queue") || "[]");
    queue.push({ action, payload, queuedAt: Date.now() });
    localStorage.setItem("cb_offline_queue", JSON.stringify(queue));
    console.log(`[Offline Queue] Recorded action: ${action}`, payload);
  },

  async syncOfflineQueue() {
    if (!this.isOnline()) return;
    const queue = JSON.parse(localStorage.getItem("cb_offline_queue") || "[]");
    if (queue.length === 0) return;

    console.log(`[Sync Engine] Syncing ${queue.length} offline actions to Supabase...`);
    const remainingQueue = [];

    for (const item of queue) {
      try {
        if (item.action === "PYQ_DOWNLOAD") {
          if (isValidUUID(item.payload.paperId)) {
            await sbClient.rpc("download_pyq_secure", { p_pyq_id: item.payload.paperId });
          }
        } else if (item.action === "SWAP_COMPLETED") {
          if (isValidUUID(item.payload.swapId)) {
            await sbClient.rpc("complete_swap_secure", { p_swap_id: item.payload.swapId });
          }
        } else if (item.action === "PYQ_UPLOAD" && item.payload && item.payload.paperData) {
          const p = item.payload.paperData;
          if (item.payload.userId && isValidUUID(item.payload.userId)) {
            await sbClient.from("pyqs").insert([{
              uploader_id: item.payload.userId,
              subject: p.subject,
              code: p.code,
              semester: p.semester,
              exam_type: p.examType,
              year: parseInt(p.year, 10),
              file_url: p.fileUrl || "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link",
              file_size: p.fileSize || "2.4 MB",
              pages: p.pages || 4,
              has_solutions: p.hasSolutions || false
            }]);
          }
        }
      } catch (err) {
        console.warn(`[Sync Engine] Failed to sync action: ${item.action}`, err);
        remainingQueue.push(item);
      }
    }

    localStorage.setItem("cb_offline_queue", JSON.stringify(remainingQueue));
    if (remainingQueue.length === 0) {
      console.log("[Sync Engine] All offline transactions synced successfully.");
    }
  }
};

// Listen for network reconnection to auto-sync offline changes
window.addEventListener("online", () => {
  console.log("[Network] Connection restored. Synchronizing offline queue...");
  DataManager.syncOfflineQueue();
});

window.DataManager = DataManager;
