# 🔍 CampusBarter Debugging & QA Checklist

> **Beginner-Friendly Bug Hunting Guide for October 1 – October 4**  
> Use this checklist to stress-test your application in AntiGravity and Visual Studio Code before the final deadline.

---

## 🎯 High-Priority Test Cases

### 1. The "< 15 Karma" Download Edge Case (CRITICAL)
- **What to test:** A student attempts to download a paper when they do not have enough Karma.
- **How to reproduce:**
  1. Open DevTools Console (`F12` ➡️ `Console`).
  2. Set the current user's karma to 10:
     ```javascript
     STATE.currentUser.karma = 10;
     setStoredCurrentUser(STATE.currentUser);
     renderNavbarAuth();
     ```
  3. Click the **"Download"** button on any paper in the PYQ Repository.
- **Expected Result:**
  - ❌ The download MUST be blocked.
  - 🔔 A red warning toast must appear: *"Insufficient Karma! You have 10⚡, but 15⚡ is required to download this paper."*
  - 🚫 The paper download counter must NOT increment.
  - 🛡️ In Supabase, the stored procedure `download_pyq_secure` must reject the call with an exception.

---

### 2. The Exactly 15 Karma Download Case
- **What to test:** Boundary condition where a user has exactly 15 Karma.
- **How to reproduce:**
  ```javascript
  STATE.currentUser.karma = 15;
  setStoredCurrentUser(STATE.currentUser);
  renderNavbarAuth();
  ```
  Click **"Download"**.
- **Expected Result:**
  - ✅ Download succeeds.
  - ⚡ New balance becomes `0 Karma`.
  - 🔔 Toast confirms: *"Downloaded: ...! -15 Karma deducted (Balance: 0⚡)"*.
  - Subsequent download attempt is immediately blocked.

---

### 3. Rapid Double-Click Race Condition (Concurrency Test)
- **What to test:** A user clicks "Download" 3 times in rapid succession (under 200ms) with a balance of 15 Karma.
- **Expected Result:**
  - Frontend: The button should disable immediately on the first click.
  - Backend: PostgreSQL row lock (`FOR UPDATE`) processes the first request, reduces balance to 0, and the second/third concurrent requests fail with an insufficient funds exception.
  - Net Balance: User cannot end up with `-15` or `-30` Karma.

---

### 4. Unauthenticated Download Attempt
- **What to test:** An anonymous visitor (not logged in) tries to download a paper.
- **How to reproduce:**
  ```javascript
  setStoredCurrentUser(null);
  renderNavbarAuth();
  ```
  Click **"Download"** on any paper.
- **Expected Result:**
  - ❌ Download blocked.
  - 🔔 Toast: *"Please log in to download question papers."*
  - 🪟 The Auth Modal automatically opens, prompting login.

---

### 5. Barter Swap Double-Completion Exploit
- **What to test:** A malicious or glitchy client repeatedly triggers `completeSwap(swapId)`.
- **Expected Result:**
  - The first call marks status as `COMPLETED` and awards `+50 Karma` to each participant.
  - Any subsequent call to the same swap ID must be rejected: *"Invalid operation: This swap has already been completed."*
  - Points must not be granted more than once.

---

### 6. Self-Barter Prevention
- **What to test:** A user attempts to propose a barter swap with themselves (`requester_id === peer_id`).
- **Expected Result:**
  - Database constraint `CONSTRAINT chk_different_users CHECK (requester_id <> peer_id)` aborts insertion.
  - Frontend disables proposing to oneself.

---

### 7. XSS Injection in PYQ Title / Search
- **What to test:** Malicious string injection in paper title or subject.
- **How to reproduce:** In the upload modal, enter:
  `<script>alert("Hacked")</script>`
- **Expected Result:**
  - The script does NOT execute.
  - The text is safely escaped as `&lt;script&gt;alert(&quot;Hacked&quot;)&lt;/script&gt;`.

---

### 8. Offline Mode Network Severance
- **What to test:** Browser loses Wi-Fi connection.
- **How to reproduce:**
  1. Open Chrome DevTools ➡️ **Network** tab.
  2. Change throttling dropdown from *No Throttling* to **Offline**.
  3. Browse peers, filter PYQ papers, switch tabs.
- **Expected Result:**
  - The page continues functioning without crashing.
  - Images load cleanly from local `assets/images/`.
  - Offline transactions are pushed to `cb_offline_queue`.

---

### 9. Network Reconnection Sync
- **What to test:** Wi-Fi is restored after offline operations.
- **How to reproduce:**
  1. Complete an action while offline.
  2. Switch Network tab back to **No Throttling** (Online).
- **Expected Result:**
  - Event listener `window.addEventListener("online")` fires.
  - Console logs: `[Sync Engine] Syncing offline actions to Supabase...`
  - Pending items in `cb_offline_queue` synchronize to the cloud database.

---

### 10. LocalStorage Cleared / First Run Experience
- **What to test:** User opens the site on a fresh browser with empty `localStorage`.
- **How to reproduce:**
  ```javascript
  localStorage.clear();
  location.reload();
  ```
- **Expected Result:**
  - The application automatically seeds default accounts (`Aarav`, `Sneha`, `Karan`), active swaps, and sample PYQ papers.
  - No blank screens or JavaScript `null pointer` exceptions.

---

## 📋 Pre-Submission QA Sign-Off Sheet

| Item # | Verification Check | Tester | Pass / Fail |
| :---: | :--- | :---: | :---: |
| 1 | < 15 Karma download blocked with error toast | Aryanraj × Shantanu | [x] PASS |
| 2 | Exactly 15 Karma download leaves 0 balance | Aryanraj × Shantanu | [x] PASS |
| 3 | Download button debouncing prevents spam | Aryanraj × Shantanu | [x] PASS |
| 4 | Barter completion awards exactly +50 Karma to both | Aryanraj × Shantanu | [x] PASS |
| 5 | Uploading paper awards +25 Karma | Aryanraj × Shantanu | [x] PASS |
| 6 | New registration grants +300 Karma welcome bonus & 30/hr (every 2h) Karma token refill (capped at 120⚡) | Aryanraj × Shantanu | [x] PASS |
| 7 | All 10 avatars and background load offline | Aryanraj × Shantanu | [x] PASS |
| 8 | Search and filter respond smoothly without errors | Aryanraj × Shantanu | [x] PASS |
| 9 | Mobile responsive layout works without horizontal scroll | Aryanraj × Shantanu | [x] PASS |
| 10 | Console has zero uncaught exceptions | Aryanraj × Shantanu | [x] PASS |
| 11 | Real User Starts at Absolute Zero (0 swaps, 0 uploads, 0 downloads, clean empty state) | Aryanraj × Shantanu | [x] PASS |
| 12 | All Dummy/Seed Data Differentiated with "AI " Prefix & "🤖 AI Bot" Pill Badges | Aryanraj × Shantanu | [x] PASS |
| 13 | Global hero stats dynamically calculate from actual dataset lengths | Aryanraj × Shantanu | [x] PASS |
| 14 | Dynamic Peer Live Search & Optgroup Dropdown (Registered Students vs AI Bots) | Aryanraj × Shantanu | [x] PASS |
| 15 | Selected Peer Preview Card with Clickable Skill Quick-Fill Chips | Aryanraj × Shantanu | [x] PASS |
| 16 | Self-Barter strictly blocked (User cannot propose exchange with self) | Aryanraj × Shantanu | [x] PASS |
| 17 | Footer Year 2026 & Developer Credits ("Made by Aryanraj × Shantanu") | Aryanraj × Shantanu | [x] PASS |
| 18 | Procedural Web Audio Sound Engine (Zero network latency, toggleable) | Aryanraj × Shantanu | [x] PASS |
| 19 | Unauthenticated download prompts Login Modal & Redirection | Aryanraj × Shantanu | [x] PASS |
| 20 | Mobile Navigation Drawer Toggle & Responsive Viewport | Aryanraj × Shantanu | [x] PASS |
| 21 | Token Refill Countdown Modal & 120⚡ Cap Pausing | Aryanraj × Shantanu | [x] PASS |
| 22 | Byte-for-Byte MD5 Parity Across All 3 Production & Backup Repositories | Aryanraj × Shantanu | [x] PASS |
| 23 | Direct Google Drive folder bypass eliminated (Clean search-driven UI; enforces -15⚡ Karma per paper) | Aryanraj × Shantanu | [x] PASS |
| 24 | Duplicate paper upload strictly blocked with Anti-Karma-Farming (+25⚡ blocked on duplicate exam papers; papers tamper-proof) | Aryanraj × Shantanu | [x] PASS |
| 25 | Real User Custom Skills Persistence (Teach & Learn): Generic placeholders ('General Studies', 'Advanced Coding') eliminated; authentic skills ('Bakchodi', 'Full Stack React', 'UI/UX Design') reliably loaded from Cloud & LocalStorage | Aryanraj × Shantanu | [x] PASS |
| 26 | Preloader Audio Unlocker Cyber-Pill: Glowing radar wave ring enables procedural audio before user reaches main app | Aryanraj × Shantanu | [x] PASS |
