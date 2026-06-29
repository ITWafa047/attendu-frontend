// =====================================================================
// components/navbar.js
// Renders the top navbar into #navbar: mobile sidebar toggle, page
// title, current user info, and logout button.
//
// Usage:
//   renderNavbar("Dashboard");
// =====================================================================

const NAVBAR_ICONS = {
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

/**
 * Renders the navbar for the current page.
 * @param {string} pageTitle - e.g. "Dashboard", "Students"
 */
function renderNavbar(pageTitle) {
    const container = document.getElementById("navbar");
    if (!container) return;

    const user = getCurrentUser();
    const name = user?.name || "User";
    const role = user?.role || "";
    const initials = name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    container.innerHTML = `
        <button class="navbar-toggle" data-sidebar-toggle aria-label="Toggle menu" onclick="toggleSidebar()">
            ${NAVBAR_ICONS.menu}
        </button>

        <h1 class="navbar-title">${pageTitle}</h1>

        <div class="navbar-user">
            <div class="navbar-user-info">
                <span class="navbar-user-name">${name}</span>
                <span class="navbar-user-role">${role}</span>
            </div>
            <div class="navbar-avatar">${initials}</div>
            <button class="navbar-logout" id="navbar-logout-btn" aria-label="Logout">
                ${NAVBAR_ICONS.logout}
            </button>
        </div>
    `;

    document.getElementById("navbar-logout-btn").addEventListener("click", () => {
        logout();
    });
}

/**
 * Convenience wrapper — call this once at the top of every protected
 * page's own <script> block instead of calling renderSidebar()/
 * renderNavbar() separately.
 *
 *   guardPage(["admin"]);
 *   renderAppShell({ activeKey: "students", pageTitle: "Students" });
 *
 * @param {{activeKey: string, pageTitle: string}} options
 */
function renderAppShell({ activeKey, pageTitle }) {
    renderSidebar(activeKey);
    renderNavbar(pageTitle);
}