/**
 * CampusBarter - Frontend Logic, Auth System & Peer Barter Engine
 * Vanilla JavaScript with Supabase Cloud Database + LocalStorage State Persistence
 */

// =============================================================================
// 1. INITIALIZE SUPABASE CLIENT
// =============================================================================
const SUPABASE_URL = 'https://cgnnpnzjxgrxhjplhbzm.supabase.co'; // Your actual Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_X0Xb9POGSpNQMJO2UM6h5A_u12SVnxR'; // Your actual Anon Key

// Safely attach client to window.supabaseClient to avoid global namespace collision with the CDN library
window.supabaseClient = (window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : (typeof sbClient !== 'undefined' ? sbClient : null);

if (window.supabaseClient) {
  console.log('[CampusBarter] Connected to Supabase Project:', SUPABASE_URL);
}

// Google Drive Auto-Uploader Webhook URL (Google Apps Script)
const GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxentAPYMzbQ01LzsRCC5ZU4ranLs9TJgkVJuJI-3aC1u2R_Pnin3MylRXDk2UAXVi-9w/exec";

// =============================================================================
// SECURITY & INPUT SANITIZATION UTILITIES (XSS & PHISHING DEFENSE)
// =============================================================================
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
window.escapeHTML = escapeHTML;

function isValidDriveUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    // Allow Google Drive, Google Docs, or reputable academic cloud domains
    return host.includes("google.com") || host.endsWith(".edu") || host.includes("drive");
  } catch (e) {
    return false;
  }
}
window.isValidDriveUrl = isValidDriveUrl;

// =============================================================================
// 2. STATE & SEED DATA (LocalStorage & Dual-Mode Persistence)
// =============================================================================

const DEFAULT_ACCOUNTS = [
  {
    id: "usr-aryan",
    name: "Aryan Raj",
    isAi: false,
    email: "aryanraj.20j@gmail.com",
    password: "24865",
    department: "Computer Science & Engineering",
    semester: "Sem 5",
    karma: 300,
    swapsCompleted: 3,
    pyqsUploaded: 2,
    downloads: 5,
    avatar: "assets/images/avatar-default.jpg",
    teachSkills: ["Full Stack Web Dev", "Python & DSA"],
    learnSkills: ["UI/UX Design", "System Architecture"]
  },
  {
    id: "usr-1",
    name: "AI Aarav Patel",
    isAi: true,
    email: "aarav@college.edu",
    password: "1234",
    department: "Computer Science",
    semester: "Sem 6",
    karma: 520,
    swapsCompleted: 4,
    pyqsUploaded: 3,
    downloads: 12,
    avatar: "assets/images/avatar-aarav.jpg",
    teachSkills: ["DSA in C++", "Graph Algorithms"],
    learnSkills: ["React 19", "System Architecture"]
  },
  {
    id: "usr-2",
    name: "AI Sneha Mukherjee",
    isAi: true,
    email: "sneha@college.edu",
    password: "1234",
    department: "Computer Science",
    semester: "Sem 6",
    karma: 640,
    swapsCompleted: 14,
    pyqsUploaded: 5,
    downloads: 24,
    avatar: "assets/images/avatar-sneha.jpg",
    teachSkills: ["React 19 & Next.js", "Tailwind CSS"],
    learnSkills: ["BGP Routing", "OS Memory Paging"]
  },
  {
    id: "usr-3",
    name: "AI Karan Johal",
    isAi: true,
    email: "karan@college.edu",
    password: "1234",
    department: "Data Science & AI",
    semester: "Sem 4",
    karma: 430,
    swapsCompleted: 9,
    pyqsUploaded: 2,
    downloads: 8,
    avatar: "assets/images/avatar-karan.jpg",
    teachSkills: ["Python for AI", "NumPy & Pandas"],
    learnSkills: ["SQL Subqueries", "DBMS Indexing"]
  }
];

function getStoredAccounts() {
  const data = localStorage.getItem("cb_accounts");
  if (!data) {
    localStorage.setItem("cb_accounts", JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  }
  let accounts = JSON.parse(data);
  // Migration check: ensure mock AI accounts are properly prefixed and flagged
  let updated = false;
  // Ensure Aryan Raj account is seeded in existing local cache
  if (!accounts.some(a => a.email && a.email.toLowerCase() === 'aryanraj.20j@gmail.com')) {
    const aryan = DEFAULT_ACCOUNTS.find(a => a.email === 'aryanraj.20j@gmail.com');
    if (aryan) {
      accounts.unshift(aryan);
      updated = true;
    }
  }
  accounts = accounts.map(acc => {
    if (acc.id === "usr-1" || acc.id === "usr-2" || acc.id === "usr-3") {
      acc.isAi = true;
      if (!acc.name.startsWith("AI ")) {
        acc.name = "AI " + acc.name.replace(/^AI\s*/, "");
        updated = true;
      }
    } else if (acc.isAi === undefined) {
      acc.isAi = false;
      updated = true;
    }
    if (acc.swapsCompleted === undefined) { acc.swapsCompleted = 0; updated = true; }
    if (acc.pyqsUploaded === undefined) { acc.pyqsUploaded = 0; updated = true; }
    if (acc.downloads === undefined) { acc.downloads = 0; updated = true; }
    return acc;
  });
  if (updated) {
    localStorage.setItem("cb_accounts", JSON.stringify(accounts));
  }
  return accounts;
}

function saveStoredAccounts(accounts) {
  localStorage.setItem("cb_accounts", JSON.stringify(accounts));
}

function getStoredCurrentUser() {
  try {
    const user = localStorage.getItem("cb_current_user");
    if (user === null) {
      const def = DEFAULT_ACCOUNTS.find(a => a.email === 'aryanraj.20j@gmail.com') || DEFAULT_ACCOUNTS[0];
      localStorage.setItem("cb_current_user", JSON.stringify(def));
      return def;
    }
    if (!user || user === "null") return null;
    let parsed = JSON.parse(user);
    if (typeof normalizeProfile === "function") {
      parsed = normalizeProfile(parsed);
    }
    let updated = false;
    if ((parsed.id === "usr-1" || parsed.id === "usr-2" || parsed.id === "usr-3") && !parsed.name.startsWith("AI ")) {
      parsed.name = "AI " + parsed.name.replace(/^AI\s*/, "");
      parsed.isAi = true;
      updated = true;
    }
    if (parsed.swapsCompleted === undefined) { parsed.swapsCompleted = 0; updated = true; }
    if (parsed.pyqsUploaded === undefined) { parsed.pyqsUploaded = 0; updated = true; }
    if (parsed.downloads === undefined) { parsed.downloads = 0; updated = true; }
    if (updated) {
      localStorage.setItem("cb_current_user", JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.warn("[CampusBarter Auth] Failed to read current user, falling back:", e);
    return null;
  }
}

function setStoredCurrentUser(user) {
  try {
    const normalized = user && typeof normalizeProfile === "function" ? normalizeProfile(user) : user;
    localStorage.setItem("cb_current_user", normalized ? JSON.stringify(normalized) : "null");
    if (typeof STATE !== "undefined") {
      STATE.currentUser = normalized;
    }
  } catch (e) {
    console.warn("[CampusBarter Auth] Failed to save current user:", e);
  }
}

const DEFAULT_PYQS = [
  {
    id: "pyq-101",
    subject: "Data Structures & Algorithms",
    code: "CS-301",
    semester: "Sem 3",
    examType: "Semester End",
    year: 2024,
    fileSize: "3.4 MB",
    pages: 6,
    downloads: 418,
    rating: 4.9,
    uploader: "AI Rohan V.",
    isAi: true,
    uploaderAvatar: "assets/images/avatar-rohan.jpg",
    hasSolutions: true,
    fileUrl: "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link"
  },
  {
    id: "pyq-102",
    subject: "Operating Systems",
    code: "CS-402",
    semester: "Sem 4",
    examType: "CIA-2",
    year: 2023,
    fileSize: "2.1 MB",
    pages: 4,
    downloads: 320,
    rating: 4.8,
    uploader: "AI Priya S.",
    isAi: true,
    uploaderAvatar: "assets/images/avatar-sneha.jpg",
    hasSolutions: true,
    fileUrl: "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link"
  },
  {
    id: "pyq-103",
    subject: "Database Management Systems",
    code: "CS-403",
    semester: "Sem 4",
    examType: "CIA-1",
    year: 2024,
    fileSize: "1.8 MB",
    pages: 3,
    downloads: 275,
    rating: 4.7,
    uploader: "AI Tanmay K.",
    isAi: true,
    uploaderAvatar: "assets/images/avatar-karan.jpg",
    hasSolutions: false,
    fileUrl: "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link"
  },
  {
    id: "pyq-104",
    subject: "Computer Networks",
    code: "CS-501",
    semester: "Sem 5",
    examType: "Semester End",
    year: 2023,
    fileSize: "4.2 MB",
    pages: 8,
    downloads: 560,
    rating: 5.0,
    uploader: "AI Ananya Roy",
    isAi: true,
    uploaderAvatar: "assets/images/avatar-ananya.jpg",
    hasSolutions: true,
    fileUrl: "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link"
  },
  {
    id: "pyq-105",
    subject: "Discrete Mathematics",
    code: "MA-301",
    semester: "Sem 3",
    examType: "CIA-1",
    year: 2024,
    fileSize: "2.8 MB",
    pages: 5,
    downloads: 198,
    rating: 4.6,
    uploader: "AI Devansh S.",
    isAi: true,
    uploaderAvatar: "assets/images/avatar-devansh.jpg",
    hasSolutions: true,
    fileUrl: "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link"
  },
  {
    id: "pyq-106",
    subject: "Theory of Computation",
    code: "CS-503",
    semester: "Sem 5",
    examType: "CIA-2",
    year: 2023,
    fileSize: "1.9 MB",
    pages: 4,
    downloads: 245,
    rating: 4.7,
    uploader: "AI Meera Nair",
    isAi: true,
    uploaderAvatar: "assets/images/avatar-meera.jpg",
    hasSolutions: false,
    fileUrl: "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link"
  }
];

function getStoredPYQs() {
  const data = localStorage.getItem("cb_pyqs");
  if (!data) {
    localStorage.setItem("cb_pyqs", JSON.stringify(DEFAULT_PYQS));
    return DEFAULT_PYQS;
  }
  try {
    const list = JSON.parse(data);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_PYQS;
  } catch (e) {
    return DEFAULT_PYQS;
  }
}

function saveStoredPYQs(pyqs) {
  localStorage.setItem("cb_pyqs", JSON.stringify(pyqs));
}

const DEFAULT_SWAPS = [
  {
    id: "swp-01",
    userId: "usr-1",
    peerId: "usr-2",
    peerName: "AI Sneha Mukherjee",
    isAi: true,
    peerAvatar: "assets/images/avatar-sneha.jpg",
    peerDepartment: "Computer Science",
    peerSemester: "Sem 6",
    peerTeaches: "React 19 & State Hooks",
    peerLearns: "DSA Graph Algorithms",
    status: "SCHEDULED",
    date: "Tomorrow",
    time: "4:30 PM",
    location: "Library Discussion Room B",
    notes: "Focus on useEffect lifecycle and Graph BFS/DFS traversal"
  },
  {
    id: "swp-02",
    userId: "usr-1",
    peerId: "usr-3",
    peerName: "AI Karan Johal",
    isAi: true,
    peerAvatar: "assets/images/avatar-karan.jpg",
    peerDepartment: "Data Science & AI",
    peerSemester: "Sem 4",
    peerTeaches: "Pandas DataFrame Aggregations",
    peerLearns: "SQL Window Functions & BCNF",
    status: "ACCEPTED",
    date: null,
    time: null,
    location: null,
    notes: "Prep for upcoming CIA-2 exams"
  },
  {
    id: "swp-03",
    userId: "usr-1",
    peerId: "usr-4",
    peerName: "AI Divya Nambiar",
    isAi: true,
    peerAvatar: "assets/images/avatar-aarav.jpg",
    peerDepartment: "Information Technology",
    peerSemester: "Sem 5",
    peerTeaches: "Docker Containerization",
    peerLearns: "Binary Search Trees",
    status: "PENDING",
    date: null,
    time: null,
    location: null,
    notes: "Practicing DSA while sharing DevOps tips"
  },
  {
    id: "swp-04",
    userId: "usr-1",
    peerId: "usr-5",
    peerName: "AI Vikram Malhotra",
    isAi: true,
    peerAvatar: "assets/images/avatar-vikram.jpg",
    peerDepartment: "Computer Science",
    peerSemester: "Sem 6",
    peerTeaches: "DBMS Query Optimization",
    peerLearns: "Dynamic Programming in C++",
    status: "COMPLETED",
    date: "Oct 12, 2024",
    time: "2:00 PM",
    location: "Tech Lounge Floor 3",
    notes: "Covered 0/1 Knapsack & Indexing strategies. Barter successful!"
  }
];

function getStoredSwaps() {
  const data = localStorage.getItem("cb_swaps");
  if (!data) {
    localStorage.setItem("cb_swaps", JSON.stringify(DEFAULT_SWAPS));
    return DEFAULT_SWAPS;
  }
  try {
    const list = JSON.parse(data);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_SWAPS;
  } catch (e) {
    return DEFAULT_SWAPS;
  }
}

function saveStoredSwaps(swaps) {
  localStorage.setItem("cb_swaps", JSON.stringify(swaps));
}

const DEFAULT_PEERS = [
  {
    id: "usr-2",
    name: "AI Sneha Mukherjee",
    isAi: true,
    avatar: "assets/images/avatar-sneha.jpg",
    department: "Computer Science",
    semester: "Sem 6",
    rating: 4.95,
    swapsCompleted: 14,
    karma: 640,
    matchScore: 98,
    bio: "AI Persona: Frontend engineer and open source builder. Loves crisp UI and OS internals.",
    teachSkills: ["React 19 & Next.js", "Tailwind CSS", "TypeScript Basics"],
    learnSkills: ["BGP Routing", "OS Memory Paging", "Graph BFS/DFS"]
  },
  {
    id: "usr-3",
    name: "AI Karan Johal",
    isAi: true,
    avatar: "assets/images/avatar-karan.jpg",
    department: "Data Science & AI",
    semester: "Sem 4",
    rating: 4.88,
    swapsCompleted: 9,
    karma: 430,
    matchScore: 92,
    bio: "AI Persona: Data science enthusiast skilled in large datasets, PyTorch, and NumPy operations.",
    teachSkills: ["Python for AI", "NumPy & Pandas", "Matplotlib / Seaborn"],
    learnSkills: ["SQL Subqueries & BCNF", "DBMS Indexing", "DSA Stacks & Queues"]
  },
  {
    id: "usr-4",
    name: "AI Divya Nambiar",
    isAi: true,
    avatar: "assets/images/avatar-aarav.jpg",
    department: "Information Technology",
    semester: "Sem 5",
    rating: 4.92,
    swapsCompleted: 11,
    karma: 510,
    matchScore: 89,
    bio: "AI Persona: Cloud & DevOps learner. Passionate about Docker, Linux shell scripting, and microservices.",
    teachSkills: ["Docker & Containers", "Linux Bash Scripts", "Git & GitHub Workflow"],
    learnSkills: ["Binary Search Trees", "Dynamic Programming", "Dijkstra Algorithm"]
  },
  {
    id: "usr-5",
    name: "AI Vikram Malhotra",
    isAi: true,
    avatar: "assets/images/avatar-vikram.jpg",
    department: "Computer Science",
    semester: "Sem 6",
    rating: 4.85,
    swapsCompleted: 16,
    karma: 710,
    matchScore: 86,
    bio: "AI Persona: Backend developer and database enthusiast focused on query tuning and schema normalization.",
    teachSkills: ["DBMS Optimization", "PostgreSQL & Redis", "System Design"],
    learnSkills: ["Dynamic Programming", "Trie & Graph Theory", "C++ STL Vectors"]
  }
];

function getStoredPeers() {
  try {
    const accounts = getStoredAccounts();
    const peers = [...DEFAULT_PEERS];
    accounts.forEach(acc => {
      if (!acc.isAi && !peers.some(p => p.id === acc.id || (p.email && acc.email && p.email.toLowerCase() === acc.email.toLowerCase()))) {
        peers.push({
          id: acc.id,
          name: acc.name,
          email: acc.email,
          isAi: false,
          avatar: acc.avatar || "assets/images/avatar-default.jpg",
          department: acc.department || "Computer Science",
          semester: acc.semester || "Sem 1",
          rating: 5.0,
          swapsCompleted: acc.swapsCompleted || 0,
          karma: acc.karma || 300,
          matchScore: 95,
          bio: acc.bio || "Active collegiate student on CampusBarter ready to trade skills and knowledge.",
          teachSkills: acc.teachSkills || ["General Studies"],
          learnSkills: acc.learnSkills || ["Programming"]
        });
      }
    });
    return peers;
  } catch (e) {
    console.warn("[CampusBarter Storage] Error reading peers, falling back:", e);
    return [...DEFAULT_PEERS];
  }
}

const STATE = {
  currentUser: getStoredCurrentUser(),
  accounts: getStoredAccounts(),
  currentSwapFilter: "ALL",
  currentDeptFilter: "ALL",
  pyqs: getStoredPYQs(),
  activeSwaps: getStoredSwaps(),
  peers: getStoredPeers()
};

// =============================================================================
// AI MOCK IDENTIFIER & REAL USER STATS ENGINE
// =============================================================================

function renderAiBadge(isAi, showReal = false) {
  if (isAi) {
    return `<span class="badge-ai-bot" title="System-generated AI Mock Data"><i class="fa-solid fa-robot"></i> AI Bot</span>`;
  }
  if (showReal) {
    return `<span class="badge-real-user" title="Verified Real Student Account"><i class="fa-solid fa-circle-check"></i> Real User</span>`;
  }
  return "";
}

function getUserActiveSwaps() {
  if (!STATE.currentUser) {
    // When visiting as a guest, display mock seed swaps so visitors can explore the 4-phase state machine
    return STATE.activeSwaps;
  }
  // If current logged-in account is AI Aarav Patel (usr-1, the pre-seeded demo user), show his 4 demo swaps
  if (STATE.currentUser.id === "usr-1") {
    return STATE.activeSwaps.filter(s => !s.userId || s.userId === "usr-1" || s.peerId === "usr-1");
  }
  // For any REAL user, strictly display ONLY their own swaps (starts at empty 0)
  return STATE.activeSwaps.filter(s => s.userId === STATE.currentUser.id || s.peerId === STATE.currentUser.id);
}

function updateGlobalStats() {
  const statSwaps = document.getElementById("stat-total-swaps");
  const statPyqs = document.getElementById("stat-total-pyqs");
  const statPeers = document.getElementById("stat-total-peers");
  if (statSwaps) statSwaps.innerText = STATE.activeSwaps.length;
  if (statPyqs) statPyqs.innerText = STATE.pyqs.length;
  const allPeerIds = new Set(STATE.peers.map(p => p.id));
  if (STATE.currentUser) allPeerIds.add(STATE.currentUser.id);
  if (statPeers) statPeers.innerText = allPeerIds.size;
}

// =============================================================================
// 2. UI INITIALIZATION & EVENT LISTENERS
// =============================================================================

function populateDropdownFilters() {
  const subSelect = document.getElementById("filter-subject");
  const semSelect = document.getElementById("filter-semester");
  if (subSelect) {
    const subjects = ["ALL", "Data Structures & Algorithms", "Operating Systems", "Database Management Systems", "Computer Networks", "Discrete Mathematics", "Theory of Computation"];
    subSelect.innerHTML = subjects.map(s => `<option value="${s}">${s === "ALL" ? "All Subjects" : s}</option>`).join("");
  }
  if (semSelect) {
    const sems = ["ALL", "Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"];
    semSelect.innerHTML = sems.map(s => `<option value="${s}">${s === "ALL" ? "All Semesters" : s}</option>`).join("");
  }
}

function setupEventListeners() {
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  if (toggleBtn && mobileNav) {
    toggleBtn.addEventListener("click", () => mobileNav.classList.toggle("hidden"));
    mobileNav.querySelectorAll("a, button").forEach(item => {
      item.addEventListener("click", () => {
        mobileNav.classList.add("hidden");
      });
    });
  }

  const searchInput = document.getElementById("pyq-search-input");
  const subFilter = document.getElementById("filter-subject");
  const semFilter = document.getElementById("filter-semester");
  const examFilter = document.getElementById("filter-exam-type");
  const resetPyqBtn = document.getElementById("btn-reset-pyq-filters");
  const resetEmptyBtn = document.getElementById("reset-filters-empty-btn");

  const triggerFilter = () => filterAndRenderPYQs();

  if (searchInput) searchInput.addEventListener("input", triggerFilter);
  if (subFilter) subFilter.addEventListener("change", triggerFilter);
  if (semFilter) semFilter.addEventListener("change", triggerFilter);
  if (examFilter) examFilter.addEventListener("change", triggerFilter);

  const resetAllFilters = () => {
    if (searchInput) searchInput.value = "";
    if (subFilter) subFilter.value = "ALL";
    if (semFilter) semFilter.value = "ALL";
    if (examFilter) examFilter.value = "ALL";
    filterAndRenderPYQs();
    showToast("Filters reset to default", "info");
  };

  if (resetPyqBtn) resetPyqBtn.addEventListener("click", resetAllFilters);
  if (resetEmptyBtn) resetEmptyBtn.addEventListener("click", resetAllFilters);

  const filterBtns = document.querySelectorAll(".swap-filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => {
        b.classList.remove("bg-indigo-600/40", "border-indigo-500/50", "text-white");
        b.classList.add("bg-white/5", "border-white/10", "text-slate-400");
      });
      btn.classList.add("bg-indigo-600/40", "border-indigo-500/50", "text-white");
      btn.classList.remove("bg-white/5", "border-white/10", "text-slate-400");
      STATE.currentSwapFilter = btn.getAttribute("data-status");
      renderActiveSwaps();
    });
  });

  const peerDeptSelect = document.getElementById("filter-peer-dept");
  if (peerDeptSelect) {
    peerDeptSelect.addEventListener("change", (e) => {
      STATE.currentDeptFilter = e.target.value;
      renderPeerProfiles(STATE.currentDeptFilter);
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });

  document.querySelectorAll(".glass-modal-backdrop").forEach(m => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.add("hidden");
    });
  });

  window.addEventListener("click", (e) => {
    const dropdown = document.getElementById("user-dropdown-menu");
    const chipBtn = document.getElementById("user-chip-btn");
    if (dropdown && !dropdown.classList.contains("hidden")) {
      if (chipBtn && !chipBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    }
  });

  document.querySelectorAll(".preset-loc-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const locInput = document.getElementById("schedule-location");
      if (locInput) locInput.value = btn.innerText;
    });
  });
}

function closeAllModals() {
  if (window.SoundFX) SoundFX.playPop();
  document.querySelectorAll(".glass-modal-backdrop").forEach(m => m.classList.add("hidden"));
  const editModal = document.getElementById("edit-profile-modal");
  if (editModal) editModal.classList.add("hidden");
  const refillModal = document.getElementById("token-refill-modal");
  if (refillModal) refillModal.classList.add("hidden");
}

// =============================================================================
// FORM VALIDATION & CREATIVE INLINE LOADER UTILITIES
// =============================================================================

function showFieldError(input, message) {
  if (!input) return;
  input.classList.remove("field-error-input");
  void input.offsetWidth; // force browser reflow for instant re-shake
  input.classList.add("field-error-input");

  const anchor = input.closest(".relative") || input;
  let tip = anchor.nextElementSibling;
  if (tip && tip.classList.contains("field-error-tooltip")) {
    const textEl = tip.querySelector(".error-text-content") || tip.querySelector("span:not(.error-icon-wrapper)");
    if (textEl) textEl.textContent = message;
  } else {
    const tooltip = document.createElement("div");
    tooltip.className = "field-error-tooltip";
    tooltip.setAttribute("role", "alert");
    tooltip.innerHTML = `
      <span class="error-icon-wrapper" aria-hidden="true">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span class="error-ping"></span>
      </span>
      <span class="error-text-content"></span>
    `;
    tooltip.querySelector(".error-text-content").textContent = message;
    anchor.insertAdjacentElement("afterend", tooltip);
  }

  // Play subtle warning sound if available (throttled to avoid cacophony)
  if (window.SoundFX && typeof window.SoundFX.playError === "function") {
    if (!window._lastValidationSound || Date.now() - window._lastValidationSound > 250) {
      window._lastValidationSound = Date.now();
      window.SoundFX.playError();
    }
  }

  const clearHandler = () => {
    input.classList.remove("field-error-input");
    const existingTip = (input.closest(".relative") || input).nextElementSibling;
    if (existingTip && existingTip.classList.contains("field-error-tooltip")) {
      existingTip.remove();
    }
    input.removeEventListener("input", clearHandler);
    input.removeEventListener("change", clearHandler);
  };
  input.addEventListener("input", clearHandler);
  input.addEventListener("change", clearHandler);
}

function clearFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll(".field-error-input").forEach(el => el.classList.remove("field-error-input"));
  form.querySelectorAll(".field-error-tooltip").forEach(el => el.remove());
}

// -----------------------------------------------------------------------------
// CREATIVE ATOMIC DUAL-RING GYRO SPINNER & INLINE LOADER CONTROLLERS
// -----------------------------------------------------------------------------
function createKineticSpinner(isMini = false) {
  const miniClass = isMini ? " mini" : "";
  return `
    <span class="kinetic-gyro-spinner${miniClass}" aria-hidden="true">
      <span class="gyro-ring-outer"></span>
      <span class="gyro-ring-inner"></span>
      <span class="gyro-core"></span>
    </span>
  `;
}

function setButtonLoading(button, isLoading, loadingText = "Processing...") {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.disabled = true;
    button.classList.add("btn-loading");
    button.innerHTML = `
      <span class="kinetic-loader-wrap">
        ${createKineticSpinner(false)}
        <span>${escapeHTML(loadingText)}</span>
      </span>
    `;
  } else {
    button.disabled = false;
    button.classList.remove("btn-loading");
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  }
}

function showEnergyBeam(form) {
  if (!form) return;
  let beam = form.querySelector(".inline-energy-beam");
  if (!beam) {
    beam = document.createElement("div");
    beam.className = "inline-energy-beam";
    beam.innerHTML = `<span class="energy-beam-spark"></span>`;
    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.parentNode.insertBefore(beam, submitBtn);
    } else {
      form.appendChild(beam);
    }
  }
}

function hideEnergyBeam(form) {
  if (!form) return;
  const beam = form.querySelector(".inline-energy-beam");
  if (beam) beam.remove();
}

function renderTagPills(containerId, tagsArray, tagClass) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!tagsArray || tagsArray.length === 0) {
    container.innerHTML = `<span class="text-[10px] text-slate-500 italic">No skills entered yet</span>`;
    return;
  }
  container.innerHTML = tagsArray
    .map(tag => `<span class="${tagClass} text-xs px-2.5 py-0.5 rounded-lg font-medium inline-block">${tag}</span>`)
    .join("");
}

// =============================================================================
// AVATAR IMAGE OPTIMIZER (HTML5 Canvas Center-Crop & Lightweight JPEG DataURL)
// =============================================================================
let pendingAvatarDataUrl = null;

function optimizeAvatarImage(file, targetSize = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file (JPG, PNG, WebP)"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unable to decode selected image"));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");

          // Calculate square crop from center
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        } catch (canvasErr) {
          reject(canvasErr);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
window.optimizeAvatarImage = optimizeAvatarImage;

function openEditProfileModal() {
  const user = STATE.currentUser;
  if (!user) {
      showToast("Please log in or sign up first to view and edit your profile!", "warning", "fa-user-lock");
      setTimeout(() => { window.location.href = "login.html#login"; }, 800);
      return;
    }

  const modal = document.getElementById("edit-profile-modal");
  if (!modal) return;

  if (window.SoundFX) SoundFX.playWhoosh();

  // Close navbar dropdown if open
  const dropdown = document.getElementById("user-dropdown-menu");
  if (dropdown) dropdown.classList.add("hidden");

  // Pre-fill header summary banner
  pendingAvatarDataUrl = null;
  const avatarImg = document.getElementById("edit-profile-avatar-preview");
  if (avatarImg) avatarImg.src = user.avatar || "assets/images/avatar-default.jpg";

  const headerName = document.getElementById("edit-profile-header-name");
  if (headerName) headerName.textContent = user.name || "Student Peer";

  const headerEmail = document.getElementById("edit-profile-header-email");
  if (headerEmail) headerEmail.textContent = user.email || "";

  const headerKarma = document.getElementById("edit-profile-header-karma");
  if (headerKarma) headerKarma.textContent = user.karma || 0;

  const badge = document.getElementById("edit-profile-badge");
  if (badge) {
    badge.innerHTML = user.isAi 
      ? '<i class="fa-solid fa-robot mr-1"></i> AI Persona' 
      : '<i class="fa-solid fa-circle-check mr-1"></i> Verified Student';
  }

  // Pre-fill input fields
  const nameInput = document.getElementById("edit-profile-name");
  if (nameInput) nameInput.value = user.name || "";

  // Email is strictly non-editable (read-only/disabled per architecture rules)
  const emailInput = document.getElementById("edit-profile-email");
  if (emailInput) {
    emailInput.value = user.email || "";
    emailInput.disabled = true;
    emailInput.readOnly = true;
  }

  const deptInput = document.getElementById("edit-profile-department");
  if (deptInput) deptInput.value = user.department || "";

  const semSelect = document.getElementById("edit-profile-semester");
  if (semSelect) semSelect.value = user.semester || "Semester 1";

  const teachInput = document.getElementById("edit-profile-teach");
  if (teachInput) {
    teachInput.value = (user.teachSkills || []).join(", ");
    renderTagPills("edit-teach-tags-preview", user.teachSkills || [], "tag-teach");
  }

  const learnInput = document.getElementById("edit-profile-learn");
  if (learnInput) {
    learnInput.value = (user.learnSkills || []).join(", ");
    renderTagPills("edit-learn-tags-preview", user.learnSkills || [], "tag-learn");
  }

  const bioInput = document.getElementById("edit-profile-bio");
  if (bioInput) bioInput.value = user.bio || "";

  clearFieldErrors(document.getElementById("edit-profile-form"));
  modal.classList.remove("hidden");
}

function closeEditProfileModal() {
  if (window.SoundFX) SoundFX.playPop();
  const modal = document.getElementById("edit-profile-modal");
  if (modal) modal.classList.add("hidden");
}

// =============================================================================
// 3. AUTHENTICATION & MULTI-ACCOUNT SWITCHING SYSTEM
// =============================================================================

// -----------------------------------------------------------------------------
// CREATIVE ORBITAL QUANTUM LOADER CONTROLLERS (In-Modal Experience)
// -----------------------------------------------------------------------------
function showQuantumLoader(title = "Processing Request", subtext = "Connecting to CampusBarter Cloud...", progress = 25) {
  const loader = document.getElementById("auth-quantum-loader");
  if (!loader) return;
  const titleEl = document.getElementById("loader-title");
  const subtextEl = document.getElementById("loader-subtext");
  const progressEl = document.getElementById("loader-progress-bar");
  const iconEl = document.getElementById("loader-core-icon");

  if (titleEl) titleEl.innerText = title;
  if (subtextEl) subtextEl.innerHTML = `<span class="loading-dots">${subtext}</span>`;
  if (progressEl) progressEl.style.width = `${progress}%`;
  if (iconEl) iconEl.className = "fa-solid fa-arrows-rotate text-emerald-300 text-sm animate-spin";
  loader.classList.remove("hidden");

  if (window.SoundFX) {
    SoundFX.playLoaderStart();
    setTimeout(() => SoundFX.playLoaderPulse(progress), 120);
  }
}

function updateQuantumLoader(title, subtext, progress, isSuccess = false) {
  const loader = document.getElementById("auth-quantum-loader");
  if (!loader) return;
  const titleEl = document.getElementById("loader-title");
  const subtextEl = document.getElementById("loader-subtext");
  const progressEl = document.getElementById("loader-progress-bar");
  const iconEl = document.getElementById("loader-core-icon");

  if (titleEl && title) titleEl.innerText = title;
  if (subtextEl && subtext) {
    subtextEl.innerHTML = isSuccess 
      ? `<span class="text-emerald-300 font-semibold">${subtext}</span>` 
      : `<span class="loading-dots">${subtext}</span>`;
  }
  if (progressEl && progress !== undefined) {
    progressEl.style.width = `${progress}%`;
  }
  if (iconEl && isSuccess) {
    iconEl.className = "fa-solid fa-check text-emerald-300 text-base";
  }

  if (window.SoundFX) {
    if (isSuccess) {
      SoundFX.playLoaderComplete();
    } else {
      SoundFX.playLoaderPulse(progress || 50);
    }
  }
}

function hideQuantumLoader() {
  const loader = document.getElementById("auth-quantum-loader");
  if (loader) loader.classList.add("hidden");
}

// -----------------------------------------------------------------------------
// DYNAMIC NAVIGATION BAR AUTH STATE RENDERING
// -----------------------------------------------------------------------------
function renderNavbarAuth() {
  const container = document.getElementById("nav-auth-zone");
  const mobileContainer = document.getElementById("mobile-auth-controls");
  if (!container) return;

  const user = STATE.currentUser;

  if (!user) {
    // Logged Out / Guest Mode: Show Log In & Sign Up buttons linking to dedicated login.html
    container.innerHTML = `
      <a href="login.html#login" class="btn-glass text-xs px-3.5 py-2 rounded-xl font-medium transition-all hover:text-white">Log In</a>
      <a href="login.html#signup" class="btn-emerald text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/25">
        <i class="fa-solid fa-sparkles"></i> Sign Up (+300 Karma)
      </a>
    `;
    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <div class="flex flex-col gap-2 w-full">
          <a href="login.html#login" class="w-full btn-glass text-xs py-2 rounded-xl font-medium text-center">Log In</a>
          <a href="login.html#signup" class="w-full btn-emerald text-xs py-2 rounded-xl font-bold text-center">Sign Up (+300 Karma)</a>
        </div>
      `;
    }
  } else {
    // Logged In Mode: Render Full User Profile Chip, Karma Badge, Refill Status & Dropdown
    container.innerHTML = `
      <!-- Karma Token Recharge Pill (30 Karma/hr, 2-Hour Batch, Max 120⚡) -->
      <button id="token-refill-pill" onclick="openTokenRefillModal()" class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-mono hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all cursor-pointer shadow-sm group" title="Karma Token Refill: +30⚡/hr (Max 120⚡ Cap)">
        <i class="fa-solid fa-hourglass-half text-sky-400 text-[11px] group-hover:rotate-180 transition-transform duration-500"></i>
        <span id="nav-refill-timer">120⚡ Max (Full)</span>
        <span id="nav-refill-badge" class="text-[10px] text-emerald-400 font-bold">Active</span>
      </button>

      <button id="open-upload-modal-btn" class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25 transition-all">
        <i class="fa-solid fa-cloud-arrow-up text-indigo-400"></i>
        <span>Upload PYQ <strong class="text-amber-400 font-bold ml-0.5">+25⚡</strong></span>
      </button>

      <!-- Student Profile Chip Trigger -->
      <div class="relative">
        <button id="user-chip-btn" class="flex items-center gap-2.5 p-1 pr-3 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-400/40 hover:bg-white/10 transition-all cursor-pointer">
          <img src="${user.avatar || 'assets/images/avatar-default.jpg'}" alt="${escapeHTML(user.name)}" class="w-8 h-8 rounded-xl object-cover border border-white/20">
          <div class="text-left hidden lg:block">
            <div class="flex items-center gap-1.5">
              <p class="text-xs font-bold text-white line-clamp-1">${escapeHTML(user.name)}</p>
              ${renderAiBadge(user.isAi, true)}
            </div>
            <p class="text-[10px] text-slate-400">${escapeHTML(user.semester || 'Semester 1')} • ${escapeHTML((user.department || 'General').split(" ")[0])}</p>
          </div>
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-black">
            <i class="fa-solid fa-bolt text-amber-400 text-[11px]"></i>
            <span id="user-karma">${user.karma}</span>
          </div>
          <i class="fa-solid fa-chevron-down text-slate-400 text-[10px] ml-0.5"></i>
        </button>

        <!-- Dropdown Menu -->
        <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-72 rounded-2xl user-dropdown p-3 z-50">
          <div class="pb-2.5 mb-2.5 border-b border-white/10">
            <p class="text-xs font-semibold text-slate-400">Signed in as</p>
            <div class="flex items-center justify-between gap-1.5 mt-0.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <p class="text-sm font-bold text-white truncate">${escapeHTML(user.name)}</p>
                ${renderAiBadge(user.isAi, true)}
              </div>
              <button onclick="openEditProfileModal()" class="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors" title="Edit Profile">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
            </div>
            <p class="text-xs text-indigo-300 font-mono truncate">${escapeHTML(user.email)}</p>
            <div class="mt-2 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
              <span>Karma Balance</span><span>${user.karma} ⚡</span>
            </div>

            <!-- Karma Token Refill Info Card -->
            <div onclick="openTokenRefillModal()" class="mt-2 p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs cursor-pointer hover:bg-indigo-950/70 transition-colors" title="Click to view Karma Token refill details">
              <div class="flex items-center justify-between text-indigo-300 font-medium">
                <span class="flex items-center gap-1"><i class="fa-solid fa-bolt-lightning text-sky-400 text-[11px]"></i> Karma Token Refill</span>
                <span class="text-emerald-400 font-bold font-mono text-[10px]">+30⚡/hr (Max 120⚡)</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>Refill Status:</span>
                <span id="dropdown-refill-timer" class="text-sky-300 font-mono font-semibold">120⚡ Cap Reached</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
                <div id="dropdown-refill-progress" class="bg-gradient-to-r from-sky-400 to-emerald-400 h-full w-full transition-all duration-300"></div>
              </div>
            </div>

            <!-- Personal User Activity Stats -->
            <div class="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-white/5 text-center">
              <div class="p-1.5 rounded-xl bg-white/5 border border-white/5">
                <p class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Swaps</p>
                <p class="text-xs font-bold text-white">${user.swapsCompleted || 0}</p>
              </div>
              <div class="p-1.5 rounded-xl bg-white/5 border border-white/5">
                <p class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Uploads</p>
                <p class="text-xs font-bold text-white">${user.pyqsUploaded || 0}</p>
              </div>
              <div class="p-1.5 rounded-xl bg-white/5 border border-white/5">
                <p class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Downloads</p>
                <p class="text-xs font-bold text-white">${user.downloads || 0}</p>
              </div>
            </div>
            <button onclick="openEditProfileModal()" class="w-full mt-2.5 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
              <i class="fa-solid fa-user-pen text-indigo-400"></i>
              <span>Edit Profile & Skills</span>
            </button>
          </div>

          <div class="mb-2.5">
            <p class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 px-1">Switch Account (AI Demo & Test)</p>
            <div class="space-y-1">
              ${STATE.accounts.map(acc => `
                <button onclick="quickLoginDemo('${escapeHTML(acc.email)}')" class="w-full flex items-center justify-between p-1.5 rounded-xl text-xs hover:bg-white/10 text-left transition-colors ${acc.id === user.id ? 'bg-indigo-500/20 border border-indigo-500/30 font-semibold text-white' : 'text-slate-300'}">
                  <div class="flex items-center gap-1.5">
                    <img src="${acc.avatar || 'assets/images/avatar-default.jpg'}" class="w-6 h-6 rounded-lg object-cover">
                    <span class="truncate max-w-[110px]">${escapeHTML(acc.name)}</span>
                    ${acc.isAi ? '<span class="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-500/30 font-bold">AI</span>' : '<span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/30 font-bold">Real</span>'}
                  </div>
                  <span class="text-amber-400 font-mono text-[11px] font-bold">${acc.karma}⚡</span>
                </button>
              `).join("")}
            </div>
          </div>
          <div class="pt-2 border-t border-white/10 space-y-1">
            <a href="login.html#signup" class="w-full text-left text-xs px-2 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 font-medium flex items-center gap-2 cursor-pointer"><i class="fa-solid fa-user-plus text-[11px]"></i> Create Another Account</a>
            <button onclick="logoutUser()" class="w-full text-left text-xs px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 font-medium flex items-center gap-2 cursor-pointer">
              <i class="fa-solid fa-arrow-right-from-bracket text-[11px]"></i> Log Out
            </button>
          </div>
        </div>
      </div>
    `;

    const chipBtn = document.getElementById("user-chip-btn");
    const dropdown = document.getElementById("user-dropdown-menu");
    if (chipBtn && dropdown) {
      chipBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
      });
    }

    const uploadBtn = document.getElementById("open-upload-modal-btn");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        const uploadModal = document.getElementById("upload-paper-modal");
        if (uploadModal) uploadModal.classList.remove("hidden");
      });
    }

    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <div class="p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <img src="${user.avatar || 'assets/images/avatar-default.jpg'}" class="w-8 h-8 rounded-lg object-cover">
              <div>
                <div class="flex items-center gap-1.5">
                  <p class="text-xs font-bold text-white">${escapeHTML(user.name)}</p>
                  ${renderAiBadge(user.isAi, true)}
                </div>
                <p class="text-[10px] text-slate-400">${escapeHTML(user.department || 'General')}</p>
              </div>
            </div>
            <span class="text-amber-400 font-bold text-xs">${user.karma}⚡</span>
          </div>
          <div class="grid grid-cols-3 gap-1 text-center pt-2 border-t border-white/10 text-[10px]">
            <div><span class="text-slate-400">Swaps:</span> <strong class="text-white">${user.swapsCompleted || 0}</strong></div>
            <div><span class="text-slate-400">Uploads:</span> <strong class="text-white">${user.pyqsUploaded || 0}</strong></div>
            <div><span class="text-slate-400">Downloads:</span> <strong class="text-white">${user.downloads || 0}</strong></div>
          </div>
          <!-- Mobile Karma Refill Card -->
          <div onclick="openTokenRefillModal()" class="mt-2.5 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-xs flex items-center justify-between cursor-pointer">
            <span class="text-indigo-300 font-medium flex items-center gap-1.5"><i class="fa-solid fa-hourglass-half text-sky-400"></i> Karma Refill:</span>
            <span class="font-mono text-sky-300 font-bold"><span id="mobile-refill-timer">120⚡ Cap (Full)</span></span>
          </div>
        </div>
        <button onclick="openEditProfileModal()" class="w-full btn-glass text-xs py-2 rounded-xl font-bold mb-2 flex items-center justify-center gap-2 text-indigo-300 border-indigo-500/30">
          <i class="fa-solid fa-user-pen"></i> Edit Profile & Skills
        </button>
        <a href="login.html#signup" class="w-full btn-glass text-xs py-2 rounded-xl font-medium mb-2 block text-center cursor-pointer">Create Another Account</a>
        <button onclick="logoutUser()" class="w-full py-2 rounded-xl text-rose-400 text-xs font-medium bg-rose-500/10 border border-rose-500/20 cursor-pointer">Log Out</button>
      `;
    }
  }
}

// -----------------------------------------------------------------------------
// SETUP AUTH SYSTEM (Modal Handlers & In-Place Login / Signup Engines)
// -----------------------------------------------------------------------------
// SETUP AUTH SYSTEM & CLIENT-SIDE NAVIGATION HELPERS
// -----------------------------------------------------------------------------
function setupAuthSystem() {
  checkAuthHash();
}

function openAuthModal(mode = "login") {
  window.location.href = mode === "signup" ? "login.html#signup" : "login.html#login";
}

function quickLoginDemo(email) {
  const accounts = STATE.accounts && STATE.accounts.length ? STATE.accounts : getStoredAccounts();
  const user = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (!user) return;
  setStoredCurrentUser(user);
  STATE.currentUser = user;
  initTokenRefillEngine();
  renderNavbarAuth();
  renderActiveSwaps();
  updateSwapCounters();
  renderPeerProfiles();
  populatePeerDropdown();
  updateGlobalStats();
  if (window.SoundFX) SoundFX.playSuccess();
  showToast('Switched account to ' + user.name + ' (' + user.karma + 's)', 'success', 'fa-user-check');
}

function logoutUser() {
  if (refillIntervalId) clearInterval(refillIntervalId);
  setStoredCurrentUser(null);
  STATE.currentUser = null;
  renderNavbarAuth();
  renderActiveSwaps();
  updateSwapCounters();
  renderPeerProfiles();
  updateGlobalStats();
  if (window.SoundFX) SoundFX.playPop();
  showToast("Logged out successfully! You are now exploring as Guest.", "info", "fa-arrow-right-from-bracket");
}

function checkAuthHash() {
  const hash = window.location.hash;
  if (hash === "#login" || hash === "#signup") {
    window.location.href = 'login.html' + hash;
  }
}
window.addEventListener("hashchange", checkAuthHash);

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";
  if (btn) {
    const icon = btn.querySelector("i");
    if (icon) {
      icon.className = isPass ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    }
  }
}

function hideQuantumLoader() {}
function showQuantumLoader() {}
function updateQuantumLoader() {}

// Globally expose to window for inline onclick handlers
window.openAuthModal = openAuthModal;
window.quickLoginDemo = quickLoginDemo;
window.logoutUser = logoutUser;
window.checkAuthHash = checkAuthHash;
window.togglePasswordVisibility = togglePasswordVisibility;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.showQuantumLoader = showQuantumLoader;
window.updateQuantumLoader = updateQuantumLoader;
window.hideQuantumLoader = hideQuantumLoader;

// =============================================================================
// 4. PYQ REPOSITORY (+25 Karma Reward Rule)
// =============================================================================

function filterAndRenderPYQs() {
  const query = (document.getElementById("pyq-search-input")?.value || "").toLowerCase().trim();
  const subject = document.getElementById("filter-subject")?.value || "ALL";
  const semester = document.getElementById("filter-semester")?.value || "ALL";
  const examType = document.getElementById("filter-exam-type")?.value || "ALL";

  const filtered = STATE.pyqs.filter(paper => {
    const matchesSearch = paper.subject.toLowerCase().includes(query) || paper.code.toLowerCase().includes(query) || paper.uploader.toLowerCase().includes(query);
    const matchesSubject = subject === "ALL" || paper.subject === subject;
    const matchesSemester = semester === "ALL" || paper.semester === semester;
    const matchesExam = examType === "ALL" || paper.examType === examType;
    return matchesSearch && matchesSubject && matchesSemester && matchesExam;
  });

  renderPYQs(filtered);
}

function renderPYQs(papers) {
  const grid = document.getElementById("pyq-grid-container");
  const emptyState = document.getElementById("pyq-empty-state");
  const badge = document.getElementById("pyq-count-badge");
  if (!grid) return;

  if (badge) badge.innerText = `${papers.length} Papers`;

  if (papers.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  grid.innerHTML = papers.map(paper => {
    let badgeClass = "badge-semend";
    if (paper.examType === "CIA-1") badgeClass = "badge-cia1";
    else if (paper.examType === "CIA-2") badgeClass = "badge-cia2";

    return `
      <div class="glass-card p-5 flex flex-col justify-between glass-card-hover group border-white/10">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-indigo-300 border border-white/10">${escapeHTML(paper.code)}</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}">${escapeHTML(paper.examType)}</span>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">${escapeHTML(paper.year)}</span>
            </div>
          </div>
          <h3 class="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1 font-heading">${escapeHTML(paper.subject)}</h3>
          <div class="flex items-center gap-2.5 text-xs text-slate-400 mb-3">
            <span><i class="fa-solid fa-layer-group text-slate-500 mr-1"></i> ${escapeHTML(paper.semester)}</span>
            <span>•</span>
            <span><i class="fa-regular fa-file-pdf text-rose-400 mr-1"></i> ${escapeHTML(paper.fileSize)}</span>
            <span>•</span>
            <span>${escapeHTML(paper.pages)} Pages</span>
          </div>
          <div class="mb-4">
            ${paper.hasSolutions ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <i class="fa-solid fa-circle-check text-[10px]"></i> Solution Key Included
              </span>
            ` : `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                <i class="fa-solid fa-circle-question text-[10px]"></i> Question Only
              </span>
            `}
          </div>
        </div>
        <div>
          <div class="pt-3 border-t border-white/10 flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <img src="${paper.uploaderAvatar || 'assets/images/avatar-default.jpg'}" class="w-6 h-6 rounded-full object-cover border border-white/20">
              <span class="text-xs text-slate-300">${escapeHTML(paper.uploader)}</span>
              ${renderAiBadge(paper.isAi)}
            </div>
            <div class="flex items-center gap-1 text-xs text-amber-400 font-semibold">
              <i class="fa-solid fa-star text-[11px]"></i>
              <span>${paper.rating}</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="previewPYQ('${paper.id}')" class="btn-glass text-xs py-2 px-3 rounded-xl font-medium flex items-center justify-center gap-1.5 hover:text-indigo-300">
              <i class="fa-regular fa-eye"></i> Preview
            </button>
            <button onclick="downloadPYQ('${paper.id}', this)" class="btn-primary text-xs py-2 px-3 rounded-xl font-medium flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-download"></i> Download
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function previewPYQ(paperId) {
  const paper = STATE.pyqs.find(p => p.id === paperId);
  if (!paper) return;
  const modal = document.getElementById("paper-preview-modal");
  const title = document.getElementById("preview-modal-title");
  const subtitle = document.getElementById("preview-modal-subtitle");
  const downloadBtn = document.getElementById("preview-download-btn");

  if (title) title.textContent = paper.subject;
  if (subtitle) subtitle.textContent = `${paper.code} • ${paper.semester} • ${paper.examType} ${paper.year}`;
  if (downloadBtn) {
    downloadBtn.onclick = function() {
      downloadPYQ(paper.id, this);
      if (modal) modal.classList.add("hidden");
    };
  }
  if (window.SoundFX) SoundFX.playWhoosh();
  if (modal) modal.classList.remove("hidden");
}

const activeDownloads = new Set();
function downloadPYQ(paperId, btn) {
  if (activeDownloads.has(paperId)) {
    return;
  }
  const paper = STATE.pyqs.find(p => p.id === paperId);
  if (!paper) return;

  // Strict Economy Rule 1: Must be logged in
  if (!STATE.currentUser) {
      showToast("Please log in to download question papers.", "warning", "fa-lock");
      setTimeout(() => { window.location.href = "login.html#login"; }, 800);
      return;
    }

  // Strict Economy Rule 2: Must possess at least 15 Karma points
  if (STATE.currentUser.karma < 15) {
    showToast(`Insufficient Karma! You have ${STATE.currentUser.karma}⚡, but 15⚡ is required to download this paper.`, "error", "fa-triangle-exclamation");
    return;
  }

  // Concurrency lock to prevent rapid clicks
  activeDownloads.add(paperId);
  if (btn && btn.disabled !== undefined) {
    btn.disabled = true;
  }

  // Strict Economy Rule 3: Deduct 15 Karma from current user & track download count
  STATE.currentUser.karma -= 15;
  STATE.currentUser.downloads = (STATE.currentUser.downloads || 0) + 1;
  setStoredCurrentUser(STATE.currentUser);
  const acc = STATE.accounts.find(a => a.id === STATE.currentUser.id);
  if (acc) {
    acc.karma = STATE.currentUser.karma;
    acc.downloads = STATE.currentUser.downloads;
  }
  saveStoredAccounts(STATE.accounts);

  // Cloud synchronization with Supabase (queues automatically if offline)
  if (typeof DataManager !== "undefined") {
    try {
      DataManager.downloadPYQ(paper.id, STATE.currentUser).catch(err => {
        console.warn("[CampusBarter Backend] Cloud download record notice:", err.message);
      });
    } catch (err) {
      console.warn("[CampusBarter Backend] Cloud download record notice:", err.message);
    }
  }

  // Increment paper download statistics & persist
  paper.downloads = (paper.downloads || 0) + 1;
  saveStoredPYQs(STATE.pyqs);

  // Refresh UI balances & badges immediately
  renderNavbarAuth();
  filterAndRenderPYQs();

  // Open the Google Drive archive / PDF document
  const downloadTarget = paper.fileUrl || "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link";
  window.open(downloadTarget, "_blank");

  showToast(`Downloaded: ${paper.subject}! -15 Karma deducted (Balance: ${STATE.currentUser.karma}⚡). Opening Google Drive archive...`, "success", "fa-file-arrow-down");

  setTimeout(() => {
    activeDownloads.delete(paperId);
    if (btn && btn.disabled !== undefined) {
      btn.disabled = false;
    }
  }, 800);
}

// =============================================================================
// 5. SWAP STATE MACHINE ENGINE (+50 Karma to BOTH participants Rule)
// =============================================================================

async function acceptSwap(swapId, btn = null) {
  const swap = STATE.activeSwaps.find(s => s.id === swapId);
  if (!swap) return;

  if (btn) {
    btn.classList.add("btn-mini-loading");
    btn.disabled = true;
    btn.innerHTML = `${createKineticSpinner(true)} <span>Accepting...</span>`;
    await new Promise(r => setTimeout(r, 350));
  }

  swap.status = "ACCEPTED";
  saveStoredSwaps(STATE.activeSwaps);
  renderActiveSwaps();
  updateSwapCounters();
  if (window.SoundFX) SoundFX.playSuccess();
  showToast(`Accepted swap with ${escapeHTML(swap.peerName)}! Schedule a session now.`, "success", "fa-circle-check");
}

async function declineSwap(swapId, btn = null) {
  const index = STATE.activeSwaps.findIndex(s => s.id === swapId);
  if (index === -1) return;

  if (btn) {
    btn.classList.add("btn-mini-loading");
    btn.disabled = true;
    btn.innerHTML = `${createKineticSpinner(true)} <span>Declining...</span>`;
    await new Promise(r => setTimeout(r, 300));
  }

  const name = STATE.activeSwaps[index].peerName;
  STATE.activeSwaps.splice(index, 1);
  saveStoredSwaps(STATE.activeSwaps);
  renderActiveSwaps();
  updateSwapCounters();
  showToast(`Declined barter proposal from ${escapeHTML(name)}`, "info", "fa-circle-xmark");
}

function openScheduleModal(swapId) {
  const swap = STATE.activeSwaps.find(s => s.id === swapId);
  if (!swap) return;
  const modal = document.getElementById("schedule-modal");
  const swapIdInput = document.getElementById("schedule-swap-id");
  const summary = document.getElementById("modal-swap-summary");
  if (!modal) return;

  if (swapIdInput) swapIdInput.value = swap.id;
  if (summary) {
    summary.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${swap.peerAvatar || 'assets/images/avatar-default.jpg'}" class="w-10 h-10 rounded-xl object-cover border border-white/20">
        <div>
          <p class="text-sm font-bold text-white">${escapeHTML(swap.peerName)}</p>
          <p class="text-xs text-slate-300">Teaching: <span class="text-emerald-400 font-semibold">${escapeHTML(swap.peerTeaches)}</span></p>
          <p class="text-xs text-slate-300">Learning: <span class="text-indigo-400 font-semibold">${escapeHTML(swap.peerLearns)}</span></p>
        </div>
      </div>
    `;
  }
  modal.classList.remove("hidden");
}

// 50 Karma awarded to BOTH members upon completion
async function completeSwap(swapId, btn = null) {
  const swap = STATE.activeSwaps.find(s => s.id === swapId);
  if (!swap) return;

  if (swap.status === "COMPLETED") {
    showToast("This barter swap has already been completed!", "warning", "fa-circle-exclamation");
    return;
  }

  if (btn) {
    btn.classList.add("btn-mini-loading");
    btn.disabled = true;
    btn.innerHTML = `${createKineticSpinner(true)} <span>Completing (+50⚡)...</span>`;
    await new Promise(r => setTimeout(r, 400));
  }

  swap.status = "COMPLETED";
  saveStoredSwaps(STATE.activeSwaps);

  // Award +50 Karma to Current User & increment completed count
  if (STATE.currentUser) {
    STATE.currentUser.karma += 50;
    STATE.currentUser.swapsCompleted = (STATE.currentUser.swapsCompleted || 0) + 1;
    setStoredCurrentUser(STATE.currentUser);
    const acc = STATE.accounts.find(a => a.id === STATE.currentUser.id);
    if (acc) {
      acc.karma = STATE.currentUser.karma;
      acc.swapsCompleted = STATE.currentUser.swapsCompleted;
    }
    saveStoredAccounts(STATE.accounts);
  }

  // Award +50 Karma to Peer Participant
  const peerInList = STATE.peers.find(p => p.name === swap.peerName || p.id === swap.peerId);
  if (peerInList) {
    peerInList.karma += 50;
    peerInList.swapsCompleted = (peerInList.swapsCompleted || 0) + 1;
  }

  // Cloud synchronization with Supabase (queues if offline)
  if (typeof DataManager !== "undefined") {
    try {
      DataManager.completeSwap(swap.id, STATE.currentUser, swap.peerId).catch(err => {
        console.warn("[CampusBarter Backend] Cloud swap completion deferred:", err.message);
      });
    } catch (err) {
      console.warn("[CampusBarter Backend] Cloud swap completion error:", err.message);
    }
  }

  renderNavbarAuth();
  renderActiveSwaps();
  renderPeerProfiles();
  updateSwapCounters();
  updateGlobalStats();
  showToast(`Barter Completed! 🎉 +50 Karma to ${STATE.currentUser ? escapeHTML(STATE.currentUser.name) : 'You'} and +50 Karma to ${escapeHTML(swap.peerName)}!`, "success", "fa-gift");
}

function renderActiveSwaps() {
  const container = document.getElementById("swaps-card-container");
  const emptyState = document.getElementById("swaps-empty-state");
  if (!container) return;

  // Real users only see their own active swaps; guests and demo accounts see pre-seeded mock swaps
  const userSwaps = getUserActiveSwaps();
  const currentFilter = STATE.currentSwapFilter;
  const filteredSwaps = currentFilter === "ALL" ? userSwaps : userSwaps.filter(s => s.status === currentFilter);

  if (filteredSwaps.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  container.innerHTML = filteredSwaps.map(swap => {
    const stepperHtml = generateStepperHTML(swap.status);
    const statusPills = {
      PENDING: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold status-pill-pending"><i class="fa-solid fa-hourglass-half mr-1"></i> Pending</span>',
      ACCEPTED: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold status-pill-accepted"><i class="fa-solid fa-check mr-1"></i> Accepted</span>',
      SCHEDULED: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold status-pill-scheduled"><i class="fa-solid fa-calendar-days mr-1"></i> Scheduled</span>',
      COMPLETED: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold status-pill-completed"><i class="fa-solid fa-circle-check mr-1"></i> Completed</span>'
    };

    let actionButtonsHtml = "";
    if (swap.status === "PENDING") {
      actionButtonsHtml = `
        <div class="flex items-center gap-2 pt-2">
          <button onclick="acceptSwap('${swap.id}', this)" class="btn-emerald text-xs py-2 px-3 rounded-xl font-medium flex-1 flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-check"></i> Accept Swap
          </button>
          <button onclick="declineSwap('${swap.id}', this)" class="btn-glass text-xs py-2 px-3 rounded-xl font-medium text-slate-300 hover:text-rose-400">Decline</button>
        </div>
      `;
    } else if (swap.status === "ACCEPTED") {
      actionButtonsHtml = `
        <div class="pt-2">
          <button onclick="openScheduleModal('${swap.id}')" class="w-full btn-primary text-xs py-2 px-4 rounded-xl font-medium flex items-center justify-center gap-2">
            <i class="fa-solid fa-calendar-plus"></i> Schedule Meeting
          </button>
        </div>
      `;
    } else if (swap.status === "SCHEDULED") {
      actionButtonsHtml = `
        <div class="flex flex-col gap-2 pt-2">
          <div class="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-2.5">
            <i class="fa-solid fa-clock text-purple-400 text-xs mt-0.5"></i>
            <div class="text-xs">
              <p class="font-bold text-white">${escapeHTML(swap.date)} @ ${escapeHTML(swap.time)}</p>
              <p class="text-purple-300 mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i> ${escapeHTML(swap.location)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="completeSwap('${swap.id}', this)" class="btn-emerald text-xs py-2 px-3 rounded-xl font-medium flex-1 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-circle-check"></i> Mark Completed (+50⚡ Each)
            </button>
            <button onclick="openScheduleModal('${swap.id}')" class="btn-glass text-xs py-2 px-3 rounded-xl font-medium text-slate-300">Reschedule</button>
          </div>
        </div>
      `;
    } else if (swap.status === "COMPLETED") {
      actionButtonsHtml = `
        <div class="pt-2">
          <div class="py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <i class="fa-solid fa-certificate"></i><span>Completed • +100 Total Karma Generated</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="glass-card p-5 flex flex-col justify-between border-white/10 group">
        <div>
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-3">
              <img src="${swap.peerAvatar}" class="w-11 h-11 rounded-2xl object-cover border border-white/20">
              <div>
                <div class="flex items-center gap-1.5">
                  <h4 class="text-sm font-bold text-white">${escapeHTML(swap.peerName)}</h4>
                  ${renderAiBadge(swap.isAi)}
                </div>
                <p class="text-xs text-slate-400">${escapeHTML(swap.peerDepartment)} • ${escapeHTML(swap.peerSemester)}</p>
              </div>
            </div>
            <div>${statusPills[swap.status]}</div>
          </div>
          <div class="space-y-2 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400 flex items-center gap-1.5"><i class="fa-solid fa-chalkboard-user text-emerald-400"></i> ${escapeHTML(swap.peerName.split(" ")[0])} Teaches:</span>
              <span class="font-semibold text-emerald-300">${escapeHTML(swap.peerTeaches)}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400 flex items-center gap-1.5"><i class="fa-solid fa-graduation-cap text-indigo-400"></i> You Teach:</span>
              <span class="font-semibold text-indigo-300">${escapeHTML(swap.peerLearns)}</span>
            </div>
          </div>
          <div class="my-4">${stepperHtml}</div>
        </div>
        <div>${actionButtonsHtml}</div>
      </div>
    `;
  }).join("");
}

function generateStepperHTML(currentStatus) {
  const steps = [
    { key: "PENDING", label: "Pending", icon: "1" },
    { key: "ACCEPTED", label: "Accepted", icon: "2" },
    { key: "SCHEDULED", label: "Scheduled", icon: "3" },
    { key: "COMPLETED", label: "Completed", icon: "4" }
  ];
  const order = ["PENDING", "ACCEPTED", "SCHEDULED", "COMPLETED"];
  const currentIndex = order.indexOf(currentStatus);

  return `
    <div class="flex items-center justify-between w-full pt-1">
      ${steps.map((step, idx) => {
        let stepClass = "";
        let iconHtml = step.icon;
        let iconStyles = "bg-white/10 text-slate-400 border border-white/15";
        let textStyles = "text-slate-500 font-normal";

        if (idx < currentIndex) {
          stepClass = "completed";
          iconHtml = '<i class="fa-solid fa-check text-[10px]"></i>';
          iconStyles = "bg-emerald-500 text-white shadow-md shadow-emerald-500/30";
          textStyles = "text-emerald-400 font-semibold";
        } else if (idx === currentIndex) {
          stepClass = "active";
          iconStyles = "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 ring-2 ring-indigo-400/50";
          textStyles = "text-white font-bold";
        }

        return `
          <div class="stepper-step ${stepClass}">
            <div class="stepper-icon ${iconStyles}">${iconHtml}</div>
            <span class="text-[10px] mt-1.5 tracking-tight ${textStyles}">${step.label}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function updateSwapCounters() {
  const userSwaps = getUserActiveSwaps();
  const total = userSwaps.length;
  const pending = userSwaps.filter(s => s.status === "PENDING").length;
  const accepted = userSwaps.filter(s => s.status === "ACCEPTED").length;
  const scheduled = userSwaps.filter(s => s.status === "SCHEDULED").length;
  const completed = userSwaps.filter(s => s.status === "COMPLETED").length;

  const setBadge = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setBadge("count-all", total);
  setBadge("count-pending", pending);
  setBadge("count-accepted", accepted);
  setBadge("count-scheduled", scheduled);
  setBadge("count-completed", completed);

  const navCount = document.getElementById("nav-swap-count");
  if (navCount) navCount.innerText = pending + accepted + scheduled;
}

// =============================================================================
// 6. PROFILE & SKILLS MODULE (PEER DIRECTORY)
// =============================================================================

function renderPeerProfiles(departmentFilter = "ALL") {
  const container = document.getElementById("peer-profiles-container");
  if (!container) return;

  // Build complete directory: include active logged-in user if not already present
  let peersList = [...STATE.peers];
  if (STATE.currentUser) {
    const user = STATE.currentUser;
    const existingIndex = peersList.findIndex(p => p.id === user.id || (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()));
    if (existingIndex !== -1) {
      // Update data in place so latest changes are reflected immediately
      peersList[existingIndex] = {
        ...peersList[existingIndex],
        name: user.name,
        department: user.department,
        semester: user.semester,
        karma: user.karma,
        teachSkills: user.teachSkills || ["General Studies"],
        learnSkills: user.learnSkills,
              avatar: user.avatar || ["Programming"],
        bio: user.bio || peersList[existingIndex].bio,
        avatar: user.avatar || peersList[existingIndex].avatar,
        isAi: user.isAi || false
      };
    } else {
      // Prepend current user at the top of the peer network
      peersList.unshift({
        id: user.id,
        name: user.name,
        email: user.email,
        isAi: user.isAi || false,
        avatar: user.avatar || "assets/images/avatar-default.jpg",
        department: user.department || "Computer Science",
        semester: user.semester || "Semester 1",
        rating: 5.0,
        swapsCompleted: user.swapsCompleted || 0,
        karma: user.karma,
        matchScore: 100,
        bio: user.bio || "Active collegiate student on CampusBarter ready to trade skills and knowledge.",
        teachSkills: user.teachSkills || ["General Studies"],
        learnSkills: user.learnSkills,
              avatar: user.avatar || ["Web Development"]
      });
    }
  }

  const filteredPeers = departmentFilter === "ALL" 
    ? peersList 
    : peersList.filter(p => p.department && p.department.toLowerCase().includes(departmentFilter.toLowerCase()));

  container.innerHTML = filteredPeers.map(peer => {
    const isSelf = STATE.currentUser && (peer.id === STATE.currentUser.id || (peer.email && STATE.currentUser.email && peer.email.toLowerCase() === STATE.currentUser.email.toLowerCase()));

    return `
      <div class="glass-card p-5 flex flex-col justify-between glass-card-hover ${isSelf ? 'border-indigo-500/50 bg-indigo-950/25 ring-1 ring-indigo-500/30' : 'border-white/10'} group">
        <div>
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3">
              <div class="relative">
                <img src="${peer.avatar}" class="w-12 h-12 rounded-2xl object-cover border border-white/20">
                <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
              </div>
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="text-base font-bold text-white font-heading">${escapeHTML(peer.name)}</h3>
                  ${isSelf ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm"><i class="fa-solid fa-user-check mr-1"></i> You</span>' : renderAiBadge(peer.isAi)}
                </div>
                <p class="text-xs text-slate-400">${escapeHTML(peer.department)} • ${escapeHTML(peer.semester)}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <i class="fa-solid fa-bolt text-amber-400"></i><span>${peer.karma}⚡</span>
            </div>
          </div>
          <p class="text-xs text-slate-300 mb-4 line-clamp-2 leading-relaxed">${escapeHTML(peer.bio || 'Student at CampusBarter eager to trade academic notes and skills.')}</p>
          <div class="mb-3">
            <p class="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
              <i class="fa-solid fa-chalkboard-user"></i> Skills I Teach
            </p>
            <div class="flex flex-wrap gap-1.5">
              ${(peer.teachSkills || []).map(skill => `<span class="tag-teach text-xs px-2.5 py-0.5 rounded-lg font-medium inline-block">${escapeHTML(skill)}</span>`).join("")}
            </div>
          </div>
          <div class="mb-4">
            <p class="text-[11px] uppercase tracking-wider font-semibold text-indigo-400 mb-1.5 flex items-center gap-1.5">
              <i class="fa-solid fa-graduation-cap"></i> Skills I Want to Learn
            </p>
            <div class="flex flex-wrap gap-1.5">
              ${(peer.learnSkills || []).map(skill => `<span class="tag-learn text-xs px-2.5 py-0.5 rounded-lg font-medium inline-block">${escapeHTML(skill)}</span>`).join("")}
            </div>
          </div>
        </div>
        <div>
          <div class="pt-3 border-t border-white/10 flex items-center justify-between mb-3 text-xs text-slate-400">
            <span><i class="fa-solid fa-star text-amber-400 mr-1"></i> ${peer.rating || 5.0} (${peer.swapsCompleted || 0} swaps)</span>
            <span class="text-emerald-400 font-medium">${peer.matchScore || 100}% Match</span>
          </div>
          ${isSelf ? `
            <button onclick="openEditProfileModal()" class="w-full btn-emerald text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20">
              <i class="fa-solid fa-user-pen"></i> Edit My Profile & Skills
            </button>
          ` : `
            <button onclick="proposeSwapToPeer('${peer.id}')" class="w-full btn-glass text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 hover:border-indigo-400 group-hover:bg-indigo-600/30">
              <i class="fa-solid fa-handshake text-indigo-400"></i> Barter Skills
            </button>
          `}
        </div>
      </div>
    `;
  }).join("");
}

function populatePeerDropdown() {
  const peerSelect = document.getElementById("propose-target-peer");
  if (!peerSelect) return;
  // Exclude logged in user to strictly enforce no self-barters
  const eligiblePeers = STATE.peers.filter(p => {
    if (!STATE.currentUser) return true;
    return p.id !== STATE.currentUser.id && (!p.email || !STATE.currentUser.email || p.email.toLowerCase() !== STATE.currentUser.email.toLowerCase());
  });

  if (eligiblePeers.length === 0) {
    peerSelect.innerHTML = `<option value="">No other peers available</option>`;
    return;
  }

  peerSelect.innerHTML = eligiblePeers.map(p => {
    const dept = (p.department || "General").split(" ")[0];
    const skill = (p.teachSkills && p.teachSkills[0]) ? p.teachSkills[0] : "General";
    return `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)} (${escapeHTML(dept)} - ${escapeHTML(skill)})</option>`;
  }).join("");
}

function proposeSwapToPeer(peerId) {
  if (!STATE.currentUser) {
      showToast("Please log in or sign up first to propose a barter!", "warning", "fa-user-lock");
      setTimeout(() => { window.location.href = "login.html#signup"; }, 800);
      return;
    }
  if (STATE.currentUser.id === peerId) {
    showToast("You cannot propose a barter exchange with yourself!", "warning", "fa-circle-exclamation");
    return;
  }
  const modal = document.getElementById("propose-swap-modal");
  const peerSelect = document.getElementById("propose-target-peer");
  if (!modal) return;
  populatePeerDropdown();
  if (peerSelect) peerSelect.value = peerId;
  if (window.SoundFX) SoundFX.playWhoosh();
  modal.classList.remove("hidden");
}

// =============================================================================
// 7. MODALS SETUP & FORM SUBMISSIONS
// =============================================================================

function setupModalTriggers() {
  const proposeModal = document.getElementById("propose-swap-modal");
  const openProposeBtn = document.getElementById("trigger-create-swap-btn");
  const closeProposeBtn = document.getElementById("close-propose-modal-btn");
  const cancelProposeBtn = document.getElementById("cancel-propose-btn");

  if (openProposeBtn) {
    openProposeBtn.addEventListener("click", () => {
      if (!STATE.currentUser) {
        showToast("Please log in or sign up first to create a swap!", "warning", "fa-user-lock");
        setTimeout(() => { window.location.href = "login.html#signup"; }, 800);
        return;
      }
      if (window.SoundFX) SoundFX.playWhoosh();
      if (proposeModal) proposeModal.classList.remove("hidden");
    });
  }

  if (closeProposeBtn) closeProposeBtn.addEventListener("click", () => {
    if (window.SoundFX) SoundFX.playPop();
    proposeModal.classList.add("hidden");
  });
  if (cancelProposeBtn) cancelProposeBtn.addEventListener("click", () => {
    if (window.SoundFX) SoundFX.playPop();
    proposeModal.classList.add("hidden");
  });

  const schedModal = document.getElementById("schedule-modal");
  const closeSchedBtn = document.getElementById("close-schedule-modal-btn");
  const cancelSchedBtn = document.getElementById("cancel-schedule-btn");
  if (closeSchedBtn) closeSchedBtn.addEventListener("click", () => {
    if (window.SoundFX) SoundFX.playPop();
    schedModal.classList.add("hidden");
  });
  if (cancelSchedBtn) cancelSchedBtn.addEventListener("click", () => {
    if (window.SoundFX) SoundFX.playPop();
    schedModal.classList.add("hidden");
  });

  const prevModal = document.getElementById("paper-preview-modal");
  const closePrevBtn = document.getElementById("close-preview-modal-btn");
  if (closePrevBtn) closePrevBtn.addEventListener("click", () => {
    if (window.SoundFX) SoundFX.playPop();
    prevModal.classList.add("hidden");
  });

  const uploadModal = document.getElementById("upload-paper-modal");
  const bannerUploadBtn = document.getElementById("trigger-upload-banner-btn");
  const closeUploadBtn = document.getElementById("close-upload-modal-btn");
  const cancelUploadBtn = document.getElementById("cancel-upload-btn");

  if (bannerUploadBtn) {
    bannerUploadBtn.addEventListener("click", () => {
      if (!STATE.currentUser) {
        showToast("Please log in or sign up first to upload question papers!", "warning", "fa-user-lock");
        setTimeout(() => { window.location.href = "login.html#signup"; }, 800);
        return;
      }
      if (window.SoundFX) SoundFX.playWhoosh();
      if (uploadModal) uploadModal.classList.remove("hidden");
    });
  }

  if (closeUploadBtn) closeUploadBtn.addEventListener("click", () => {
    if (window.SoundFX) SoundFX.playPop();
    uploadModal.classList.add("hidden");
  });
  if (cancelUploadBtn) cancelUploadBtn.addEventListener("click", () => {
    if (window.SoundFX) SoundFX.playPop();
    uploadModal.classList.add("hidden");
  });

  const editProfileModal = document.getElementById("edit-profile-modal");
  const closeEditProfileBtn = document.getElementById("close-edit-profile-modal-btn");
  if (closeEditProfileBtn && editProfileModal) {
    closeEditProfileBtn.addEventListener("click", () => {
      if (window.SoundFX) SoundFX.playPop();
      editProfileModal.classList.add("hidden");
    });
  }
}

function setupModalForms() {
  // ---------------------------------------------------------------------------
  // FORM 1: PROPOSE BARTER (Custom Validation + Inline Kinetic Loader)
  // ---------------------------------------------------------------------------
  const proposeForm = document.getElementById("propose-swap-form");
  if (proposeForm) {
    proposeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors(proposeForm);

      const peerSelect = document.getElementById("propose-target-peer");
      const teachInput = document.getElementById("propose-teach-skill");
      const learnInput = document.getElementById("propose-learn-skill");
      const submitBtn = document.getElementById("submit-propose-btn") || proposeForm.querySelector("button[type='submit']");

      const peerId = peerSelect ? peerSelect.value : "";
      const teachSkill = teachInput ? teachInput.value.trim() : "";
      const learnSkill = learnInput ? learnInput.value.trim() : "";
      const pitch = document.getElementById("propose-pitch") ? document.getElementById("propose-pitch").value.trim() : "";

      let hasError = false;
      let firstErrorField = null;

      if (!peerId) {
        showFieldError(peerSelect, "Please select a peer to propose a barter swap with");
        hasError = true;
        firstErrorField = peerSelect;
      }

      const peer = STATE.peers.find(p => p.id === peerId);
      if (peerId && !peer) {
        showFieldError(peerSelect, "Selected peer not found. Please choose an active student.");
        hasError = true;
        if (!firstErrorField) firstErrorField = peerSelect;
      }

      if (peer && STATE.currentUser && (STATE.currentUser.id === peerId || (peer.email && STATE.currentUser.email && peer.email.toLowerCase() === STATE.currentUser.email.toLowerCase()))) {
        showFieldError(peerSelect, "Self-barter is not allowed. Please choose another peer!");
        hasError = true;
        if (!firstErrorField) firstErrorField = peerSelect;
      }

      if (!teachSkill) {
        showFieldError(teachInput, "Please specify the skill you will teach (e.g. Graph BFS)");
        hasError = true;
        if (!firstErrorField) firstErrorField = teachInput;
      }

      if (!learnSkill) {
        showFieldError(learnInput, "Please specify the skill you want from this peer");
        hasError = true;
        if (!firstErrorField) firstErrorField = learnInput;
      }

      if (hasError) {
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      showEnergyBeam(proposeForm);
      setButtonLoading(submitBtn, true, "Sending Proposal...");
      await new Promise(r => setTimeout(r, 450));

      const newSwap = {
        id: `swp-${Date.now()}`,
        userId: STATE.currentUser ? STATE.currentUser.id : "usr-guest",
        userName: STATE.currentUser ? STATE.currentUser.name : "You",
        peerId: peer.id,
        peerName: peer.name,
        isAi: peer.isAi || false,
        peerAvatar: peer.avatar || "assets/images/avatar-default.jpg",
        peerDepartment: peer.department || "General Studies",
        peerSemester: peer.semester || "Semester 1",
        peerTeaches: learnSkill,
        peerLearns: teachSkill,
        status: "PENDING",
        date: null,
        time: null,
        location: null,
        notes: pitch || "Excited to barter peer knowledge!"
      };

      STATE.activeSwaps.unshift(newSwap);
      saveStoredSwaps(STATE.activeSwaps);
      renderActiveSwaps();
      updateSwapCounters();
      updateGlobalStats();

      hideEnergyBeam(proposeForm);
      setButtonLoading(submitBtn, false);
      document.getElementById("propose-swap-modal").classList.add("hidden");
      proposeForm.reset();
      if (window.SoundFX) SoundFX.playSuccess();
      showToast(`Barter proposal sent to ${escapeHTML(peer.name)}! Status: Pending`, "success", "fa-paper-plane");
    });
  }

  // ---------------------------------------------------------------------------
  // FORM 2: SCHEDULE MEETING (Custom Validation + Inline Kinetic Loader)
  // ---------------------------------------------------------------------------
  const scheduleForm = document.getElementById("schedule-form");
  if (scheduleForm) {
    scheduleForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors(scheduleForm);

      const swapId = document.getElementById("schedule-swap-id").value;
      const dateInput = document.getElementById("schedule-date");
      const timeInput = document.getElementById("schedule-time");
      const locInput = document.getElementById("schedule-location");
      const submitBtn = document.getElementById("submit-schedule-btn") || scheduleForm.querySelector("button[type='submit']");

      const date = dateInput ? dateInput.value : "";
      const time = timeInput ? timeInput.value : "";
      const location = locInput ? locInput.value.trim() : "";
      const notes = document.getElementById("schedule-notes") ? document.getElementById("schedule-notes").value.trim() : "";

      let hasError = false;
      let firstErrorField = null;

      if (!date) {
        showFieldError(dateInput, "Please select a session meeting date");
        hasError = true;
        firstErrorField = dateInput;
      }

      if (!time) {
        showFieldError(timeInput, "Please choose a session meeting time");
        hasError = true;
        if (!firstErrorField) firstErrorField = timeInput;
      }

      if (!location) {
        showFieldError(locInput, "Please specify campus venue or online meeting link");
        hasError = true;
        if (!firstErrorField) firstErrorField = locInput;
      }

      if (hasError) {
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      const swap = STATE.activeSwaps.find(s => s.id === swapId);
      if (!swap) return;

      showEnergyBeam(scheduleForm);
      setButtonLoading(submitBtn, true, "Locking Schedule...");
      await new Promise(r => setTimeout(r, 450));

      swap.status = "SCHEDULED";
      swap.date = date;
      swap.time = time;
      swap.location = location;
      if (notes) swap.notes = notes;

      saveStoredSwaps(STATE.activeSwaps);
      renderActiveSwaps();
      updateSwapCounters();

      hideEnergyBeam(scheduleForm);
      setButtonLoading(submitBtn, false);
      document.getElementById("schedule-modal").classList.add("hidden");
      scheduleForm.reset();
      if (window.SoundFX) SoundFX.playSuccess();
      showToast(`Meeting scheduled with ${escapeHTML(swap.peerName)} for ${escapeHTML(date)}!`, "success", "fa-calendar-check");
    });
  }

  // ---------------------------------------------------------------------------
  // FORM 3: UPLOAD QUESTION PAPER (Interactive File Picker & Google Drive Auto-Sorting)
  // ---------------------------------------------------------------------------
  const uploadForm = document.getElementById("upload-paper-form");
  const uploadFileInput = document.getElementById("upload-file-input");
  const uploadDropzone = document.getElementById("upload-dropzone");
  const browsePdfBtn = document.getElementById("browse-pdf-btn");
  const uploadEmptyState = document.getElementById("upload-empty-state");
  const uploadSelectedState = document.getElementById("upload-selected-state");
  const selectedFileName = document.getElementById("selected-file-name");
  const selectedFileSize = document.getElementById("selected-file-size");
  const selectedTargetFolder = document.getElementById("selected-target-folder");
  const removeSelectedFileBtn = document.getElementById("remove-selected-file-btn");
  const uploadSubjectInput = document.getElementById("upload-subject");
  const driveFolderTargetName = document.getElementById("drive-folder-target-name");

  let currentSelectedFile = null;

  // Real-time synchronization of Target Google Drive Folder with typed Subject
  if (uploadSubjectInput) {
    const updateFolderBadges = () => {
      const subject = uploadSubjectInput.value.trim() || "General Studies";
      if (driveFolderTargetName) driveFolderTargetName.textContent = subject;
      if (selectedTargetFolder) selectedTargetFolder.textContent = subject;
    };
    uploadSubjectInput.addEventListener("input", updateFolderBadges);
    uploadSubjectInput.addEventListener("change", updateFolderBadges);
  }

  function formatFileBytes(bytes) {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  function handlePdfFileSelection(file) {
    if (!file) return;

    // Validate PDF extension or MIME type
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (!isPdf) {
      showToast("Please select a PDF document (.pdf format only)", "warning", "fa-file-circle-exclamation");
      if (window.SoundFX) SoundFX.playError();
      return;
    }

    // Validate Max Size 15 MB
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("File exceeds the 15 MB maximum size limit", "warning", "fa-triangle-exclamation");
      if (window.SoundFX) SoundFX.playError();
      return;
    }

    currentSelectedFile = file;
    if (selectedFileName) selectedFileName.textContent = file.name;
    if (selectedFileSize) selectedFileSize.textContent = formatFileBytes(file.size);
    const subject = (uploadSubjectInput && uploadSubjectInput.value.trim()) || "General Studies";
    if (selectedTargetFolder) selectedTargetFolder.textContent = subject;

    if (uploadEmptyState) uploadEmptyState.classList.add("hidden");
    if (uploadSelectedState) uploadSelectedState.classList.remove("hidden");
    if (window.SoundFX) SoundFX.playPop();
  }

  // Browse Device button click opens system file dialog
  if (browsePdfBtn && uploadFileInput) {
    browsePdfBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      uploadFileInput.click();
    });
  }

  // Clicking on dropzone background when empty opens file picker
  if (uploadDropzone && uploadFileInput) {
    uploadDropzone.addEventListener("click", (e) => {
      if (e.target.closest("#remove-selected-file-btn") || e.target.closest("#browse-pdf-btn")) return;
      if (!currentSelectedFile) {
        uploadFileInput.click();
      }
    });

    // Drag and Drop listeners
    ["dragenter", "dragover"].forEach(evtName => {
      uploadDropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadDropzone.classList.add("dropzone-dragover");
      });
    });

    ["dragleave", "dragend"].forEach(evtName => {
      uploadDropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadDropzone.classList.remove("dropzone-dragover");
      });
    });

    uploadDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.remove("dropzone-dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handlePdfFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (uploadFileInput) {
    uploadFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePdfFileSelection(e.target.files[0]);
      }
    });
  }

  if (removeSelectedFileBtn) {
    removeSelectedFileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      currentSelectedFile = null;
      if (uploadFileInput) uploadFileInput.value = "";
      if (uploadEmptyState) uploadEmptyState.classList.remove("hidden");
      if (uploadSelectedState) uploadSelectedState.classList.add("hidden");
      if (window.SoundFX) SoundFX.playPop();
    });
  }

  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors(uploadForm);

      const subjectInput = document.getElementById("upload-subject");
      const codeInput = document.getElementById("upload-code");
      const yearInput = document.getElementById("upload-year");
      const driveUrlInput = document.getElementById("upload-drive-url");
      const submitBtn = document.getElementById("submit-upload-btn") || uploadForm.querySelector("button[type='submit']");

      const subject = subjectInput ? subjectInput.value.trim() : "";
      const code = codeInput ? codeInput.value.trim().toUpperCase() : "";
      const semester = document.getElementById("upload-semester") ? document.getElementById("upload-semester").value : "Sem 4";
      const examType = document.getElementById("upload-exam-type") ? document.getElementById("upload-exam-type").value : "Semester End";
      const year = parseInt(yearInput ? yearInput.value : "2024", 10);
      let driveUrl = driveUrlInput ? driveUrlInput.value.trim() : "";

      let hasError = false;
      let firstErrorField = null;

      if (!subject) {
        showFieldError(subjectInput, "Please enter the subject name (e.g. Operating Systems, Mathematics)");
        hasError = true;
        firstErrorField = subjectInput;
      }

      if (!code) {
        showFieldError(codeInput, "Please enter course code (e.g. CS-402, MATH-201)");
        hasError = true;
        if (!firstErrorField) firstErrorField = codeInput;
      }

      if (!year || isNaN(year) || year < 2015 || year > 2026) {
        showFieldError(yearInput, "Please enter a valid exam year (2015 - 2026)");
        hasError = true;
        if (!firstErrorField) firstErrorField = yearInput;
      }

      // Check that at least a local PDF file was picked OR an external Google Drive URL was provided
      if (!currentSelectedFile && !driveUrl) {
        showToast("Please choose a PDF from your computer or provide a Drive link", "warning", "fa-file-circle-exclamation");
        hasError = true;
        if (browsePdfBtn) browsePdfBtn.focus();
      }

      if (driveUrl && !isValidDriveUrl(driveUrl)) {
        showFieldError(driveUrlInput, "Please enter a valid secure URL (e.g. https://drive.google.com/...)");
        hasError = true;
        if (!firstErrorField) firstErrorField = driveUrlInput;
      }

      if (hasError) {
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      showEnergyBeam(uploadForm);
      setButtonLoading(submitBtn, true, `Uploading & Sorting into /${subject}/...`);

      let finalFileUrl = driveUrl || "https://drive.google.com/drive/folders/1be2SNRssxdzlKLnCIMjGjkOh7UeJ_N9X?usp=drive_link";
      let realFileSize = currentSelectedFile ? formatFileBytes(currentSelectedFile.size) : "2.4 MB";
      let localBlobUrl = null;

      if (currentSelectedFile) {
        try {
          localBlobUrl = URL.createObjectURL(currentSelectedFile);

          // Check if Google Apps Script Webhook is configured
          const gdriveWebhook = localStorage.getItem("cb_gdrive_webhook_url") || GOOGLE_DRIVE_WEBHOOK_URL || "";
          if (gdriveWebhook) {
            const fileBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = err => reject(err);
              reader.readAsDataURL(currentSelectedFile);
            });

            const uploadPayload = {
              fileName: currentSelectedFile.name,
              fileData: fileBase64,
              subject: subject,
              code: code,
              semester: semester,
              examType: examType,
              year: String(year)
            };

            const gdriveResponse = await fetch(gdriveWebhook, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify(uploadPayload)
            });

            if (gdriveResponse.ok) {
              const resJson = await gdriveResponse.json();
              if (resJson && resJson.status === "success" && resJson.fileUrl) {
                finalFileUrl = resJson.fileUrl;
              }
            }
          } else {
            // Local blob URL provides instant browser preview and download
            finalFileUrl = localBlobUrl;
          }
        } catch (uploadErr) {
          console.warn("[CampusBarter Google Drive Auto-Upload Notice]", uploadErr);
          finalFileUrl = localBlobUrl || finalFileUrl;
        }
      }

      await new Promise(r => setTimeout(r, 450));

      const newPYQ = {
        id: `pyq-${Date.now()}`,
        subject: subject,
        code: code,
        semester: semester,
        examType: examType,
        year: year,
        fileSize: realFileSize,
        pages: 5,
        downloads: 0,
        rating: 5.0,
        fileUrl: finalFileUrl,
        fileBlobUrl: localBlobUrl,
        driveFolder: subject,
        uploader: STATE.currentUser ? STATE.currentUser.name : "Anonymous Student",
        isAi: STATE.currentUser ? !!STATE.currentUser.isAi : false,
        uploaderAvatar: STATE.currentUser ? (STATE.currentUser.avatar || "assets/images/avatar-default.jpg") : "assets/images/avatar-default.jpg",
        hasSolutions: true
      };

      STATE.pyqs.unshift(newPYQ);
      saveStoredPYQs(STATE.pyqs);

      // Cloud synchronization with Supabase (queues if offline)
      if (typeof DataManager !== "undefined") {
        try {
          DataManager.uploadPYQ({
            subject: subject,
            code: code,
            semester: semester,
            examType: examType,
            year: year,
            fileUrl: finalFileUrl,
            fileSize: realFileSize,
            pages: 5,
            hasSolutions: true
          }, STATE.currentUser);
        } catch (err) {
          console.warn("[CampusBarter Backend] Cloud upload deferred:", err.message);
        }
      }

      // Award +25 Karma to uploader & increment user pyqsUploaded counter
      if (STATE.currentUser) {
        STATE.currentUser.karma += 25;
        STATE.currentUser.pyqsUploaded = (STATE.currentUser.pyqsUploaded || 0) + 1;
        setStoredCurrentUser(STATE.currentUser);
        const acc = STATE.accounts.find(a => a.id === STATE.currentUser.id);
        if (acc) {
          acc.karma = STATE.currentUser.karma;
          acc.pyqsUploaded = STATE.currentUser.pyqsUploaded;
        }
        saveStoredAccounts(STATE.accounts);
      }

      filterAndRenderPYQs();
      renderNavbarAuth();
      updateGlobalStats();

      hideEnergyBeam(uploadForm);
      setButtonLoading(submitBtn, false);
      document.getElementById("upload-paper-modal").classList.add("hidden");
      uploadForm.reset();

      // Reset file picker state
      currentSelectedFile = null;
      if (uploadFileInput) uploadFileInput.value = "";
      if (uploadEmptyState) uploadEmptyState.classList.remove("hidden");
      if (uploadSelectedState) uploadSelectedState.classList.add("hidden");
      if (driveFolderTargetName) driveFolderTargetName.textContent = "Operating Systems";

      if (window.SoundFX) SoundFX.playKarmaBoost();
      showToast(`Paper published & organized into Google Drive /${subject}/ folder! (+25⚡)`, "success", "fa-cloud-arrow-up");
    });
  }

  // ---------------------------------------------------------------------------
  // FORM 4: EDIT PROFILE & SKILLS (Custom Validation + Inline Kinetic Loader)
  // Email is strictly non-editable (read-only/disabled per architecture rules)
  // ---------------------------------------------------------------------------
    // ---------------------------------------------------------------------------
  // PROFILE AVATAR PICKER & REAL-TIME IMAGE OPTIMIZATION
  // ---------------------------------------------------------------------------
  const avatarInput = document.getElementById("edit-profile-avatar-input");
  const avatarTrigger = document.getElementById("edit-profile-avatar-trigger");
  const uploadPhotoBtn = document.getElementById("edit-profile-upload-btn");
  const resetAvatarBtn = document.getElementById("edit-profile-reset-avatar-btn");

  if (avatarTrigger && avatarInput) {
    avatarTrigger.addEventListener("click", () => avatarInput.click());
  }

  if (uploadPhotoBtn && avatarInput) {
    uploadPhotoBtn.addEventListener("click", () => avatarInput.click());
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file (PNG, JPG, WebP)", "warning", "fa-triangle-exclamation");
        if (window.SoundFX) SoundFX.playError();
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        showToast("Image size must be under 8 MB", "warning", "fa-triangle-exclamation");
        if (window.SoundFX) SoundFX.playError();
        return;
      }

      try {
        const optimized = await optimizeAvatarImage(file, 256);
        pendingAvatarDataUrl = optimized;
        const preview = document.getElementById("edit-profile-avatar-preview");
        if (preview) preview.src = optimized;
        if (window.SoundFX) SoundFX.playPop();
        showToast("Photo preview ready! Click 'Save Changes' to update your profile.", "info", "fa-camera");
      } catch (err) {
        console.error("Avatar optimization error:", err);
        showToast("Failed to process image: " + err.message, "error", "fa-triangle-exclamation");
      }
    });
  }

  if (resetAvatarBtn) {
    resetAvatarBtn.addEventListener("click", () => {
      pendingAvatarDataUrl = "assets/images/avatar-default.jpg";
      const preview = document.getElementById("edit-profile-avatar-preview");
      if (preview) preview.src = pendingAvatarDataUrl;
      if (avatarInput) avatarInput.value = "";
      if (window.SoundFX) SoundFX.playPop();
      showToast("Avatar reset to default! Click 'Save Changes' to apply.", "info", "fa-rotate-left");
    });
  }

  const editProfileForm = document.getElementById("edit-profile-form");
  const editTeachInput = document.getElementById("edit-profile-teach");
  const editLearnInput = document.getElementById("edit-profile-learn");

  if (editTeachInput) {
    editTeachInput.addEventListener("input", (e) => {
      const tags = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      renderTagPills("edit-teach-tags-preview", tags, "tag-teach");
    });
  }

  if (editLearnInput) {
    editLearnInput.addEventListener("input", (e) => {
      const tags = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      renderTagPills("edit-learn-tags-preview", tags, "tag-learn");
    });
  }

  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors(editProfileForm);

      const user = STATE.currentUser;
      if (!user) {
        showToast("Please log in first to update your profile!", "warning", "fa-user-lock");
        return;
      }

      const nameInput = document.getElementById("edit-profile-name");
      const deptInput = document.getElementById("edit-profile-department");
      const semSelect = document.getElementById("edit-profile-semester");
      const teachInput = document.getElementById("edit-profile-teach");
      const learnInput = document.getElementById("edit-profile-learn");
      const bioInput = document.getElementById("edit-profile-bio");
      const saveBtn = document.getElementById("save-profile-btn");

      const newName = nameInput ? nameInput.value.trim() : "";
      const newDept = deptInput ? deptInput.value.trim() : "";
      const newSem = semSelect ? semSelect.value : "Semester 1";
      const rawTeach = teachInput ? teachInput.value.trim() : "";
      const rawLearn = learnInput ? learnInput.value.trim() : "";
      const newBio = bioInput ? bioInput.value.trim() : "";

      let hasError = false;
      let firstErrorField = null;

      if (!newName) {
        showFieldError(nameInput, "Please fill out your full name / username");
        hasError = true;
        firstErrorField = nameInput;
      }

      if (!newDept) {
        showFieldError(deptInput, "Please fill out your academic department");
        hasError = true;
        if (!firstErrorField) firstErrorField = deptInput;
      }

      if (!rawTeach) {
        showFieldError(teachInput, "Please enter skills you can teach (e.g. Python, C++)");
        hasError = true;
        if (!firstErrorField) firstErrorField = teachInput;
      }

      if (!rawLearn) {
        showFieldError(learnInput, "Please enter skills you want to learn (e.g. Docker, Next.js)");
        hasError = true;
        if (!firstErrorField) firstErrorField = learnInput;
      }

      if (hasError) {
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      const teachSkills = rawTeach.split(",").map(s => s.trim()).filter(Boolean);
      const learnSkills = rawLearn.split(",").map(s => s.trim()).filter(Boolean);

      showEnergyBeam(editProfileForm);
      setButtonLoading(saveBtn, true, "Saving Changes...");

      try {
        // 1. Update in-memory user (Email is strictly preserved!)
        if (pendingAvatarDataUrl) { user.avatar = pendingAvatarDataUrl; }
        user.name = newName;
        user.department = newDept;
        user.semester = newSem;
        user.teachSkills = teachSkills;
        user.learnSkills = learnSkills;
        if (newBio) user.bio = newBio;

        // 2. Persist to LocalStorage
        setStoredCurrentUser(user);

        // Update in STATE.accounts
        const accIdx = STATE.accounts.findIndex(a => a.id === user.id || (a.email && a.email.toLowerCase() === user.email.toLowerCase()));
        if (accIdx !== -1) {
          STATE.accounts[accIdx] = { ...STATE.accounts[accIdx], ...user };
        } else {
          STATE.accounts.push(user);
        }
        saveStoredAccounts(STATE.accounts);

        // Update in STATE.peers if present
        const peerIdx = STATE.peers.findIndex(p => p.id === user.id || (p.email && p.email.toLowerCase() === user.email.toLowerCase()));
        if (peerIdx !== -1) {
          STATE.peers[peerIdx].name = user.name;
          STATE.peers[peerIdx].department = user.department;
          STATE.peers[peerIdx].semester = user.semester;
          STATE.peers[peerIdx].teachSkills = user.teachSkills;
          STATE.peers[peerIdx].learnSkills = user.learnSkills;
          if (user.avatar) STATE.peers[peerIdx].avatar = user.avatar;
          if (newBio) STATE.peers[peerIdx].bio = newBio;
        }

        // 3. Sync to Supabase Cloud if online
        if (typeof DataManager !== "undefined" && DataManager.isOnline()) {
          try {
            await DataManager.updateProfile(user.id, {
              name: user.name,
              department: user.department,
              semester: user.semester,
              teachSkills: user.teachSkills,
              learnSkills: user.learnSkills,
              avatar: user.avatar
            });
            console.log("[CampusBarter Backend] Cloud profile successfully updated in Supabase.");
          } catch (cloudErr) {
            console.warn("[CampusBarter Backend] Cloud sync notice:", cloudErr.message);
          }
        }

        // Visual cadence for kinetic gyro spinner
        await new Promise(r => setTimeout(r, 450));

        // 4. Refresh UI
        renderNavbarAuth();
        renderPeerProfiles(STATE.currentDeptFilter || "ALL");
        populatePeerDropdown();
        renderActiveSwaps();

        hideEnergyBeam(editProfileForm);
        setButtonLoading(saveBtn, false);
        closeEditProfileModal();
        if (window.SoundFX) SoundFX.playSuccess();
        showToast("Profile updated successfully! 🚀 Your peers can now see your new skills.", "success", "fa-user-check");

      } catch (err) {
        console.error("Profile update error:", err);
        hideEnergyBeam(editProfileForm);
        setButtonLoading(saveBtn, false);
        showToast("Could not save profile changes. Please try again.", "error", "fa-triangle-exclamation");
      }
    });
  }
}

// =============================================================================
// 8. TOAST NOTIFICATION UTILITY
// =============================================================================

function showToast(message, type = "info", iconName = "fa-circle-info") {
  if (window.SoundFX) {
    if (type === "success") SoundFX.playSuccess();
    else if (type === "error") SoundFX.playError();
    else SoundFX.playPop();
  }

  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-item";

  let iconColor = "text-indigo-400";
  if (type === "success") iconColor = "text-emerald-400";
  else if (type === "warning") iconColor = "text-amber-400";
  else if (type === "error") iconColor = "text-rose-400";

  const iconEl = document.createElement("i");
  iconEl.className = `fa-solid ${iconName} ${iconColor} text-lg shrink-0`;

  const msgDiv = document.createElement("div");
  msgDiv.className = "text-xs text-slate-200 font-medium leading-snug flex-1";
  msgDiv.textContent = message;

  const closeBtn = document.createElement("button");
  closeBtn.className = "text-slate-500 hover:text-slate-300 ml-2 text-xs";
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  closeBtn.addEventListener("click", () => toast.remove());

  toast.appendChild(iconEl);
  toast.appendChild(msgDiv);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// =============================================================================
// 9. CREATIVE PRELOADER & STAGGERED ENTRANCE CONTROLLER
// =============================================================================

function initCreativePreloader() {
  const preloader = document.getElementById("app-preloader");
  if (!preloader) {
    document.body.classList.add("page-revealed");
    return;
  }

  const progressBar = document.getElementById("preloader-progress-bar");
  const pctText = document.getElementById("preloader-percentage");
  const statusText = document.getElementById("preloader-status-text");
  const skipBtn = document.getElementById("preloader-skip-btn");
  const audioPrompt = document.getElementById("preloader-audio-prompt");

  let isCompleted = false;

  const triggerAudioStart = () => {
    if (isCompleted) return;
    if (window.SoundFX && !SoundFX.isMuted()) {
      if (typeof SoundFX.unlock === "function") {
        SoundFX.unlock().then(() => {
          SoundFX.playLoaderStart();
          if (audioPrompt) {
            audioPrompt.innerHTML = '<i class="fa-solid fa-volume-high text-emerald-400 animate-pulse"></i> <span>Audio Active &bull; Charging...</span>';
            audioPrompt.classList.add("border-emerald-400/60", "text-white");
          }
        }).catch(() => {
          SoundFX.playLoaderStart();
        });
      } else {
        SoundFX.playLoaderStart();
      }
    }
  };

  // Attempt initial playback immediately (runs if browser allows autoplay)
  triggerAudioStart();

  // Active gesture unlocker: The first click, tap, or keypress anywhere on screen unlocks audio and starts charging sound
  const unlockAndStartSound = () => {
    triggerAudioStart();
  };

  ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click'].forEach(evt => {
    window.addEventListener(evt, unlockAndStartSound, { passive: true, once: true });
  });

  if (audioPrompt) {
    audioPrompt.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerAudioStart();
    });
  }

  // Clicking anywhere on preloader screen unlocks sound
  preloader.addEventListener("click", () => {
    triggerAudioStart();
  });

  const finishPreloader = () => {
    if (isCompleted) return;
    isCompleted = true;

    if (progressBar) progressBar.style.width = "100%";
    if (pctText) pctText.textContent = "100%";
    if (statusText) statusText.textContent = "Welcome to CampusBarter!";

    if (window.SoundFX && !SoundFX.isMuted()) {
      SoundFX.playLoaderComplete();
    }

    // Seamless Transition: Trigger UI update to guarantee logged-in user profile, avatar, and karma reflect immediately
    try {
      STATE.currentUser = getStoredCurrentUser();
      renderNavbarAuth();
      updateKarmaDisplays();
      updateGlobalStats();
    } catch (e) {
      console.warn("[CampusBarter Transition] UI update notice:", e);
    }

    // Trigger smooth fade out
    preloader.classList.add("fade-out");
    document.body.classList.add("page-revealed");

    setTimeout(() => {
      preloader.style.display = "none";
    }, 700);
  };

  if (skipBtn) {
    skipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerAudioStart();
      finishPreloader();
    });
  }

  // Smooth cinematic progress sequence (total duration ~2.4s)
  const steps = [
    { pct: 28, text: "Preparing campus workspace...", delay: 350 },
    { pct: 58, text: "Loading question papers & peer network...", delay: 850 },
    { pct: 86, text: "Syncing karma wallet & study resources...", delay: 1450 },
    { pct: 100, text: "Welcome to CampusBarter!", delay: 2050 }
  ];

  steps.forEach(step => {
    setTimeout(() => {
      if (isCompleted) return;
      if (progressBar) progressBar.style.width = `${step.pct}%`;
      if (pctText) pctText.textContent = `${step.pct}%`;
      if (statusText) statusText.textContent = step.text;

      // Dynamically ramp charging core frequency and ring milestone chimes
      if (window.SoundFX && step.pct < 100) {
        SoundFX.updateLoaderProgress(step.pct);
      }

      if (step.pct === 100) {
        setTimeout(finishPreloader, 350);
      }
    }, step.delay);
  });
}

// =============================================================================
// 10. KARMA TOKEN REFILL ENGINE (+30 Karma/hr, 2-Hour Batch, Max Cap: 120⚡)
// Refill stops automatically once balance reaches 120 Karma ("ek bar 120 pocha toh phir refill ruk jayegi")
// =============================================================================

const MAX_REFILL_CAP = 120; // Maximum Karma cap for automated refills
const REFILL_CYCLE_MS = 2 * 60 * 60 * 1000; // 2 hours = 7,200,000 ms
const REFILL_RATE_PER_HR = 30; // 30 Karma points per hour
const REFILL_AMOUNT_PER_CYCLE = 60; // 60 Karma points credited every 2 hours

let refillIntervalId = null;

function initTokenRefillEngine() {
  const user = STATE.currentUser;
  if (!user) {
    if (refillIntervalId) clearInterval(refillIntervalId);
    return;
  }

  // Ensure lastRefillTime is initialized
  if (!user.lastRefillTime) {
    user.lastRefillTime = Date.now();
    setStoredCurrentUser(user);
  }

  // If online and authenticated in Supabase, execute secure atomic server-side refill procedure
  if (window.supabaseClient && typeof DataManager !== "undefined" && DataManager.isOnline() && !user.isAi) {
    window.supabaseClient.rpc("refill_karma_token_secure").then(({ data, error }) => {
      if (!error && data && data.status === "REFILLED") {
        user.karma = data.new_balance;
        setStoredCurrentUser(user);
        updateKarmaDisplays();
      }
    }).catch(err => {
      console.warn("[CampusBarter Backend] Cloud token refill check notice:", err.message);
    });
  }

  // If user balance is below the 120 max cap, process offline accrual
  if (user.karma < MAX_REFILL_CAP) {
    const now = Date.now();
    const elapsed = now - user.lastRefillTime;

    if (elapsed >= REFILL_CYCLE_MS) {
      const cycles = Math.floor(elapsed / REFILL_CYCLE_MS);
      const needed = MAX_REFILL_CAP - user.karma;
      const potential = cycles * REFILL_AMOUNT_PER_CYCLE;
      const accrued = Math.min(potential, needed);

      user.karma += accrued;

      if (user.karma >= MAX_REFILL_CAP) {
        user.karma = MAX_REFILL_CAP;
        user.lastRefillTime = Date.now();
        setTimeout(() => {
          showToast(`⚡ Karma Refilled to Max Cap (120⚡)! Automated refill is now paused.`, "info", "fa-bolt-lightning");
          if (window.SoundFX) SoundFX.playSuccess();
        }, 1500);
      } else {
        user.lastRefillTime = now - (elapsed % REFILL_CYCLE_MS);
        setTimeout(() => {
          showToast(`⚡ Karma Refilled! Welcome back! +${accrued}⚡ added (${user.karma}/${MAX_REFILL_CAP}⚡).`, "success", "fa-bolt-lightning");
          if (window.SoundFX) SoundFX.playSuccess();
        }, 1500);
      }

      setStoredCurrentUser(user);
      const accIdx = STATE.accounts.findIndex(a => a.id === user.id);
      if (accIdx !== -1) {
        STATE.accounts[accIdx].karma = user.karma;
        saveStoredAccounts(STATE.accounts);
      }
    }
  } else {
    // Balance is at or above 120⚡ cap (e.g. 300⚡ welcome bonus) -> Refill is paused
    user.lastRefillTime = Date.now();
    setStoredCurrentUser(user);
  }

  updateKarmaDisplays();

  if (refillIntervalId) clearInterval(refillIntervalId);
  refillIntervalId = setInterval(tickTokenRefillTimer, 1000);
  tickTokenRefillTimer();
}

function tickTokenRefillTimer() {
  const user = STATE.currentUser;
  if (!user) return;

  const navTimer = document.getElementById("nav-refill-timer");
  const navPill = document.getElementById("token-refill-pill");
  const navBadge = document.getElementById("nav-refill-badge");
  const mobileTimer = document.getElementById("mobile-refill-timer");
  const dropTimer = document.getElementById("dropdown-refill-timer");
  const dropProgress = document.getElementById("dropdown-refill-progress");
  const modalTimer = document.getElementById("modal-refill-countdown");
  const modalProgress = document.getElementById("modal-refill-progress");
  const modalStatus = document.getElementById("modal-refill-status");

  // RULE: If balance is at or above 120 Karma, refill stops ("ruk jayegi")!
  if (user.karma >= MAX_REFILL_CAP) {
    user.lastRefillTime = Date.now(); // Keep fresh so when balance drops below 120, 2h cycle starts

    if (navTimer) navTimer.textContent = "120⚡ Max (Full)";
    if (navBadge) navBadge.textContent = "Paused";
    if (navPill) {
      navPill.title = `Karma Refill Paused: Balance (${user.karma}⚡) is at or above the 120⚡ cap. Refill resumes if balance drops below 120⚡.`;
    }

    if (mobileTimer) mobileTimer.textContent = "120⚡ Cap (Full)";
    if (dropTimer) dropTimer.textContent = "Paused (≥120⚡ Cap)";
    if (dropProgress) {
      dropProgress.style.width = "100%";
      dropProgress.className = "bg-emerald-400 h-full w-full transition-all duration-300";
    }

    if (modalTimer) {
      modalTimer.textContent = "120⚡ CAP REACHED";
      modalTimer.className = "text-2xl sm:text-3xl font-black font-mono text-emerald-400 my-1";
    }
    if (modalProgress) {
      modalProgress.style.width = "100%";
      modalProgress.className = "bg-emerald-400 h-full w-full transition-all duration-500";
    }
    if (modalStatus) {
      modalStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Refill Paused • Balance (${user.karma}⚡) is at or above 120⚡ cap</span>`;
    }
    return;
  }

  // User has < 120 Karma: Refill is ACTIVE!
  if (!user.lastRefillTime) user.lastRefillTime = Date.now();

  const now = Date.now();
  const elapsed = now - user.lastRefillTime;
  const needed = MAX_REFILL_CAP - user.karma;
  const willRefill = Math.min(REFILL_AMOUNT_PER_CYCLE, needed);

  if (elapsed >= REFILL_CYCLE_MS) {
    // 2-hour window reached! Award points up to cap
    user.karma += willRefill;
    user.lastRefillTime = Date.now();
    setStoredCurrentUser(user);

    const accIdx = STATE.accounts.findIndex(a => a.id === user.id);
    if (accIdx !== -1) {
      STATE.accounts[accIdx].karma = user.karma;
      saveStoredAccounts(STATE.accounts);
    }

    updateKarmaDisplays();

    if (user.karma >= MAX_REFILL_CAP) {
      showToast(`⚡ Karma Refill Reached Cap! Recharged to 120⚡. Refill is now paused.`, "success", "fa-bolt-lightning");
    } else {
      showToast(`⚡ Karma Refilled! +${willRefill}⚡ credited (${user.karma}/${MAX_REFILL_CAP}⚡).`, "success", "fa-bolt-lightning");
    }
    if (window.SoundFX) SoundFX.playSuccess();
    return;
  }

  const remainingMs = Math.max(0, REFILL_CYCLE_MS - (elapsed % REFILL_CYCLE_MS));
  const totalSec = Math.floor(remainingMs / 1000);
  const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  const formattedCountdown = `${hrs}:${mins}:${secs}`;

  const progressPct = Math.min(100, Math.max(0, ((elapsed % REFILL_CYCLE_MS) / REFILL_CYCLE_MS) * 100));

  if (navTimer) navTimer.textContent = formattedCountdown;
  if (navBadge) navBadge.textContent = `+${willRefill}⚡`;
  if (navPill) {
    navPill.title = `Karma Token Refill: +${willRefill}⚡ in ${formattedCountdown} (Cap: 120⚡)`;
  }

  if (mobileTimer) mobileTimer.textContent = `${formattedCountdown} (+${willRefill}⚡)`;
  if (dropTimer) dropTimer.textContent = `${formattedCountdown} (+${willRefill}⚡)`;
  if (dropProgress) {
    dropProgress.style.width = `${progressPct}%`;
    dropProgress.className = "bg-gradient-to-r from-sky-400 to-emerald-400 h-full transition-all duration-300";
  }

  if (modalTimer) {
    modalTimer.textContent = formattedCountdown;
    modalTimer.className = "text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 my-1";
  }
  if (modalProgress) {
    modalProgress.style.width = `${progressPct}%`;
    modalProgress.className = "bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 h-full transition-all duration-500";
  }
  if (modalStatus) {
    modalStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span><span>Active Refill • Adding +${willRefill}⚡ (Cap: 120⚡)</span>`;
  }
}

function updateKarmaDisplays() {
  const user = STATE.currentUser;
  if (!user) return;

  const navKarma = document.getElementById("user-karma");
  if (navKarma) navKarma.textContent = user.karma;

  const editHeaderKarma = document.getElementById("edit-profile-header-karma");
  if (editHeaderKarma) editHeaderKarma.textContent = user.karma;
}

function openTokenRefillModal() {
  if (window.SoundFX) SoundFX.playWhoosh();
  const modal = document.getElementById("token-refill-modal");
  if (modal) {
    modal.classList.remove("hidden");
    tickTokenRefillTimer();
  }
}

function closeTokenRefillModal() {
  if (window.SoundFX) SoundFX.playPop();
  const modal = document.getElementById("token-refill-modal");
  if (modal) modal.classList.add("hidden");
}

// Expose modal handlers to global window
window.openTokenRefillModal = openTokenRefillModal;
window.closeTokenRefillModal = closeTokenRefillModal;

// =============================================================================
// 11. DOM CONTENT LOADED INITIALIZER
// =============================================================================

// -----------------------------------------------------------------------------
// APPLICATION INITIALIZATION ENGINE (Resilient Subsystem Execution)
// -----------------------------------------------------------------------------
function initApp() {
  // 1. Creative Preloader (Guaranteed to start and animate)
  try {
    initCreativePreloader();
  } catch (e) {
    console.error("[Preloader Init Error]", e);
    const p = document.getElementById("app-preloader");
    if (p) p.style.display = "none";
    document.body.classList.add("page-revealed");
  }

  // 2. Sound FX Toggle Binding
  try {
    if (window.SoundFX) {
      SoundFX.bindToggleBtn('#sfx-toggle-btn', '#sfx-toggle-icon', '#sfx-toggle-label');
    }
  } catch (e) {
    console.warn("[SoundFX Toggle Error]", e);
  }

  // 3. Setup All Event Listeners & Modals (Must ALWAYS execute regardless of cloud DB status)
  try { populateDropdownFilters(); } catch (e) { console.warn("[Filters Init]", e); }
  try { setupEventListeners(); } catch (e) { console.error("[Event Listeners Init Error]", e); }
  try { setupAuthSystem(); } catch (e) { console.warn("[Auth System Init]", e); }
  try { setupModalTriggers(); } catch (e) { console.error("[Modal Triggers Init Error]", e); }
  try { setupModalForms(); } catch (e) { console.error("[Modal Forms Init Error]", e); }

  // 4. Render UI Components
  try { populatePeerDropdown(); } catch (e) { console.warn("[Peer Dropdown]", e); }
  try { renderNavbarAuth(); } catch (e) { console.error("[Navbar Auth Error]", e); }
  try { filterAndRenderPYQs(); } catch (e) { console.warn("[PYQ Render]", e); }
  try { renderActiveSwaps(); } catch (e) { console.warn("[Active Swaps Render]", e); }
  try { renderPeerProfiles(); } catch (e) { console.warn("[Peer Profiles Render]", e); }
  try { updateSwapCounters(); } catch (e) { console.warn("[Swap Counters]", e); }
  try { updateGlobalStats(); } catch (e) { console.warn("[Global Stats]", e); }
  try { checkAuthHash(); } catch (e) { console.warn("[Auth Hash]", e); }

  // 5. Karma Token Refill Engine
  try { initTokenRefillEngine(); } catch (e) { console.warn("[Refill Engine]", e); }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}