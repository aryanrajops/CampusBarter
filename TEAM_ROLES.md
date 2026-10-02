# 👥 Team Roles & Sprint Plan (Deadline: October 4, 2026)

## Project: CampusBarter (CampusXchange)
**Collaboration Window:** October 1, 2026 – October 4, 2026  
**Tools:** AntiGravity IDE (Initial Testing) ➡️ Visual Studio Code (Final Build)  
**Version Control:** Git & GitHub  

---

## 1. Team Structure & Division of Labor

```
                               ┌────────────────────────────────┐
                               │     CampusBarter Core Team     │
                               └───────────────┬────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
   ┌───────────────────────┐                                       ┌───────────────────────┐
   │    Backend & Cloud    │                                       │   Frontend UI / UX    │
   │ Sole Lead (Aryanraj)  │                                       │ (Aryanraj & Shantanu) │
   ├───────────────────────┤                                       ├───────────────────────┤
   │ • Developed 100% Sole │                                       │ • Jointly Developed   │
   │ • Database Schema     │                                       │ • HTML5 & Tailwind    │
   │ • Supabase Cloud      │                                       │ • Glassmorphic UI     │
   │ • Row-Level Security  │                                       │ • Modal Animations    │
   │ • Stored Procedures   │                                       │ • Responsive Design   │
   │ • Karma Engine & Auth │                                       │ • Form Validation     │
   │ • Offline Sync Logic  │                                       │ • Cross-Browser Tests │
   └───────────────────────┘                                       └───────────────────────┘
```

> **Summary of Contribution:**
> - **Frontend Development:** Co-developed by **Aryanraj & Shantanu** (UI/UX design, Tailwind glassmorphism components, page layouts, interactive modals, responsive styling, and animations).
> - **Backend & Security:** Developed **100% Solely by Aryanraj** (Supabase cloud infrastructure, PostgreSQL relational schema, Row-Level Security policies, anti-tamper stored procedures, dual-mode client adapter, authentication workflows, and offline resilience engine).

---

## 2. Detailed Task Classification

### 🛡️ Aryanraj's Responsibilities (Backend, Database, Security & Core Logic)
1. **Supabase Cloud Infrastructure Setup:**
   - Execute and verify [`database.sql`](./database.sql) in Supabase SQL editor.
   - Configure Row Level Security (RLS) policies across `profiles`, `swaps`, `pyqs`, and `karma_ledger`.
   - Verify Foreign Key constraints and cascading deletes.
2. **Karma Economy Stored Procedures (`SECURITY DEFINER`):**
   - Implement and unit-test `download_pyq_secure` (enforcing the `-15 Karma` rule with row locking).
   - Implement `complete_swap_secure` (enforcing the `+50 Karma` rule to both parties).
   - Configure trigger `handle_new_user` on `auth.users` for the `+300 Karma` welcome bonus.
3. **Dual-Mode Adapter & Offline Resilience:**
   - Maintain [`supabase-client.js`](./supabase-client.js) with zero-dependency fallback to `localStorage`.
   - Implement offline transaction queuing (`cb_offline_queue`) and auto-sync on `window.online`.
4. **Security & Vulnerability Assessment:**
   - Ensure dynamic string inputs are sanitized with `sanitizeHTML()` to prevent XSS.
   - Test SQL injection resistance (parameterized queries in PostgREST).
5. **Initial Testing in AntiGravity:**
   - Run preliminary sanity checks and unit tests before exporting the codebase to VS Code.

---

### 🎨 Shantanu's Responsibilities (Frontend, UI/UX, Integration & Client Polish)
1. **Visual Studio Code Environment & Git Migration:**
   - Pull repository into Visual Studio Code; configure Live Server / static server environment.
   - Set up `.gitignore` and ensure `assets/` and source files are tracked cleanly.
2. **User Experience & Modal Micro-Interactions:**
   - Test and polish all modal transitions: Auth modal, Schedule modal, Paper Preview modal, and Upload modal.
   - Verify Toast notification animations and accessibility across devices.
3. **Form Validations & Client Ergonomics:**
   - Add frontend guards: disable the "Download" button immediately upon click to prevent accidental double-clicks before responses return.
   - Validate upload form fields: enforce file size constraints (max 15MB) and acceptable file types (`.pdf`).
4. **Cross-Browser & Mobile QA:**
   - Verify layouts on Chrome, Firefox, Safari, and Edge.
   - Test touch ergonomics and bottom-sheet navigation on mobile viewports (iOS Safari / Android Chrome).

---

### 🤝 Joint Responsibilities (Aryanraj + Shantanu)
1. **Frontend Collaboration:** Pair-designing intuitive barter screens, matching filters, and interactive paper previews.
2. **Integration Sanity Run (October 2):** Connect Shantanu's local VS Code frontend to the live Supabase database instance using the API keys.
3. **Stress & Edge-Case Bug Bash (October 3):** Execute the Debugging Checklist (simulating <15 Karma downloads, offline network cutoffs, simultaneous logins).
4. **Final Demo Rehearsal (October 4):** Conduct end-to-end dry run of the presentation flow (Registration ➡️ Barter Matching ➡️ PYQ Upload & Download ➡️ Offline Demo).

---

## 3. Sprint Roadmap (October 1 – October 4, 2026)

| Day | Focus Area | Aryanraj's Deliverables | Shantanu's Deliverables | Milestone Check |
| :--- | :--- | :--- | :--- | :--- |
| **Day 1 (Oct 1)** | *Backend Architecture & Asset Localization* | `database.sql`, `supabase-client.js`, image download scripts, asset localization. | Verify local HTML/CSS rendering; inspect modal forms and layouts. | Assets 100% offline; schema defined. |
| **Day 2 (Oct 2)** | *Cloud Connection & Migration to VS Code* | Configure Supabase project, paste schema, test RPCs via PostgREST. | Pull repo into VS Code; wire `supabase-client.js` with live Supabase credentials. | Cloud Auth and Karma deductions working live. |
| **Day 3 (Oct 3)** | *Intensive Bug Hunting & Edge-Case QA* | Test race conditions, negative karma bypass attempts, RLS policy penetration. | Test client validation, mobile layout quirks, double-click debouncing. | All 10 checklist test cases passing. |
| **Day 4 (Oct 4)** | *Final Freeze & Project Presentation* | Backup database snapshot, generate SQL dump, prepare offline demo profile. | Final visual polish, code cleanup, presentation slides/dry run. | **Project Submitted & Ready for Demo.** |

---

## 4. RACI Matrix (Responsibility Assignment)

*Legend: **R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed*

| Task / Deliverable | Aryanraj | Shantanu | Notes |
| :--- | :---: | :---: | :--- |
| Database Schema & Migrations | **R/A** | **I** | PostgreSQL schemas in `database.sql` |
| Row Level Security (RLS) Rules | **R/A** | **I** | Strict policy checks on tables |
| Karma Economy Stored Procedures | **R/A** | **C** | `download_pyq_secure`, `complete_swap_secure` |
| Offline Image Assets Setup | **R/A** | **I** | Local images stored in `assets/images/` |
| Visual Studio Code Environment Setup | **I** | **R/A** | Migration from AntiGravity to VS Code |
| UI/UX Micro-Interactions & Styling | **R** | **R/A** | Joint design & Tailwind adjustments |
| Form Validation & Input Masks | **C** | **R/A** | HTML5 validation & PDF drag-and-drop |
| Offline Queue & Auto-Sync Engine | **R/A** | **C** | `DataManager.syncOfflineQueue` |
| End-to-End Bug Bash & QA Checklist | **R** | **R** | Joint verification prior to submission |
| Presentation & Academic Demo | **R** | **R** | Joint presentation to professors/reviewers |
