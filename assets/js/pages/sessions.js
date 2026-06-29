// =====================================================================
// pages/sessions.js (updated)
// Sessions list: search, pagination, table rendering, delete flow,
// plus start session action.
// Depends on sessionForm.js.
// =====================================================================

const SESSIONS_PAGE_STATE = {
    currentPage: 1,
    perPage: 15,
    total: 0,
    search: "",
    data: [],
};

async function initSessionsPage() {
    document.getElementById("add-session-btn").addEventListener("click", () => {
        openSessionModal("add");
    });

    const searchInput = document.getElementById("search-sessions");
    searchInput.addEventListener("input", debounce((e) => {
        SESSIONS_PAGE_STATE.search = e.target.value.trim();
        SESSIONS_PAGE_STATE.currentPage = 1;
        loadSessions();
    }, 400));

    document.addEventListener("sessions:changed", () => {
        loadSessions();
    });

    await loadSessions();
}

async function loadSessions() {
    showLoader();

    const params = {
        page: SESSIONS_PAGE_STATE.currentPage,
        per_page: SESSIONS_PAGE_STATE.perPage,
        search: SESSIONS_PAGE_STATE.search || undefined,
    };

    const query = buildQueryString(params);

    try {
        const response = await laravelRequest(`${Laravel.sessions.index}${query}`);
        const sessions = response.data || [];
        const meta = response.meta || { total: 0, current_page: 1, per_page: SESSIONS_PAGE_STATE.perPage };
        SESSIONS_PAGE_STATE.data = sessions;
        SESSIONS_PAGE_STATE.total = meta.total || 0;
        SESSIONS_PAGE_STATE.currentPage = meta.current_page || 1;
        SESSIONS_PAGE_STATE.perPage = meta.per_page || SESSIONS_PAGE_STATE.perPage;

        renderSessionsTable(sessions);
        renderSessionsPagination();
    } catch (err) {
        console.error("Failed to load sessions:", err);
        showToast(err.message || "Could not load sessions", "error");
        SESSIONS_PAGE_STATE.data = [];
        renderSessionsTable([]);
        renderSessionsPagination();
    } finally {
        hideLoader();
    }
}

function renderSessionsTable(sessions) {
    const container = document.getElementById("sessions-table-container");
    const user = getCurrentUser();
    const isInstructor = user && user.role === "instructor";

    if (!sessions || sessions.length === 0) {
        container.innerHTML = `
            <div class="table-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21v-12" />
                </svg>
                <p class="table-empty-title">No sessions found</p>
                <p class="table-empty-hint">Create a new session to get started.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-wrapper">
            <table class="table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Course</th>
                        <th>Group</th>
                        <th>Instructor</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Status</th>
                        <th style="width: 120px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const session of sessions) {
        const title = session.title || "Untitled";
        const course = session.course_name || "—";
        const group = session.group_name || "—";
        const instructor = session.instructor_name || session.instructor_email || "—";
        const start = session.start_time ? formatDateTime(session.start_time) : "—";
        const end = session.end_time ? formatDateTime(session.end_time) : "—";
        const status = session.status || "scheduled";
        const statusClass = `session-status-${status}`;

        // Start button only for instructors and if status is scheduled
        const canStart = isInstructor && status === "scheduled";

        html += `
            <tr>
                <td class="session-title-col">${escapeHtml(title)}</td>
                <td>${escapeHtml(course)}</td>
                <td>${escapeHtml(group)}</td>
                <td>${escapeHtml(instructor)}</td>
                <td class="session-time-col">${start}</td>
                <td class="session-time-col">${end}</td>
                <td><span class="session-status-badge ${statusClass}">${escapeHtml(status)}</span></td>
                <td>
                    ${canStart ? `<button class="btn btn-sm btn-success start-session-btn" data-id="${session.id}" data-title="${escapeHtml(title)}">Start</button>` : ""}
                    <button class="table-action-btn edit-session-btn" data-id="${session.id}" title="Edit">
                        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2L18 6L7 17H3V13L14 2Z" />
                        </svg>
                    </button>
                    <button class="table-action-btn table-action-danger delete-session-btn" data-id="${session.id}" data-title="${escapeHtml(title)}" title="Delete">
                        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h14M8 6V4h4v2M6 18h8a1 1 0 0 0 1-1V7H5v10a1 1 0 0 0 1 1Z" />
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    // ---- Wire edit buttons ----
    container.querySelectorAll(".edit-session-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id);
            try {
                const response = await laravelRequest(Laravel.sessions.show(id));
                const session = response.data;
                if (session) {
                    openSessionModal("edit", session);
                } else {
                    showToast("Session not found", "error");
                }
            } catch (err) {
                showToast(err.message || "Could not load session details", "error");
            }
        });
    });

    // ---- Wire delete buttons ----
    container.querySelectorAll(".delete-session-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const title = btn.dataset.title;
            openDeleteSessionModal(id, title);
        });
    });

    // ---- Wire start buttons ----
    container.querySelectorAll(".start-session-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id);
            const title = btn.dataset.title;
            try {
                // Find the session data to get start_time and end_time
                const session = SESSIONS_PAGE_STATE.data.find(s => s.id === id);
                if (!session) {
                    showToast("Session not found", "error");
                    return;
                }
                // Prepare payload: start_time and end_time from session
                // If the session doesn't have start_time/end_time, we can use current time and add 1 hour as default
                let startTime = session.start_time;
                let endTime = session.end_time;
                if (!startTime || !endTime) {
                    // fallback: start now, end in 1 hour
                    const now = new Date();
                    startTime = now.toISOString();
                    const oneHourLater = new Date(now.getTime() + 3600000);
                    endTime = oneHourLater.toISOString();
                }
                const payload = {
                    session_schedule_id: id,
                    start_time: startTime,
                    end_time: endTime,
                };
                const response = await laravelRequest(Laravel.sessions.start, {
                    method: "POST",
                    body: payload,
                });
                if (response.success) {
                    showToast("Session started successfully", "success");
                    // Redirect to live-session.html with the session ID
                    window.location.href = `live-session.html?id=${id}`;
                } else {
                    showToast(response.message || "Failed to start session", "error");
                }
            } catch (err) {
                console.error("Error starting session:", err);
                showToast(err.message || "Failed to start session", "error");
            }
        });
    });
}

// ... (rest of sessions.js unchanged: renderPagination, delete flow, etc.)