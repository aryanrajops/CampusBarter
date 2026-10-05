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
    id: "518f1dac-9518-4655-ab34-68faf0cae30d",
    name: "Aryanraj Jaiswal",
    isAi: false,
    email: "aryanj.j.666@gmail.com",
    password: "password123",
    department: "BSCIT",
    semester: "Sem 1",
    karma: 300,
    swapsCompleted: 0,
    pyqsUploaded: 0,
    downloads: 0,
    avatar: "assets/images/avatar-default.jpg",
    teachSkills: ["Full Stack Web Dev", "Python & DSA", "React 19"],
    learnSkills: ["UI/UX Design", "System Architecture", "Cloud APIs"]
  },
  {
    id: "c669f542-16f2-4fbe-8f36-b3b493ea5192",
    name: "Shaun Dsilva",
    isAi: false,
    email: "dsilvashaun0809@gmail.com",
    password: "password123",
    department: "IT",
    semester: "Sem 1",
    karma: 300,
    swapsCompleted: 0,
    pyqsUploaded: 0,
    downloads: 0,
    avatar: "assets/images/avatar-default.jpg",
    teachSkills: ["Bakchodi"],
    learnSkills: ["Full Stack React", "Docker & Containers"]
  },
  {
    id: "cb2c77b7-8cbe-425b-a0cd-98cf60be9db4",
    name: "Lalitraj Jaiswal",
    isAi: false,
    email: "theycallmestyler@gmail.com",
    password: "password123",
    department: "Computer Science",
    semester: "Sem 1",
    karma: 300,
    swapsCompleted: 0,
    pyqsUploaded: 0,
    downloads: 0,
    avatar: "assets/images/avatar-default.jpg",
    teachSkills: ["Java Programming", "Object Oriented Design", "C++"],
    learnSkills: ["Web Development", "Database Indexing", "Spring Boot"]
  },
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

/**
 * Resolves collegiate curricular skills for students.
 * STRICT PRINCIPLE: Always prioritize actual user/database skills first!
 * If Shaun enters "Bakchodi", or any student enters custom skills, THAT is their skill.
 * Academic fallbacks are only applied if skills are absent or literal "General Studies" placeholder.
 */
function resolveCollegiateSkills(p) {
  if (typeof window.resolveCollegiateSkills === "function" && window.resolveCollegiateSkills !== resolveCollegiateSkills) {
    return window.resolveCollegiateSkills(p);
  }
  if (!p) {
    return {
      teach: ["Full Stack Web Dev", "Python & DSA"],
      learn: ["UI/UX Design", "System Architecture"]
    };
  }

  // Parse skill values whether Array, comma-separated string, or Postgres array string "{item1,item2}"
  const parseSkillsList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map(s => typeof s === "string" ? s.trim() : String(s)).filter(Boolean);
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return [];
      const stripped = trimmed.replace(/^\{|\}$/g, "");
      return stripped
        .split(",")
        .map(s => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    return [];
  };

  const rawTeach = parseSkillsList(p.teachSkills || p.teach_skills || (p.user_metadata && (p.user_metadata.teach_skills || p.user_metadata.teachSkills)));
  const rawLearn = parseSkillsList(p.learnSkills || p.learn_skills || (p.user_metadata && (p.user_metadata.learn_skills || p.user_metadata.learnSkills)));

  // Only filter out true generic placeholder / empty strings
  const isGeneric = (s) => {
    if (!s || typeof s !== "string") return true;
    const lower = s.trim().toLowerCase();
    return [
      "general studies", 
      "general", 
      "advanced coding", 
      "skill exchange", 
      "peer academic barter", 
      "n/a", 
      "none", 
      "null", 
      "undefined"
    ].includes(lower);
  };

  const cleanTeach = rawTeach.filter(s => !isGeneric(s));
  const cleanLearn = rawLearn.filter(s => !isGeneric(s));

  // Determine fallback defaults ONLY when clean skills are absent
  const email = (p.email || "").toLowerCase();
  const name = (p.name || "").toLowerCase();

  let fallbackTeach = cleanTeach;
  let fallbackLearn = cleanLearn;

  if (cleanTeach.length === 0) {
    if (email.includes("dsilvashaun") || name.includes("shaun")) {
      fallbackTeach = ["Bakchodi"];
    } else if (email.includes("aryanj") || email.includes("aryanraj") || name.includes("aryanraj")) {
      fallbackTeach = ["Full Stack Web Dev", "Python & DSA"];
    } else if (email.includes("theycallmestyler") || name.includes("lalitraj")) {
      fallbackTeach = ["Java Programming", "C++"];
    } else {
      fallbackTeach = ["Peer Academic Barter"];
    }
  }

  if (cleanLearn.length === 0) {
    if (email.includes("dsilvashaun") || name.includes("shaun")) {
      fallbackLearn = ["Full Stack React", "Docker & Containers"];
    } else if (email.includes("aryanj") || email.includes("aryanraj") || name.includes("aryanraj")) {
      fallbackLearn = ["UI/UX Design", "System Architecture"];
    } else if (email.includes("theycallmestyler") || name.includes("lalitraj")) {
      fallbackLearn = ["Web Development", "Database Indexing"];
    } else {
      fallbackLearn = ["Skill Exchange"];
    }
  }

  // ABSOLUTELY NO DEPARTMENT/COURSE-BASED HARDCODING:
  // Real user skills from database or inputs are 100% respected and preserved!
  return {
    teach: cleanTeach.length > 0 ? cleanTeach : fallbackTeach,
    learn: cleanLearn.length > 0 ? cleanLearn : fallbackLearn
  };
}
window.resolveCollegiateSkills = resolveCollegiateSkills;

function getStoredAccounts() {
  const data = localStorage.getItem("cb_accounts");
  if (!data) {
    localStorage.setItem("cb_accounts", JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  }
  let accounts = JSON.parse(data);
  // Migration check: ensure mock AI accounts are properly prefixed and flagged
  let updated = false;

  // Ensure Aryan Raj and known real accounts are seeded in local cache
  DEFAULT_ACCOUNTS.forEach(seedAcc => {
    if (!seedAcc.isAi && seedAcc.email) {
      const idx = accounts.findIndex(a => a.email && a.email.toLowerCase() === seedAcc.email.toLowerCase());
      if (idx === -1) {
        accounts.push(seedAcc);
        updated = true;
      }
    }
  });

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
    // Sanitize any generic placeholder skills on real student accounts
    if (!acc.isAi) {
      const isGenericSkill = (s) => !s || typeof s !== "string" || [
        "general studies", "general", "advanced coding", "skill exchange", "peer academic barter", "n/a", "none", "null", "undefined"
      ].includes(s.trim().toLowerCase());
      const hasGenericTeach = !acc.teachSkills || !acc.teachSkills.length || acc.teachSkills.some(isGenericSkill);
      const hasGenericLearn = !acc.learnSkills || !acc.learnSkills.length || acc.learnSkills.some(isGenericSkill);
      if (hasGenericTeach || hasGenericLearn) {
        const resolved = resolveCollegiateSkills(acc);
        if (hasGenericTeach) {
          acc.teachSkills = resolved.teach;
          updated = true;
        }
        if (hasGenericLearn) {
          acc.learnSkills = resolved.learn;
          updated = true;
        }
      }
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

// =============================================================================
// GUEST-FIRST ENFORCEMENT & STALE SESSION FLUSH (v2.1)
// Guarantees all visiting users start as clean Guests with Log In / Sign Up buttons.
// Automatically flushes any legacy auto-seeded session from previous test builds.
// =============================================================================
const APP_AUTH_VERSION = "cb_v2.1_guest_enforced";
try {
  if (localStorage.getItem("cb_auth_version") !== APP_AUTH_VERSION) {
    localStorage.removeItem("cb_current_user");
    localStorage.setItem("cb_auth_version", APP_AUTH_VERSION);
  }
} catch (e) {
  console.warn("[CampusBarter Auth] Version check notice:", e);
}

function getStoredCurrentUser() {
  try {
    const user = localStorage.getItem("cb_current_user");
    if (!user || user === "null") {
      return null;
    }
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
    if (!parsed.isAi) {
      const isGenericSkill = (s) => !s || typeof s !== "string" || [
        "general studies", "general", "advanced coding", "skill exchange", "peer academic barter", "n/a", "none", "null", "undefined"
      ].includes(s.trim().toLowerCase());
      const hasGenericTeach = !parsed.teachSkills || !parsed.teachSkills.length || parsed.teachSkills.some(isGenericSkill);
      const hasGenericLearn = !parsed.learnSkills || !parsed.learnSkills.length || parsed.learnSkills.some(isGenericSkill);
      if (hasGenericTeach || hasGenericLearn) {
        const resolved = resolveCollegiateSkills(parsed);
        if (hasGenericTeach) {
          parsed.teachSkills = resolved.teach;
          updated = true;
        }
        if (hasGenericLearn) {
          parsed.learnSkills = resolved.learn;
          updated = true;
        }
      }
    }
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
    isProtected: true,
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
    isProtected: true,
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
    isProtected: true,
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
    isProtected: true,
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
    isProtected: true,
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
    isProtected: true,
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
    const realPeers = [];
    const seenEmails = new Set();
    const seenIds = new Set();

    // Prioritize real student accounts first
    accounts.forEach(acc => {
      if (!acc.isAi) {
        const emailKey = (acc.email || "").toLowerCase();
        if (!seenIds.has(acc.id) && (!emailKey || !seenEmails.has(emailKey))) {
          seenIds.add(acc.id);
          if (emailKey) seenEmails.add(emailKey);
          const resolved = resolveCollegiateSkills(acc);
          realPeers.push({
            id: acc.id,
            name: acc.name,
            email: acc.email,
            isAi: false,
            avatar: acc.avatar || "assets/images/avatar-default.jpg",
            department: acc.department || "Computer Science",
            semester: acc.semester || "Sem 1",
            rating: acc.rating || 5.0,
            swapsCompleted: acc.swapsCompleted || 0,
            karma: acc.karma || 300,
            matchScore: 95,
            bio: acc.bio || "Active collegiate student on CampusBarter ready to trade skills and knowledge.",
            teachSkills: resolved.teach,
            learnSkills: resolved.learn
          });
        }
      }
    });

    const peers = [...realPeers];
    DEFAULT_PEERS.forEach(dp => {
      if (!seenIds.has(dp.id)) {
        seenIds.add(dp.id);
        peers.push(dp);
      }
    });

    return peers;
  } catch (e) {
    console.warn("[CampusBarter Storage] Error reading peers, falling back:", e);
    return [...DEFAULT_PEERS];
  }
}

// =============================================================================
// DYNAMIC CLOUD PEER SYNCHRONIZATION (Supabase Cloud + LocalStorage)
// Fetches all real registered students from cloud profiles and merges seamlessly
// =============================================================================
async function syncPeersFromCloud() {
  if (typeof DataManager === "undefined" || !DataManager.isOnline() || typeof DataManager.getProfiles !== "function") {
    return;
  }
  try {
    const cloudProfiles = await DataManager.getProfiles();
    if (!cloudProfiles || cloudProfiles.length === 0) return;

    const accounts = getStoredAccounts();
    let accountsUpdated = false;

    cloudProfiles.forEach(cp => {
      // Don't overwrite AI personas
      if (cp.id === "usr-1" || cp.id === "usr-2" || cp.id === "usr-3") return;
      const emailLower = (cp.email || "").toLowerCase();
      const existingIdx = accounts.findIndex(a => a.id === cp.id || (a.email && emailLower && a.email.toLowerCase() === emailLower));
      const resolved = resolveCollegiateSkills(cp);

      if (existingIdx !== -1) {
        // Prioritize real user skills:
        const isGenericSkill = (s) => !s || typeof s !== "string" || [
          "general studies", "general", "advanced coding", "skill exchange", "peer academic barter", "n/a", "none", "null", "undefined"
        ].includes(s.trim().toLowerCase());

        const localTeach = accounts[existingIdx].teachSkills;
        const localLearn = accounts[existingIdx].learnSkills;
        let finalTeach = resolved.teach;
        let finalLearn = resolved.learn;

        if (localTeach && localTeach.length && !localTeach.some(isGenericSkill)) {
          if (!cp.teachSkills || !cp.teachSkills.length || cp.teachSkills.some(isGenericSkill)) {
            finalTeach = localTeach;
          }
        }
        if (localLearn && localLearn.length && !localLearn.some(isGenericSkill)) {
          if (!cp.learnSkills || !cp.learnSkills.length || cp.learnSkills.some(isGenericSkill)) {
            finalLearn = localLearn;
          }
        }

        // Merge cloud updates into local account cache
        accounts[existingIdx] = {
          ...accounts[existingIdx],
          name: cp.name || accounts[existingIdx].name,
          department: cp.department || accounts[existingIdx].department,
          semester: cp.semester || accounts[existingIdx].semester,
          karma: typeof cp.karma === "number" ? cp.karma : accounts[existingIdx].karma,
          teachSkills: finalTeach,
          learnSkills: finalLearn,
          avatar: cp.avatar || accounts[existingIdx].avatar,
          isAi: false
        };
        accountsUpdated = true;
      } else {
        // Add new student discovered in cloud
        accounts.push({
          id: cp.id,
          name: cp.name,
          email: cp.email,
          password: "",
          department: cp.department || "Computer Science",
          semester: cp.semester || "Sem 1",
          karma: typeof cp.karma === "number" ? cp.karma : 300,
          teachSkills: resolved.teach,
          learnSkills: resolved.learn,
          avatar: cp.avatar || "assets/images/avatar-default.jpg",
          swapsCompleted: cp.swapsCompleted || 0,
          pyqsUploaded: cp.pyqsUploaded || 0,
          downloads: cp.downloads || 0,
          isAi: false
        });
        accountsUpdated = true;
      }
    });

    if (accountsUpdated) {
      saveStoredAccounts(accounts);
      STATE.accounts = accounts;
    }

    // Refresh STATE.peers
    STATE.peers = getStoredPeers();

    // Re-render UI components with freshly synced real peers
    if (typeof renderPeerProfiles === "function") {
      renderPeerProfiles(STATE.currentDeptFilter || "ALL");
    }
    if (typeof populatePeerDropdown === "function") {
      const searchInput = document.getElementById("propose-peer-search-input");
      populatePeerDropdown(searchInput ? searchInput.value : "");
    }
    if (typeof updateGlobalStats === "function") {
      updateGlobalStats();
    }
  } catch (err) {
    console.warn("[CampusBarter Backend] Cloud peer sync warning:", err);
  }
}


// =============================================================================
// DYNAMIC CLOUD SWAP SYNCHRONIZATION (Supabase Cloud + LocalStorage)
// Fetches barter proposals across devices so peer requests appear in real-time
// =============================================================================
async function syncSwapsFromCloud() {
  if (typeof DataManager === "undefined" || !DataManager.isOnline() || typeof DataManager.getSwaps !== "function") {
    return;
  }
  if (!STATE.currentUser || !STATE.currentUser.id) {
    return;
  }

  try {
    const cloudSwaps = await DataManager.getSwaps(STATE.currentUser.id);
    if (!Array.isArray(cloudSwaps)) return;

    let swapsUpdated = false;
    const currentList = [...STATE.activeSwaps];

    cloudSwaps.forEach(cs => {
      const existingIdx = currentList.findIndex(s => s.id === cs.id);
      const isReq = cs.requester_id === STATE.currentUser.id;
      const otherId = isReq ? cs.peer_id : cs.requester_id;
      const otherProfile = STATE.peers.find(p => p.id === otherId) || STATE.accounts.find(a => a.id === otherId);

      const mappedSwap = {
        id: cs.id,
        userId: cs.requester_id,
        userName: isReq ? STATE.currentUser.name : (otherProfile ? otherProfile.name : "Student Peer"),
        userAvatar: isReq ? (STATE.currentUser.avatar || "assets/images/avatar-default.jpg") : (otherProfile ? (otherProfile.avatar || "assets/images/avatar-default.jpg") : "assets/images/avatar-default.jpg"),
        userEmail: isReq ? (STATE.currentUser.email || "") : (otherProfile ? (otherProfile.email || "") : ""),
        requester_id: cs.requester_id,
        peer_id: cs.peer_id,
        peerId: cs.peer_id,
        peerName: isReq ? (otherProfile ? otherProfile.name : "Student Peer") : STATE.currentUser.name,
        peerAvatar: isReq ? (otherProfile ? (otherProfile.avatar || "assets/images/avatar-default.jpg") : "assets/images/avatar-default.jpg") : (STATE.currentUser.avatar || "assets/images/avatar-default.jpg"),
        peerEmail: isReq ? (otherProfile ? (otherProfile.email || "") : "") : (STATE.currentUser.email || ""),
        peerDepartment: otherProfile ? otherProfile.department : "Computer Science",
        peerSemester: otherProfile ? otherProfile.semester : "Sem 4",
        peerTeaches: cs.peer_teaches,
        peerLearns: cs.requester_teaches,
        requester_teaches: cs.requester_teaches,
        peer_teaches: cs.peer_teaches,
        status: cs.status,
        date: cs.session_date || cs.date || null,
        time: cs.session_time || cs.time || null,
        location: cs.location || null,
        notes: cs.notes || "",
        isAi: otherProfile ? (otherProfile.isAi || false) : false
      };

      if (cs.status === "CANCELLED") {
        if (existingIdx !== -1) {
          currentList.splice(existingIdx, 1);
          swapsUpdated = true;
        }
      } else if (existingIdx !== -1) {
        const cur = currentList[existingIdx];
        if (cur.status !== mappedSwap.status || cur.date !== mappedSwap.date || cur.time !== mappedSwap.time || cur.location !== mappedSwap.location) {
          currentList[existingIdx] = { ...cur, ...mappedSwap };
          swapsUpdated = true;
        }
      } else {
        currentList.unshift(mappedSwap);
        swapsUpdated = true;
      }
    });

    if (swapsUpdated) {
      STATE.activeSwaps = currentList;
      saveStoredSwaps(STATE.activeSwaps);
      if (typeof renderActiveSwaps === "function") renderActiveSwaps();
      if (typeof updateSwapCounters === "function") updateSwapCounters();
      if (typeof updateGlobalStats === "function") updateGlobalStats();
    }
  } catch (err) {
    console.warn("[CampusBarter Backend] Cloud swap sync warning:", err);
  }
}

let swapsRealtimeChannel = null;
function setupSwapsRealtime() {
  if (swapsRealtimeChannel) return; // Prevent duplicate channels
  if (typeof DataManager !== "undefined" && typeof DataManager.getClient === "function") {
    const client = DataManager.getClient();
    if (client && typeof client.channel === "function") {
      try {
        swapsRealtimeChannel = client
          .channel("campusbarter-swaps-channel")
          .on("postgres_changes", { event: "*", schema: "public", table: "swaps" }, (payload) => {
            console.log("[Supabase Realtime] Swaps table changed:", payload.eventType);
            syncSwapsFromCloud();
          })
          .subscribe((status) => {
            console.log("[Supabase Realtime] Swaps channel connection status:", status);
          });
      } catch (e) {
        console.warn("[Supabase Realtime] Channel setup note:", e.message);
      }
    }
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

// Expose state and storage engines to global window
window.STATE = STATE;
window.getStoredAccounts = getStoredAccounts;
window.saveStoredAccounts = saveStoredAccounts;
window.getStoredCurrentUser = getStoredCurrentUser;
window.setStoredCurrentUser = setStoredCurrentUser;
window.getStoredPYQs = getStoredPYQs;
window.saveStoredPYQs = saveStoredPYQs;
window.getStoredSwaps = getStoredSwaps;
window.saveStoredSwaps = saveStoredSwaps;
window.getStoredPeers = getStoredPeers;
window.syncPeersFromCloud = syncPeersFromCloud;
window.syncSwapsFromCloud = syncSwapsFromCloud;
window.setupSwapsRealtime = setupSwapsRealtime;

// =============================================================================
// AI MOCK IDENTIFIER & REAL USER STATS ENGINE
// =============================================================================

function renderAiBadge(isAi, showReal = false) {
  if (isAi) {
    return `<span class="badge-ai-bot shrink-0 whitespace-nowrap" title="Automated Demo Account"><i class="fa-solid fa-robot"></i><span>AI Bot</span></span>`;
  }
  if (showReal) {
    return `<span class="badge-real-user shrink-0 whitespace-nowrap" title="Verified Human Student"><i class="fa-solid fa-circle-check"></i><span>Real User</span></span>`;
  }
  return "";
}

/**
 * Resolves the accurate partner profile, roles, and taught/learned skills for a barter swap.
 * Handles both the Proposer (Requester) and Recipient (Peer) viewpoints correctly:
 * - Proposer sees: Partner (Recipient) info + "Waiting for peer to accept..."
 * - Recipient sees: Partner (Proposer) info + "Accept Swap" / "Decline" buttons
 */
function resolveSwapDisplay(swap, currentUser) {
  if (!swap) return {};

  const reqId = swap.userId || swap.requester_id || swap.requesterId;
  const peerId = swap.peerId || swap.peer_id;

  // Guest / Demo Fallback
  if (!currentUser) {
    return {
      partnerName: swap.peerName || "Peer Student",
      partnerAvatar: swap.peerAvatar || "assets/images/avatar-default.jpg",
      partnerDept: swap.peerDepartment || "Computer Science",
      partnerSem: swap.peerSemester || "Sem 4",
      isAi: swap.isAi !== undefined ? swap.isAi : true,
      partnerTeaches: swap.peerTeaches || swap.peer_teaches || "Skills",
      youTeach: swap.peerLearns || swap.requester_teaches || "Knowledge",
      isRequester: false
    };
  }

  const myId = currentUser.id;
  const myEmail = (currentUser.email || "").toLowerCase();
  const reqEmail = (swap.userEmail || "").toLowerCase();
  const peerEmail = (swap.peerEmail || "").toLowerCase();

  const isRequester = (reqId === myId) || 
                      (myEmail && reqEmail && myEmail === reqEmail) || 
                      (swap.userName && currentUser.name && swap.userName.toLowerCase() === currentUser.name.toLowerCase());

  // Determine who the partner is from the current user's perspective
  const partnerId = isRequester ? peerId : reqId;

  // Find partner in STATE.peers or accounts
  let partner = null;
  if (partnerId) {
    partner = STATE.peers.find(p => p.id === partnerId) || 
              STATE.accounts.find(a => a.id === partnerId);
  }

  // Fallback to name search if ID not matched
  if (!partner) {
    if (isRequester && swap.peerName) {
      partner = STATE.peers.find(p => p.name === swap.peerName) || 
                STATE.accounts.find(a => a.name === swap.peerName);
    } else if (!isRequester && swap.userName) {
      partner = STATE.peers.find(p => p.name === swap.userName) || 
                STATE.accounts.find(a => a.name === swap.userName);
    }
  }

  let partnerName = "";
  let partnerAvatar = "";
  let partnerDept = "";
  let partnerSem = "";
  let isAi = false;

  if (isRequester) {
    partnerName = partner ? partner.name : (swap.peerName || "Peer Student");
    partnerAvatar = partner ? (partner.avatar || partner.avatar_url) : (swap.peerAvatar || "assets/images/avatar-default.jpg");
    partnerDept = partner ? partner.department : (swap.peerDepartment || "Campus Student");
    partnerSem = partner ? partner.semester : (swap.peerSemester || "Sem 1");
    isAi = partner ? (partner.isAi || false) : (swap.isAi || false);
  } else {
    partnerName = partner ? partner.name : (swap.userName || "Peer Student");
    partnerAvatar = partner ? (partner.avatar || partner.avatar_url) : (swap.userAvatar || "assets/images/avatar-default.jpg");
    partnerDept = partner ? partner.department : "Campus Student";
    partnerSem = partner ? partner.semester : "Sem 1";
    isAi = partner ? (partner.isAi || false) : false;
  }

  if (!partnerAvatar || partnerAvatar.includes("undefined") || partnerAvatar.includes("null")) {
    partnerAvatar = "assets/images/avatar-default.jpg";
  }

  let partnerTeaches = "";
  let youTeach = "";

  if (isRequester) {
    partnerTeaches = swap.peerTeaches || swap.peer_teaches || "Skills";
    youTeach = swap.peerLearns || swap.requester_teaches || "Knowledge";
  } else {
    partnerTeaches = swap.requester_teaches || swap.peerLearns || "Skills";
    youTeach = swap.peer_teaches || swap.peerTeaches || "Knowledge";
  }

  return {
    partnerName,
    partnerAvatar,
    partnerDept,
    partnerSem,
    isAi,
    partnerTeaches,
    youTeach,
    isRequester
  };
}

function getUserActiveSwaps() {
  if (!STATE.currentUser) {
    // When visiting as a guest, display mock seed swaps so visitors can explore the 4-phase state machine
    return STATE.activeSwaps.filter(s => s.status !== "CANCELLED");
  }
  // If current logged-in account is AI Aarav Patel (usr-1, the pre-seeded demo user), show his 4 demo swaps
  if (STATE.currentUser.id === "usr-1") {
    return STATE.activeSwaps.filter(s => {
      if (s.status === "CANCELLED") return false;
      const uId = s.userId || s.requester_id || s.requesterId;
      const pId = s.peerId || s.peer_id;
      return !uId || uId === "usr-1" || pId === "usr-1";
    });
  }
  // For any REAL user, strictly display ONLY their own swaps (proposals sent or received)
  const currId = STATE.currentUser.id;
  const currEmail = (STATE.currentUser.email || "").toLowerCase();
  return STATE.activeSwaps.filter(s => {
    if (s.status === "CANCELLED") return false;
    const uId = s.userId || s.requester_id || s.requesterId;
    const pId = s.peerId || s.peer_id;
    const uEmail = (s.userEmail || "").toLowerCase();
    const pEmail = (s.peerEmail || "").toLowerCase();
    return uId === currId || pId === currId || (currEmail && (uEmail === currEmail || pEmail === currEmail));
  });
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
      : '<i class="fa-solid fa-circle-check mr-1"></i> Real Student';
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

  // Reset password collapsible container
  const passContainer = document.getElementById("change-password-container");
  if (passContainer) {
    passContainer.classList.add("hidden");
    clearFieldErrors(passContainer);
  }
  const passChevron = document.getElementById("change-pass-chevron");
  if (passChevron) passChevron.classList.remove("rotate-180");
  const passToggleLabel = document.getElementById("change-pass-toggle-label");
  if (passToggleLabel) passToggleLabel.textContent = "Change Password";
  const currentPassInp = document.getElementById("edit-current-password");
  if (currentPassInp) currentPassInp.value = "";
  const newPassInp = document.getElementById("edit-new-password");
  if (newPassInp) newPassInp.value = "";
  const confirmPassInp = document.getElementById("edit-confirm-password");
  if (confirmPassInp) confirmPassInp.value = "";

  modal.classList.remove("hidden");
}

function closeEditProfileModal() {
  if (window.SoundFX) SoundFX.playPop();
  const modal = document.getElementById("edit-profile-modal");
  if (modal) modal.classList.add("hidden");

  // Clear password inputs on modal close
  const currentPassInp = document.getElementById("edit-current-password");
  if (currentPassInp) currentPassInp.value = "";
  const newPassInp = document.getElementById("edit-new-password");
  if (newPassInp) newPassInp.value = "";
  const confirmPassInp = document.getElementById("edit-confirm-password");
  if (confirmPassInp) confirmPassInp.value = "";
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
    // Logged Out / Guest Mode: Show Clean Log In on mobile, Sign Up on sm+ screens (Sign Up is in mobile drawer)
    container.innerHTML = `
      <a href="login.html#login" class="btn-glass text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-medium transition-all hover:text-white">Log In</a>
      <a href="login.html#signup" class="hidden sm:inline-flex btn-emerald text-xs px-4 py-2 rounded-xl font-bold items-center gap-1.5 shadow-lg shadow-emerald-500/25">
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
    // Logged In Mode: Render Clean Profile Chip, Karma Badge & Streamlined Dropdown
    container.innerHTML = `
      <!-- Quick Upload Button -->
      <button id="open-upload-modal-btn" class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25 transition-all">
        <i class="fa-solid fa-cloud-arrow-up text-indigo-400"></i>
        <span>Upload PYQ <strong class="text-amber-400 font-bold ml-0.5">+25&#9889;</strong></span>
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
            <p class="text-[10px] text-slate-400">${escapeHTML(user.semester || 'Semester 1')} &bull; ${escapeHTML((user.department || 'General').split(" ")[0])}</p>
          </div>
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-black">
            <i class="fa-solid fa-bolt text-amber-400 text-[11px]"></i>
            <span id="user-karma">${user.karma}</span>
          </div>
          <i class="fa-solid fa-chevron-down text-slate-400 text-[10px] ml-0.5"></i>
        </button>

        <!-- Streamlined Dropdown Menu (Clean, Modern, Uncluttered) -->
        <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-72 rounded-2xl user-dropdown p-3 z-50 shadow-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <!-- Profile Card -->
          <div class="flex items-center gap-3 pb-3 border-b border-white/10">
            <img src="${user.avatar || 'assets/images/avatar-default.jpg'}" alt="${escapeHTML(user.name)}" class="w-10 h-10 rounded-xl object-cover border border-white/20">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-bold text-white truncate">${escapeHTML(user.name)}</p>
                ${renderAiBadge(user.isAi, true)}
              </div>
              <p class="text-xs text-slate-400 font-mono truncate">${escapeHTML(user.email)}</p>
            </div>
          </div>

          <!-- Karma Wallet Status -->
          <div class="mt-2.5 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span class="text-xs text-amber-200 font-medium flex items-center gap-1.5">
              <i class="fa-solid fa-coins text-amber-400"></i> Karma Wallet
            </span>
            <span class="text-xs font-black font-mono text-amber-300">${user.karma} &#9889;</span>
          </div>

          <!-- Quick Navigation Links -->
          <div class="space-y-1 py-1">
            <button onclick="openEditProfileModal()" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              <i class="fa-solid fa-user-pen text-indigo-400 w-4 text-center"></i>
              <span>Edit Profile & Photo</span>
            </button>
            <button onclick="openTokenRefillModal()" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              <i class="fa-solid fa-bolt-lightning text-sky-400 w-4 text-center"></i>
              <span>Karma Refill & Rules</span>
            </button>
            <a href="#swaps-section" onclick="const d = document.getElementById('user-dropdown-menu'); if (d) d.classList.add('hidden');" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              <i class="fa-solid fa-arrows-rotate text-purple-400 w-4 text-center"></i>
              <span>My Active Swaps</span>
            </a>
            <a href="#pyq-section" onclick="const d = document.getElementById('user-dropdown-menu'); if (d) d.classList.add('hidden');" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              <i class="fa-solid fa-file-lines text-emerald-400 w-4 text-center"></i>
              <span>Browse PYQ Archive</span>
            </a>
          </div>

          <!-- Divider & Logout -->
          <div class="pt-2 mt-1 border-t border-white/10">
            <button onclick="logoutUser()" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer">
              <i class="fa-solid fa-arrow-right-from-bracket w-4 text-center"></i>
              <span>Log Out</span>
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
        <div class="p-3 rounded-xl bg-white/5 border border-white/10 mb-2.5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${user.avatar || 'assets/images/avatar-default.jpg'}" class="w-9 h-9 rounded-xl object-cover border border-white/20">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="text-xs font-bold text-white truncate">${escapeHTML(user.name)}</p>
                  ${renderAiBadge(user.isAi, true)}
                </div>
                <p class="text-[10px] text-slate-400 truncate">${escapeHTML(user.department || 'General')}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-black">
              <i class="fa-solid fa-bolt text-amber-400 text-[10px]"></i>
              <span>${user.karma}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <button onclick="openEditProfileModal()" class="w-full btn-glass text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-2 text-indigo-300 border-indigo-500/30">
            <i class="fa-solid fa-user-pen"></i> Edit Profile & Photo
          </button>
          <button onclick="logoutUser()" class="w-full py-2 rounded-xl text-rose-400 text-xs font-semibold bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors">
            <i class="fa-solid fa-arrow-right-from-bracket mr-1"></i> Log Out
          </button>
        </div>
      `;
    }
  }
}

// -----------------------------------------------------------------------------
// AUTH SYSTEM HELPERS & CLIENT-SIDE NAVIGATION
// -----------------------------------------------------------------------------
function setupAuthSystem() {
  checkAuthHash();
}

function openAuthModal(mode = "login") {
  window.location.href = mode === "signup" ? "login.html#signup" : "login.html#login";
}

function quickLoginDemo(email) {
  const accounts = STATE.accounts && STATE.accounts.length ? STATE.accounts : getStoredAccounts();
  const user = accounts.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
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
  showToast('Switched account to ' + user.name + ' (' + user.karma + ' Karma)', 'success', 'fa-user-check');
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
          <div class="mb-4 flex items-center gap-2 flex-wrap">
            ${paper.hasSolutions ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <i class="fa-solid fa-circle-check text-[10px]"></i> Solution Key Included
              </span>
            ` : `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                <i class="fa-solid fa-circle-question text-[10px]"></i> Question Only
              </span>
            `}
            <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/10" title="Permanent, verified academic archive (Tamper-proof)">
              <i class="fa-solid fa-shield-halved text-[9px] text-emerald-400"></i> Protected Vault
            </span>
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

  // Cloud synchronization with Supabase
  if (typeof DataManager !== "undefined" && typeof DataManager.updateSwap === "function") {
    DataManager.updateSwap(swap.id, { status: "ACCEPTED" }).catch(err => {
      console.warn("[CampusBarter Backend] Cloud swap accept note:", err.message);
    });
  }

  if (window.SoundFX) SoundFX.playSuccess();
  const display = resolveSwapDisplay(swap, STATE.currentUser);
  showToast(`Accepted swap with ${escapeHTML(display.partnerName)}! Schedule a session now.`, "success", "fa-circle-check");
}

async function declineSwap(swapId, btn = null) {
  const index = STATE.activeSwaps.findIndex(s => s.id === swapId);
  if (index === -1) return;

  const swap = STATE.activeSwaps[index];
  const display = resolveSwapDisplay(swap, STATE.currentUser);

  if (btn) {
    btn.classList.add("btn-mini-loading");
    btn.disabled = true;
    btn.innerHTML = `${createKineticSpinner(true)} <span>${display.isRequester ? 'Cancelling...' : 'Declining...'}</span>`;
    await new Promise(r => setTimeout(r, 300));
  }

  // Remove from active list
  STATE.activeSwaps.splice(index, 1);
  saveStoredSwaps(STATE.activeSwaps);
  renderActiveSwaps();
  updateSwapCounters();

  // Cloud synchronization with Supabase
  if (typeof DataManager !== "undefined") {
    if (typeof DataManager.deleteSwap === "function") {
      DataManager.deleteSwap(swapId).catch(err => {
        console.warn("[CampusBarter Backend] Cloud swap delete note:", err.message);
      });
    } else if (typeof DataManager.updateSwap === "function") {
      DataManager.updateSwap(swapId, { status: "CANCELLED" }).catch(err => {
        console.warn("[CampusBarter Backend] Cloud swap cancel note:", err.message);
      });
    }
  }

  const msg = display.isRequester 
    ? `Barter proposal to ${escapeHTML(display.partnerName)} cancelled.` 
    : `Declined barter proposal from ${escapeHTML(display.partnerName)}.`;
  showToast(msg, "info", "fa-circle-xmark");
}

function openScheduleModal(swapId) {
  const swap = STATE.activeSwaps.find(s => s.id === swapId);
  if (!swap) return;
  const modal = document.getElementById("schedule-modal");
  const swapIdInput = document.getElementById("schedule-swap-id");
  const summary = document.getElementById("modal-swap-summary");
  if (!modal) return;

  const display = resolveSwapDisplay(swap, STATE.currentUser);

  if (swapIdInput) swapIdInput.value = swap.id;
  if (summary) {
    summary.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${display.partnerAvatar || 'assets/images/avatar-default.jpg'}" class="w-10 h-10 rounded-xl object-cover border border-white/20">
        <div>
          <p class="text-sm font-bold text-white">${escapeHTML(display.partnerName)}</p>
          <p class="text-xs text-slate-300">Teaching: <span class="text-emerald-400 font-semibold">${escapeHTML(display.partnerTeaches)}</span></p>
          <p class="text-xs text-slate-300">Learning: <span class="text-indigo-400 font-semibold">${escapeHTML(display.youTeach)}</span></p>
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

  const display = resolveSwapDisplay(swap, STATE.currentUser);
  renderNavbarAuth();
  renderActiveSwaps();
  renderPeerProfiles();
  updateSwapCounters();
  updateGlobalStats();
  showToast(`Barter Completed! 🎉 +50 Karma to ${STATE.currentUser ? escapeHTML(STATE.currentUser.name) : 'You'} and +50 Karma to ${escapeHTML(display.partnerName)}!`, "success", "fa-gift");
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
    const display = resolveSwapDisplay(swap, STATE.currentUser);
    const partnerFirstName = (display.partnerName || 'Peer').split(" ")[0];
    const stepperHtml = generateStepperHTML(swap.status);
    const statusPills = {
      PENDING: '<span class="status-pill-pending"><i class="fa-solid fa-hourglass-half"></i><span>Pending</span></span>',
      ACCEPTED: '<span class="status-pill-accepted"><i class="fa-solid fa-check"></i><span>Accepted</span></span>',
      SCHEDULED: '<span class="status-pill-scheduled"><i class="fa-solid fa-calendar-days"></i><span>Scheduled</span></span>',
      COMPLETED: '<span class="status-pill-completed"><i class="fa-solid fa-circle-check"></i><span>Completed</span></span>'
    };

    let actionButtonsHtml = "";
    if (swap.status === "PENDING") {
      if (display.isRequester) {
        // Current user proposed this swap -> Waiting for peer to accept
        actionButtonsHtml = `
          <div class="flex items-center justify-between gap-2 pt-2">
            <div class="flex items-center gap-2 text-xs text-amber-400 font-medium py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-1 min-w-0">
              <i class="fa-solid fa-clock-rotate-left animate-spin text-[11px] shrink-0" style="animation-duration: 4s;"></i>
              <span class="truncate">Waiting for ${escapeHTML(partnerFirstName)} to accept...</span>
            </div>
            <button onclick="declineSwap('${swap.id}', this)" class="btn-glass text-xs py-2 px-3 rounded-xl font-medium text-slate-400 hover:text-rose-400 shrink-0 transition-colors" title="Cancel this barter proposal">
              <i class="fa-solid fa-xmark mr-1"></i>Cancel
            </button>
          </div>
        `;
      } else {
        // Current user received this swap -> Can Accept or Decline
        actionButtonsHtml = `
          <div class="flex items-center gap-2 pt-2">
            <button onclick="acceptSwap('${swap.id}', this)" class="btn-emerald text-xs py-2 px-3 rounded-xl font-medium flex-1 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20">
              <i class="fa-solid fa-check"></i> Accept Swap
            </button>
            <button onclick="declineSwap('${swap.id}', this)" class="btn-glass text-xs py-2 px-3 rounded-xl font-medium text-slate-300 hover:text-rose-400">Decline</button>
          </div>
        `;
      }
    } else if (swap.status === "ACCEPTED") {
      actionButtonsHtml = `
        <div class="pt-2">
          <button onclick="openScheduleModal('${swap.id}')" class="w-full btn-primary text-xs py-2 px-4 rounded-xl font-medium flex items-center justify-center gap-2">
            <i class="fa-solid fa-calendar-plus"></i> Schedule Meeting
          </button>
        </div>
      `;
    } else if (swap.status === "SCHEDULED") {
      const displayDate = swap.date || swap.session_date || "Date TBD";
      const displayTime = swap.time || swap.session_time || "Time TBD";
      const displayLocation = swap.location || "Campus Discussion Area";

      actionButtonsHtml = `
        <div class="flex flex-col gap-2 pt-2">
          <div class="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-2.5">
            <i class="fa-solid fa-clock text-purple-400 text-xs mt-0.5"></i>
            <div class="text-xs">
              <p class="font-bold text-white">${escapeHTML(displayDate)} @ ${escapeHTML(displayTime)}</p>
              <p class="text-purple-300 mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i> ${escapeHTML(displayLocation)}</p>
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
      <div class="glass-card p-4 sm:p-5 flex flex-col justify-between border-white/10 group">
        <div>
          <div class="flex items-start justify-between gap-2.5 mb-3.5">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <img src="${display.partnerAvatar}" class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border border-white/20 shrink-0" alt="${escapeHTML(display.partnerName)}">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h4 class="text-xs sm:text-sm font-bold text-white truncate max-w-[110px] xs:max-w-[140px] sm:max-w-none" title="${escapeHTML(display.partnerName || 'Peer')}">${escapeHTML(display.partnerName || 'Peer')}</h4>
                  ${renderAiBadge(display.isAi)}
                </div>
                <p class="text-[11px] sm:text-xs text-slate-400 truncate">${escapeHTML(display.partnerDept || 'Campus Student')} • ${escapeHTML(display.partnerSem || 'Sem 1')}</p>
              </div>
            </div>
            <div class="shrink-0 pt-0.5">${statusPills[swap.status] || ''}</div>
          </div>
          <div class="space-y-2 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400 flex items-center gap-1.5 truncate"><i class="fa-solid fa-chalkboard-user text-emerald-400 shrink-0"></i> <span class="truncate">${escapeHTML(partnerFirstName)} Teaches:</span></span>
              <span class="font-semibold text-emerald-300 ml-2 text-right truncate">${escapeHTML(display.partnerTeaches || 'Skills')}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400 flex items-center gap-1.5 truncate"><i class="fa-solid fa-graduation-cap text-indigo-400 shrink-0"></i> <span class="truncate">You Teach:</span></span>
              <span class="font-semibold text-indigo-300 ml-2 text-right truncate">${escapeHTML(display.youTeach || 'Knowledge')}</span>
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
    const resolvedUserSkills = resolveCollegiateSkills(user);
    const existingIndex = peersList.findIndex(p => p.id === user.id || (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()));
    if (existingIndex !== -1) {
      // Update data in place so latest changes are reflected immediately
      peersList[existingIndex] = {
        ...peersList[existingIndex],
        name: user.name,
        department: user.department,
        semester: user.semester,
        karma: user.karma,
        teachSkills: resolvedUserSkills.teach,
        learnSkills: resolvedUserSkills.learn,
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
        teachSkills: resolvedUserSkills.teach,
        learnSkills: resolvedUserSkills.learn
      });
    }
  }

  const filteredPeers = departmentFilter === "ALL" 
    ? peersList 
    : peersList.filter(p => p.department && p.department.toLowerCase().includes(departmentFilter.toLowerCase()));

  container.innerHTML = filteredPeers.map(peer => {
    const isSelf = STATE.currentUser && (peer.id === STATE.currentUser.id || (peer.email && STATE.currentUser.email && peer.email.toLowerCase() === STATE.currentUser.email.toLowerCase()));

    return `
      <div class="glass-card p-4 sm:p-5 flex flex-col justify-between glass-card-hover ${isSelf ? 'border-indigo-500/50 bg-indigo-950/25 ring-1 ring-indigo-500/30' : 'border-white/10'} group">
        <div>
          <div class="flex items-start justify-between gap-2.5 mb-3">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="relative shrink-0">
                <img src="${peer.avatar}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border border-white/20">
                <span class="absolute -bottom-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="text-sm sm:text-base font-bold text-white font-heading truncate max-w-[120px] xs:max-w-[150px] sm:max-w-none" title="${escapeHTML(peer.name)}">${escapeHTML(peer.name)}</h3>
                  ${isSelf ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm shrink-0 whitespace-nowrap"><i class="fa-solid fa-user-check mr-1"></i> You</span>' : renderAiBadge(peer.isAi, !peer.isAi)}
                </div>
                <p class="text-[11px] sm:text-xs text-slate-400 truncate">${escapeHTML(peer.department)} • ${escapeHTML(peer.semester)}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold shrink-0">
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

// =============================================================================
// ENHANCED SEARCHABLE PEER SELECTION ENGINE
// Supports dynamic keyword filtering across Real Students and AI Personas
// =============================================================================
function populatePeerDropdown(searchQuery = "", preselectedPeerId = null) {
  const peerSelect = document.getElementById("propose-target-peer");
  const countBadge = document.getElementById("propose-peer-count-badge");
  const clearBtn = document.getElementById("propose-peer-search-clear");
  const searchInput = document.getElementById("propose-peer-search-input");
  if (!peerSelect) return;

  // Toggle clear button
  if (clearBtn && searchInput) {
    if (searchInput.value.trim().length > 0) {
      clearBtn.classList.remove("hidden");
    } else {
      clearBtn.classList.add("hidden");
    }
  }

  // Exclude logged in user to strictly enforce no self-barters
  const eligiblePeers = (STATE.peers || []).filter(p => {
    if (!STATE.currentUser) return true;
    const isSelfId = p.id === STATE.currentUser.id;
    const isSelfEmail = p.email && STATE.currentUser.email && p.email.toLowerCase() === STATE.currentUser.email.toLowerCase();
    return !isSelfId && !isSelfEmail;
  });

  const query = (searchQuery || "").trim().toLowerCase();
  const filtered = query.length === 0 
    ? eligiblePeers 
    : eligiblePeers.filter(p => {
        const nameMatch = (p.name || "").toLowerCase().includes(query);
        const deptMatch = (p.department || "").toLowerCase().includes(query);
        const teachMatch = (p.teachSkills || []).some(s => s.toLowerCase().includes(query));
        const learnMatch = (p.learnSkills || []).some(s => s.toLowerCase().includes(query));
        const bioMatch = (p.bio || "").toLowerCase().includes(query);
        return nameMatch || deptMatch || teachMatch || learnMatch || bioMatch;
      });

  const realStudents = filtered.filter(p => !p.isAi);
  const aiPersonas = filtered.filter(p => p.isAi);

  if (countBadge) {
    if (query) {
      countBadge.innerHTML = `<span class="text-indigo-400 font-bold">${filtered.length}</span> found`;
    } else {
      countBadge.innerHTML = `<span class="text-slate-400">${realStudents.length} Students • ${aiPersonas.length} AI Demos</span>`;
    }
  }

  if (filtered.length === 0) {
    peerSelect.innerHTML = `<option value="">No peers found matching "${escapeHTML(query)}"</option>`;
    updateProposePeerPreview(null);
    return;
  }

  let html = `<option value="">-- Choose Peer to Barter With (${filtered.length} Available) --</option>`;

  if (realStudents.length > 0) {
    html += `<optgroup label="🎓 Registered College Students (${realStudents.length})">`;
    realStudents.forEach(p => {
      const dept = (p.department || "General").split(" ")[0];
      const skills = (p.teachSkills && p.teachSkills.length > 0) ? p.teachSkills.join(", ") : "General";
      html += `<option value="${escapeHTML(p.id)}">🎓 ${escapeHTML(p.name)} (${escapeHTML(dept)} • Teaches: ${escapeHTML(skills)})</option>`;
    });
    html += `</optgroup>`;
  }

  if (aiPersonas.length > 0) {
    html += `<optgroup label="🤖 AI Demo Practice Peers (${aiPersonas.length})">`;
    aiPersonas.forEach(p => {
      const dept = (p.department || "General").split(" ")[0];
      const skill = (p.teachSkills && p.teachSkills[0]) ? p.teachSkills[0] : "General";
      html += `<option value="${escapeHTML(p.id)}">🤖 ${escapeHTML(p.name)} (${escapeHTML(dept)} • Teaches: ${escapeHTML(skill)})</option>`;
    });
    html += `</optgroup>`;
  }

  peerSelect.innerHTML = html;

  if (preselectedPeerId) {
    peerSelect.value = preselectedPeerId;
  } else if (filtered.length === 1) {
    peerSelect.value = filtered[0].id;
  }

  updateProposePeerPreview(peerSelect.value);
}

// Dynamic preview card when choosing peer in the proposal modal
function updateProposePeerPreview(peerId) {
  const previewCard = document.getElementById("propose-peer-preview-card");
  const learnInput = document.getElementById("propose-learn-skill");
  const teachInput = document.getElementById("propose-teach-skill");
  if (!previewCard) return;

  if (!peerId) {
    previewCard.classList.add("hidden");
    previewCard.innerHTML = "";
    return;
  }

  const peer = (STATE.peers || []).find(p => p.id === peerId);
  if (!peer) {
    previewCard.classList.add("hidden");
    previewCard.innerHTML = "";
    return;
  }

  const badge = peer.isAi 
    ? `<span class="badge-ai-bot shrink-0 text-[10px]"><i class="fa-solid fa-robot mr-1"></i>AI Demo</span>`
    : `<span class="badge-real-user shrink-0 text-[10px]"><i class="fa-solid fa-circle-check mr-1"></i>Verified Student</span>`;

  const teachSkills = peer.teachSkills && peer.teachSkills.length > 0 ? peer.teachSkills : ["General Studies"];
  const teachBadges = teachSkills.map(s => 
    `<button type="button" class="btn-peer-teach-skill text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/40 hover:border-emerald-400 font-semibold cursor-pointer" data-skill="${escapeHTML(s)}" title="Click to auto-fill into 'Skill You Want'">
      <i class="fa-solid fa-plus text-[9px] mr-1"></i>${escapeHTML(s)}
    </button>`
  ).join(" ");

  previewCard.innerHTML = `
    <div class="relative shrink-0">
      <img src="${peer.avatar || 'assets/images/avatar-default.jpg'}" class="w-10 h-10 rounded-xl object-cover border border-white/20">
      <span class="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1 flex-wrap">
        <span class="font-bold text-xs text-white font-heading">${escapeHTML(peer.name)}</span>
        ${badge}
      </div>
      <p class="text-[11px] text-slate-400 mb-1.5">${escapeHTML(peer.department || 'General')} • ${escapeHTML(peer.semester || 'Sem 1')}</p>
      <div class="flex flex-col gap-1">
        <span class="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Skills Offered (Click to choose):</span>
        <div class="flex flex-wrap gap-1">
          ${teachBadges}
        </div>
      </div>
    </div>
  `;
  previewCard.classList.remove("hidden");

  // Auto-fill or suggest primary skill if input is empty
  if (learnInput && !learnInput.value.trim() && teachSkills.length > 0) {
    learnInput.value = teachSkills[0];
  }
  if (teachInput && !teachInput.value.trim() && STATE.currentUser && STATE.currentUser.teachSkills && STATE.currentUser.teachSkills.length > 0) {
    teachInput.value = STATE.currentUser.teachSkills[0];
  }

  // Bind click handlers to quick-select pills
  previewCard.querySelectorAll(".btn-peer-teach-skill").forEach(btn => {
    btn.addEventListener("click", () => {
      const skill = btn.getAttribute("data-skill");
      if (skill && learnInput) {
        learnInput.value = skill;
        if (window.SoundFX) SoundFX.playPop();
        learnInput.focus();
        showToast(`Selected "${skill}" as skill you want from ${peer.name}!`, "info", "fa-graduation-cap");
      }
    });
  });
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
  const searchInput = document.getElementById("propose-peer-search-input");
  if (!modal) return;
  if (searchInput) searchInput.value = "";
  populatePeerDropdown("", peerId);
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
      const searchInput = document.getElementById("propose-peer-search-input");
      if (searchInput) searchInput.value = "";
      populatePeerDropdown("");
      if (proposeModal) proposeModal.classList.remove("hidden");
      // Trigger background sync to fetch latest registered peers from cloud
      syncPeersFromCloud();
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
  // LIVE PEER SEARCH & AUTO-PREVIEW HANDLERS
  // ---------------------------------------------------------------------------
  const peerSearchInput = document.getElementById("propose-peer-search-input");
  const peerSearchClear = document.getElementById("propose-peer-search-clear");
  const peerSelect = document.getElementById("propose-target-peer");

  if (peerSearchInput) {
    peerSearchInput.addEventListener("input", (e) => {
      populatePeerDropdown(e.target.value);
    });
  }

  if (peerSearchClear && peerSearchInput) {
    peerSearchClear.addEventListener("click", () => {
      peerSearchInput.value = "";
      populatePeerDropdown("");
      peerSearchInput.focus();
    });
  }

  if (peerSelect) {
    peerSelect.addEventListener("change", (e) => {
      updateProposePeerPreview(e.target.value);
    });
  }

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

      // Synchronize barter proposal into Supabase Cloud Swaps
      let cloudSwap = null;
      if (typeof DataManager !== "undefined" && typeof DataManager.createSwap === "function" && STATE.currentUser) {
        try {
          cloudSwap = await DataManager.createSwap({
            requester_id: STATE.currentUser.id,
            peer_id: peer.id,
            requester_teaches: teachSkill,
            peer_teaches: learnSkill,
            notes: pitch
          });
        } catch (err) {
          console.warn("[CampusBarter Backend] Cloud swap sync warning:", err);
        }
      }

      const newSwap = {
        id: (cloudSwap && cloudSwap.id) ? cloudSwap.id : `swp-${Date.now()}`,
        userId: STATE.currentUser ? STATE.currentUser.id : "usr-guest",
        userName: STATE.currentUser ? STATE.currentUser.name : "You",
        userAvatar: STATE.currentUser ? (STATE.currentUser.avatar || "assets/images/avatar-default.jpg") : "assets/images/avatar-default.jpg",
        userEmail: STATE.currentUser ? STATE.currentUser.email : "",
        requester_id: STATE.currentUser ? STATE.currentUser.id : null,
        peer_id: peer.id,
        peerId: peer.id,
        peerName: peer.name,
        peerEmail: peer.email || "",
        isAi: peer.isAi || false,
        peerAvatar: peer.avatar || "assets/images/avatar-default.jpg",
        peerDepartment: peer.department || "General Studies",
        peerSemester: peer.semester || "Semester 1",
        peerTeaches: learnSkill,
        peerLearns: teachSkill,
        requester_teaches: teachSkill,
        peer_teaches: learnSkill,
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
      const pSearch = document.getElementById("propose-peer-search-input");
      if (pSearch) pSearch.value = "";
      updateProposePeerPreview(null);

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

      // Cloud synchronization with Supabase
      if (typeof DataManager !== "undefined" && typeof DataManager.updateSwap === "function") {
        DataManager.updateSwap(swap.id, {
          status: "SCHEDULED",
          session_date: date,
          session_time: time,
          location: location,
          notes: notes || swap.notes || ""
        }).catch(err => {
          console.warn("[CampusBarter Backend] Cloud schedule sync note:", err.message);
        });
      }

      hideEnergyBeam(scheduleForm);
      setButtonLoading(submitBtn, false);
      document.getElementById("schedule-modal").classList.add("hidden");
      scheduleForm.reset();
      if (window.SoundFX) SoundFX.playSuccess();
      const schedDisplay = resolveSwapDisplay(swap, STATE.currentUser);
      showToast(`Meeting scheduled with ${escapeHTML(schedDisplay.partnerName)} for ${escapeHTML(date)}!`, "success", "fa-calendar-check");
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

      // =====================================================================
      // STRICT DEDUPLICATION & ANTI-FARMING ENGINE:
      // Prevent duplicate paper uploads for the exact same subject/code,
      // semester, exam type, and year. Protects repository from clutter and
      // blocks users from gaming the +25 Karma reward system.
      // =====================================================================
      if (!hasError) {
        const cleanCode = code.replace(/[\s-_]/g, "");
        const cleanSubject = subject.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanSem = semester.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanExam = examType.toLowerCase().replace(/[^a-z0-9]/g, "");

        const existingDuplicate = (STATE.pyqs || []).find(p => {
          const pCode = (p.code || "").toUpperCase().replace(/[\s-_]/g, "");
          const pSubj = (p.subject || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const pSem = (p.semester || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const pExam = (p.examType || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const pYear = parseInt(p.year, 10);

          // Academic match: Same course code OR same subject name
          const isSameCourse = (cleanCode && pCode && cleanCode === pCode) ||
                               (cleanSubject && pSubj && (cleanSubject === pSubj || cleanSubject.includes(pSubj) || pSubj.includes(cleanSubject)));

          // Exam context match: Same exam type (CIA-1, CIA-2, Semester End) + same year + same semester
          const isSameExam = cleanExam === pExam;
          const isSameYear = pYear === year;
          const isSameSem = cleanSem === pSem;

          // File name match (if local file selected and existing record has fileName)
          const isSameFileName = currentSelectedFile && p.fileName && p.fileName.toLowerCase() === currentSelectedFile.name.toLowerCase();

          return (isSameCourse && isSameExam && isSameYear && isSameSem) || isSameFileName;
        });

        if (existingDuplicate) {
          hasError = true;
          const dupLabel = `${existingDuplicate.subject} (${existingDuplicate.code}) • ${existingDuplicate.semester} • ${existingDuplicate.examType} ${existingDuplicate.year}`;
          showFieldError(codeInput, "Duplicate paper! This exam already exists in the Academic Vault.");
          showFieldError(subjectInput, "Paper already archived in vault.");
          if (!firstErrorField) firstErrorField = codeInput;

          if (window.SoundFX) SoundFX.playError();
          showToast(`Duplicate Rejected! An official paper for "${dupLabel}" already exists in the Academic Vault. Duplicate uploads and +25⚡ Karma farming are blocked to maintain repository integrity.`, "error", "fa-triangle-exclamation");

          // Focus & filter grid to show existing paper so user can download it instead
          const searchInput = document.getElementById("pyq-search-input");
          if (searchInput) {
            searchInput.value = existingDuplicate.code || existingDuplicate.subject;
            filterAndRenderPYQs();
          }
        }
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
        fileName: currentSelectedFile ? currentSelectedFile.name : null,
        isProtected: true,
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

  // ---------------------------------------------------------------------------
  // PROFILE MODAL: ACCOUNT SECURITY / CHANGE PASSWORD HANDLERS
  // ---------------------------------------------------------------------------
  const togglePassBtn = document.getElementById("toggle-change-password-btn");
  const passContainer = document.getElementById("change-password-container");
  const passChevron = document.getElementById("change-pass-chevron");
  const passToggleLabel = document.getElementById("change-pass-toggle-label");

  if (togglePassBtn && passContainer) {
    togglePassBtn.addEventListener("click", () => {
      const isHidden = passContainer.classList.contains("hidden");
      if (isHidden) {
        passContainer.classList.remove("hidden");
        if (passChevron) passChevron.classList.add("rotate-180");
        if (passToggleLabel) passToggleLabel.textContent = "Hide Section";
        if (window.SoundFX) SoundFX.playPop();
      } else {
        passContainer.classList.add("hidden");
        if (passChevron) passChevron.classList.remove("rotate-180");
        if (passToggleLabel) passToggleLabel.textContent = "Change Password";
        if (window.SoundFX) SoundFX.playPop();
      }
    });
  }

  const updatePassBtn = document.getElementById("btn-update-password");
  if (updatePassBtn) {
    updatePassBtn.addEventListener("click", async () => {
      const user = STATE.currentUser;
      if (!user) {
        showToast("Please log in first to change your password!", "warning", "fa-user-lock");
        return;
      }

      const currentPassInp = document.getElementById("edit-current-password");
      const newPassInp = document.getElementById("edit-new-password");
      const confirmPassInp = document.getElementById("edit-confirm-password");

      const currentPass = currentPassInp ? currentPassInp.value : "";
      const newPass = newPassInp ? newPassInp.value : "";
      const confirmPass = confirmPassInp ? confirmPassInp.value : "";

      if (passContainer) clearFieldErrors(passContainer);

      let hasError = false;
      let firstErrorField = null;

      // Verify current password if user has one stored
      if (user.password) {
        if (!currentPass) {
          showFieldError(currentPassInp, "Please enter your current password");
          hasError = true;
          firstErrorField = currentPassInp;
        } else if (String(currentPass) !== String(user.password)) {
          showFieldError(currentPassInp, "Current password does not match!");
          hasError = true;
          firstErrorField = currentPassInp;
        }
      }

      if (!newPass) {
        showFieldError(newPassInp, "Please enter a new password");
        hasError = true;
        if (!firstErrorField) firstErrorField = newPassInp;
      } else if (newPass.length < 4) {
        showFieldError(newPassInp, "New password must be at least 4 characters");
        hasError = true;
        if (!firstErrorField) firstErrorField = newPassInp;
      } else if (user.password && newPass === user.password) {
        showFieldError(newPassInp, "New password must be different from current password");
        hasError = true;
        if (!firstErrorField) firstErrorField = newPassInp;
      }

      if (!confirmPass) {
        showFieldError(confirmPassInp, "Please confirm your new password");
        hasError = true;
        if (!firstErrorField) firstErrorField = confirmPassInp;
      } else if (newPass !== confirmPass) {
        showFieldError(confirmPassInp, "Passwords do not match");
        hasError = true;
        if (!firstErrorField) firstErrorField = confirmPassInp;
      }

      if (hasError) {
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      setButtonLoading(updatePassBtn, true, "Updating Password...");

      try {
        // 1. Update in-memory user
        user.password = newPass;
        setStoredCurrentUser(user);

        // 2. Update in accounts array & localStorage
        const accounts = getStoredAccounts();
        const accIdx = accounts.findIndex(a => a.id === user.id || (a.email && a.email.toLowerCase() === user.email.toLowerCase()));
        if (accIdx !== -1) {
          accounts[accIdx].password = newPass;
        } else {
          accounts.push(user);
        }
        saveStoredAccounts(accounts);
        STATE.accounts = accounts;

        // 3. Sync to Supabase Cloud if online
        if (typeof DataManager !== "undefined" && typeof DataManager.updatePassword === "function") {
          try {
            await DataManager.updatePassword(user.email, newPass);
          } catch (cloudErr) {
            console.warn("Cloud password sync warning:", cloudErr.message);
          }
        }

        await new Promise(r => setTimeout(r, 400));
        setButtonLoading(updatePassBtn, false);

        // Clear inputs & collapse section
        if (currentPassInp) currentPassInp.value = "";
        if (newPassInp) newPassInp.value = "";
        if (confirmPassInp) confirmPassInp.value = "";
        if (passContainer) passContainer.classList.add("hidden");
        if (passChevron) passChevron.classList.remove("rotate-180");
        if (passToggleLabel) passToggleLabel.textContent = "Change Password";

        if (window.SoundFX) SoundFX.playSuccess();
        showToast("Password updated successfully! 🔒 Keep it safe.", "success", "fa-shield-halved");

      } catch (err) {
        setButtonLoading(updatePassBtn, false);
        if (window.SoundFX) SoundFX.playError();
        showToast("Failed to update password: " + err.message, "error", "fa-triangle-exclamation");
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
  let audioUnlocked = false;

  const tryUnlockAudio = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    if (window.SoundFX) {
      SoundFX.init();
      SoundFX.playLoaderStart();
    }
    if (audioPrompt) {
      audioPrompt.innerHTML = `
        <span class="preloader-audio-icon-wrap text-emerald-400">
          <i class="fa-solid fa-volume-high"></i>
        </span>
        <span class="preloader-audio-text font-bold text-white">Sound Initialized! <i class="fa-solid fa-check ml-1 text-emerald-400"></i></span>
      `;
      audioPrompt.classList.add("border-emerald-400");
    }
  };

  if (audioPrompt) {
    audioPrompt.addEventListener("click", (e) => {
      e.stopPropagation();
      tryUnlockAudio();
    });
  }

  // Also unlock audio on user gesture anywhere on preloader
  preloader.addEventListener("pointerdown", () => {
    tryUnlockAudio();
  }, { once: true });

  const finishPreloader = () => {
    if (isCompleted) return;
    isCompleted = true;

    if (progressBar) progressBar.style.width = "100%";
    if (pctText) pctText.textContent = "100%";
    if (statusText) statusText.textContent = "Welcome to CampusBarter!";

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
      try { preloader.remove(); } catch (e) {}
    }, 400);
  };

  if (skipBtn) {
    skipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      finishPreloader();
    });
  }

  // Keyboard shortcut to skip preloader
  const handleKeydown = (e) => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      window.removeEventListener("keydown", handleKeydown);
      finishPreloader();
    }
  };
  window.addEventListener("keydown", handleKeydown);

  // Cinematic 4-stage loading sequence with SoundFX audio cues (~2.4s total)
  const steps = [
    { pct: 28, text: "Syncing verified campus peers...", delay: 400 },
    { pct: 58, text: "Indexing decentralized paper vaults...", delay: 1000 },
    { pct: 86, text: "Securing student barter handshake...", delay: 1650 },
    { pct: 100, text: "Welcome to CampusBarter!", delay: 2200 }
  ];

  steps.forEach(step => {
    setTimeout(() => {
      if (isCompleted) return;
      if (progressBar) progressBar.style.width = `${step.pct}%`;
      if (pctText) pctText.textContent = `${step.pct}%`;
      if (statusText) statusText.textContent = step.text;

      if (window.SoundFX) {
        if (step.pct === 100) {
          SoundFX.playLoaderComplete();
        } else {
          SoundFX.updateLoaderProgress(step.pct);
        }
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
  const navBadge = document.getElementById("nav-refill-badge");
  const navPill = document.getElementById("token-refill-pill");
  const mobileTimer = document.getElementById("mobile-refill-timer");
  const dropTimer = document.getElementById("dropdown-refill-timer");
  const dropProgress = document.getElementById("dropdown-refill-progress");
  const modal = document.getElementById("token-refill-modal");
  const modalTimer = document.getElementById("modal-refill-countdown");
  const modalProgress = document.getElementById("modal-refill-progress");
  const modalStatus = document.getElementById("modal-refill-status");

  // RULE: If balance is at or above 120 Karma, refill is paused at max cap
  if (user.karma >= MAX_REFILL_CAP) {
    user.lastRefillTime = Date.now();

    if (navTimer && navTimer.textContent !== "120 Max (Full)") {
      navTimer.textContent = "120 Max (Full)";
      if (navBadge) navBadge.textContent = "Paused";
      if (navPill) {
        navPill.title = `Karma Refill Paused: Balance (${user.karma} Karma) is at or above the 120 Karma cap. Refill resumes if balance drops below 120.`;
      }
    }

    if (modal && !modal.classList.contains("hidden")) {
      if (modalTimer && modalTimer.textContent !== "120 CAP REACHED") {
        modalTimer.textContent = "120 CAP REACHED";
        modalTimer.className = "text-2xl sm:text-3xl font-black font-mono text-emerald-400 my-1";
        if (modalProgress) {
          modalProgress.style.width = "100%";
          modalProgress.className = "bg-emerald-400 h-full w-full transition-all duration-500";
        }
        if (modalStatus) {
          modalStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Refill Paused &bull; Balance (${user.karma} Karma) is at or above 120 cap</span>`;
        }
      }
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

// Expose core action handlers to global window for DevTools & automated QA suites
window.downloadPYQ = downloadPYQ;
window.previewPYQ = previewPYQ;
window.acceptSwap = acceptSwap;
window.declineSwap = declineSwap;
window.completeSwap = completeSwap;
window.openScheduleModal = openScheduleModal;
window.proposeSwapToPeer = proposeSwapToPeer;
window.populatePeerDropdown = populatePeerDropdown;
window.updateProposePeerPreview = updateProposePeerPreview;
window.renderNavbarAuth = renderNavbarAuth;
window.renderPeerProfiles = renderPeerProfiles;
window.renderActiveSwaps = renderActiveSwaps;
window.filterAndRenderPYQs = filterAndRenderPYQs;
window.updateGlobalStats = updateGlobalStats;
window.updateSwapCounters = updateSwapCounters;
window.showToast = showToast;
window.playSFX = function(type) {
  if (!window.SoundFX) return;
  if (type === 'success') SoundFX.playSuccess();
  else if (type === 'error') SoundFX.playError();
  else if (type === 'whoosh') SoundFX.playWhoosh();
  else if (type === 'pop') SoundFX.playPop();
  else SoundFX.playClick(type || 'glass');
};

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

  // 6. Asynchronous Real Peer & Cloud Sync (Fetches all registered students)
  try { syncPeersFromCloud(); } catch (e) { console.warn("[Cloud Peer Sync]", e); }

  // 7. Asynchronous Real Swaps Cloud Sync & Realtime Channel
  try { 
    syncSwapsFromCloud(); 
    setupSwapsRealtime(); 
  } catch (e) { 
    console.warn("[Cloud Swap Sync]", e); 
  }
}

// Automatically refresh real peer profiles and barter proposals when student returns to tab
window.addEventListener("focus", () => {
  if (typeof syncPeersFromCloud === "function") {
    syncPeersFromCloud();
  }
  if (typeof syncSwapsFromCloud === "function") {
    syncSwapsFromCloud();
  }
});

// Periodic background heartbeat to synchronize barter proposals across student devices every 7 seconds
setInterval(() => {
  if (typeof syncSwapsFromCloud === "function" && STATE.currentUser) {
    syncSwapsFromCloud();
  }
}, 7000);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}