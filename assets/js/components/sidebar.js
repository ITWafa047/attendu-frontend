// =====================================================================
// components/sidebar.js
// Renders the role-based sidebar menu into #sidebar.
// Also owns toggleSidebar() — called by navbar.js's mobile hamburger.
//
// Usage (see core/auth.js for where role comes from):
//   renderSidebar("dashboard"); // highlights the "dashboard" link as active
// =====================================================================

const SIDEBAR_ICONS = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
    students: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    courses: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    groups: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    sessions: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    policies: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    warnings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

const SIDEBAR_MENUS = {
    admin: [
        { key: "dashboard", label: "Dashboard", href: "dashboard.html", icon: SIDEBAR_ICONS.dashboard },
        { key: "students", label: "Students", href: "students.html", icon: SIDEBAR_ICONS.students },
        { key: "courses", label: "Courses", href: "courses.html", icon: SIDEBAR_ICONS.courses },
        { key: "groups", label: "Groups", href: "groups.html", icon: SIDEBAR_ICONS.groups },
        { key: "sessions", label: "Sessions", href: "sessions.html", icon: SIDEBAR_ICONS.sessions },
        { key: "policies", label: "Attendance Policies", href: "policies.html", icon: SIDEBAR_ICONS.policies },
        { key: "warnings", label: "Warnings", href: "warnings.html", icon: SIDEBAR_ICONS.warnings },
        { key: "reports", label: "Reports", href: "reports.html", icon: SIDEBAR_ICONS.reports },
        { key: "users", label: "Instructors", href: "users.html", icon: SIDEBAR_ICONS.users },
    ],
    instructor: [
        { key: "dashboard", label: "Dashboard", href: "dashboard.html", icon: SIDEBAR_ICONS.dashboard },
        { key: "sessions", label: "Sessions", href: "sessions.html", icon: SIDEBAR_ICONS.sessions },
    ],
};

/**
 * Renders the sidebar for the current user's role into #sidebar.
 * @param {string} activeKey - matches a SIDEBAR_MENUS[role][].key, e.g. "dashboard"
 */
function renderSidebar(activeKey) {
    const container = document.getElementById("sidebar");
    if (!container) return;

    const user = getCurrentUser();
    const role = user?.role || "instructor";
    const menu = SIDEBAR_MENUS[role] || SIDEBAR_MENUS.instructor;

    const itemsHtml = menu
        .map(
            (item) => `
        <a href="${item.href}" class="sidebar-link ${item.key === activeKey ? "active" : ""}">
            <span class="sidebar-icon">${item.icon}</span>
            <span class="sidebar-label">${item.label}</span>
        </a>
    `
        )
        .join("");

    container.innerHTML = `
        <div class="sidebar-brand">
            <span class="sidebar-brand-mark">A</span>
            <span class="sidebar-brand-name">AttendU</span>
        </div>
        <nav class="sidebar-nav">${itemsHtml}</nav>
    `;
}

/** Opens/closes the off-canvas sidebar drawer on mobile. */
function toggleSidebar() {
    document.body.classList.toggle("sidebar-open");
}

// Close the mobile drawer on outside click (including the dimmed backdrop)...
document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("sidebar-open")) return;
    const sidebar = document.getElementById("sidebar");
    const isToggleBtn = e.target.closest("[data-sidebar-toggle]");
    if (sidebar && !sidebar.contains(e.target) && !isToggleBtn) {
        document.body.classList.remove("sidebar-open");
    }
});

// ...and on Escape.
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.body.classList.remove("sidebar-open");
    }
});