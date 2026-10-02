# 🎓 CampusBarter (CampusXchange)

> **Peer-to-Peer Academic Barter & Question Vault with a Dual-Mode (Cloud + Offline) Karma Economy**

---

## 📌 Project Overview

**CampusBarter** is a collegiate web platform engineered to eliminate transactional money from student academic collaboration. Instead of paying for tutoring or commercial exam dumps, students trade their academic proficiencies (e.g., teaching *Graph Algorithms* in exchange for learning *React 19*) and share verified Previous Year Questions (PYQs).

The platform operates on a closed, self-balancing **Karma Economy** with strict backend verification:
- 🎁 **Initial Signup / Login:** `+300 Karma` welcome bonus.
- ⏳ **Automated Karma Token Refill:** `+30 Karma/hour` (credited as `+60⚡` every 2 hours, capped at **`120 Karma`** max — refill pauses once 120⚡ is reached).
- 🤝 **Successful Barter Swap:** `+50 Karma` awarded to both participants.
- 📤 **Upload Verified PYQ Paper:** `+25 Karma` per published paper.
- 📥 **Download Exam Paper:** `-15 Karma` deducted (balances the economy and prevents freeloading).

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Vanilla JavaScript (ES6+), Tailwind CSS | Fast, framework-free, accessible, responsive glassmorphic UI |
| **Icons & Typography** | FontAwesome 6 Pro, Google Fonts (Outfit & Plus Jakarta Sans) | Modern collegiate aesthetics, high-contrast dark theme |
| **Cloud Database** | **Supabase (PostgreSQL 15)** | Relational schemas, PostgREST API, Row Level Security (RLS) |
| **Backend Logic** | PostgreSQL Stored Procedures (`SECURITY DEFINER`), Triggers | Atomic Karma transactions, anti-cheat validation, audit ledger |
| **Offline Cache** | Web Storage API (`localStorage`), Reconnection Listeners | Zero-latency offline operation, offline queue sync |
| **Asset Storage** | Local `assets/images/` & Supabase Storage | 100% offline-capable asset pipeline |

---

## 🚀 Quick Start Guide

### 1. Running Locally (Immediate Offline / Demo Mode)
CampusBarter is built with Vanilla Web standards, meaning it requires **zero server installation** to test immediately:

1. Clone or download the repository.
2. Double-click `index.html` to open it in Google Chrome, Edge, Brave, or Firefox.
3. Or serve it using any lightweight static server:
   ```bash
   # Using Python:
   python -m http.server 3000
   
   # Using Node.js (npx):
   npx serve .
   ```
4. Open `http://localhost:3000` in your browser.

---

## ⚡ Dual-Mode Operation (Cloud vs. Offline)

CampusBarter implements a **Dual-Mode Database Architecture**:

```mermaid
graph TD
    UI[Frontend UI (Vanilla JS)] --> DM{Network & Supabase Status}
    DM -- Online & Configured --> SB[Supabase Cloud API]
    SB --> RPC[PostgreSQL SECURITY DEFINER RPCs]
    RPC --> DB[(PostgreSQL Database + Ledger)]
    DB --> Cache[(Cache to LocalStorage)]
    
    DM -- Offline / Unconfigured --> LS[(LocalStorage Cache Engine)]
    LS --> Queue[(Pending Offline Queue)]
    Queue -. Reconnection (online event) .-> SB
```

### Mode A: Full Cloud Mode (Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the entire contents of [`database.sql`](./database.sql).
4. In `script.js` and `supabase-client.js`, the project credentials are now configured:
   ```javascript
   const SUPABASE_URL = "https://cgnnpnzjxgrxhjplhbzm.supabase.co";
   const SUPABASE_ANON_KEY = "sb_publishable_X0Xb9POGSpNQMJO2UM6h5A_u12SVnxR";
   ```

### Mode B: Fully Offline Mode (Zero Configuration)
- The app automatically detects if Supabase credentials are unset or if `navigator.onLine === false`.
- All seed accounts (`Aarav`, `Sneha`, `Karan`), active swaps, and PYQ papers are cached in `localStorage`.
- All images are hosted locally inside `assets/images/`, so the app operates with **zero internet connection**.

---

## 🛡️ Strict Karma Economy Rules

The backend prevents client-side manipulation of points:
1. **Row Level Security (RLS):** Direct `UPDATE public.profiles SET karma = ...` is completely disallowed from the client.
2. **Atomic RPCs:** Karma deduction for downloads occurs inside `download_pyq_secure(p_pyq_id)`. If the user's balance is less than `15 Karma`, PostgreSQL throws an exception and halts the transaction.
3. **Audit Ledger:** Every change is recorded in `karma_ledger` with timestamps and reference IDs.

---

## 📂 Repository Structure

```
CampusXchange/
├── assets/
│   └── images/              # 100% offline avatars & campus background
│       ├── campus-bg.jpg
│       ├── avatar-aarav.jpg
│       ├── avatar-sneha.jpg
│       ├── avatar-karan.jpg
│       └── ...
├── scripts/
│   ├── download_images.ps1  # PowerShell asset fetcher
│   ├── download_images.js   # Node.js asset fetcher
│   └── download_images.py   # Python asset fetcher
├── database.sql             # Supabase schema, RLS, & stored procedures
├── supabase-client.js       # Dual-mode adapter, offline queue, & sanitization
├── index.html               # Main application single-page interface
├── script.js                # Frontend state machine & UI controllers
├── style.css                # Custom glassmorphism, animations, & themes
├── README.md                # Project overview and setup documentation
├── PRD.md                   # Product Requirements Document
├── ARCHITECTURE.md          # Technical architecture & security specification
└── TEAM_ROLES.md            # Sprint task breakdown between developers
```

---

## 👥 Project Team & Contributions
- **Backend, Database & Security Architect:** Developed **100% Solely by Aryanraj** (Supabase Cloud Infrastructure, PostgreSQL Relational Schema, Row Level Security Policies, Atomic Stored Procedures, Offline Sync Engine, and Authentication Integration)
- **Frontend Architecture & UI/UX:** Co-developed by **Aryanraj & Shantanu** (HTML5, Tailwind CSS, Responsive Design, Modal Micro-Interactions, Glassmorphism Design Tokens)
