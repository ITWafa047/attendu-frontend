// =====================================================================
// pages/dashboard.js
// Dashboard: loads stats from /dashboard/stats and renders cards + recent activity.
// =====================================================================

async function initDashboardPage() {
    await loadDashboardStats();
}

async function loadDashboardStats() {
    showLoader();

    try {
        const response = await laravelRequest(Laravel.dashboard.stats);
        // Expected shape: { success: bool, data: { total_students, total_courses, total_groups, total_sessions, total_instructors, attendance_rate, recent_activity: [...] } }
        const data = response.data || {};

        renderStats(data);
        renderRecentActivity(data.recent_activity || []);
        updateLastUpdated();
    } catch (err) {
        console.error("Failed to load dashboard stats:", err);
        showToast(err.message || "Could not load dashboard data", "error");
        // Show empty state
        renderStats({});
        renderRecentActivity([]);
    } finally {
        hideLoader();
    }
}

function renderStats(data) {
    const container = document.getElementById("dashboard-stats");
    // Define stat cards with labels, keys, and icon/color classes
    const statDefs = [
        { label: "Students", key: "total_students", className: "students", default: 0 },
        { label: "Courses", key: "total_courses", className: "courses", default: 0 },
        { label: "Groups", key: "total_groups", className: "groups", default: 0 },
        { label: "Sessions", key: "total_sessions", className: "sessions", default: 0 },
        { label: "Instructors", key: "total_instructors", className: "instructors", default: 0 },
        { label: "Attendance Rate", key: "attendance_rate", className: "rate", default: "0%", suffix: "%" },
    ];

    let html = "";
    for (const def of statDefs) {
        let value = data[def.key] ?? def.default;
        if (def.key === "attendance_rate" && typeof value === "number") {
            value = value.toFixed(1) + "%";
        } else if (def.suffix && typeof value === "number") {
            value = value + def.suffix;
        }
        html += `
            <div class="stat-card ${def.className}">
                <span class="stat-number">${value}</span>
                <span class="stat-label">${def.label}</span>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderRecentActivity(activities) {
    const tbody = document.getElementById("dashboard-recent-tbody");

    if (!activities || activities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 2rem; color: var(--muted);">No recent activity</td></tr>`;
        return;
    }

    let html = "";
    for (const activity of activities) {
        const type = activity.type || "session";
        const typeClass = `activity-type-${type}`;
        const description = activity.description || activity.title || "—";
        const time = activity.time ? formatDateTime(activity.time) : "—";

        html += `
            <tr>
                <td><span class="activity-type-badge ${typeClass}">${escapeHtml(type)}</span></td>
                <td>${escapeHtml(description)}</td>
                <td class="activity-time-col">${time}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function updateLastUpdated() {
    const now = new Date();
    const formatted = formatDateTime(now.toISOString());
    document.getElementById("dashboard-last-updated").textContent = `Last updated: ${formatted}`;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}