// =====================================================================
// pages/reports.js
// Reports list: search, pagination, table rendering.
// =====================================================================

const REPORTS_PAGE_STATE = {
    currentPage: 1,
    perPage: 15,
    total: 0,
    search: "",
    data: [],
};

async function initReportsPage() {
    const searchInput = document.getElementById("search-reports");
    searchInput.addEventListener("input", debounce((e) => {
        REPORTS_PAGE_STATE.search = e.target.value.trim();
        REPORTS_PAGE_STATE.currentPage = 1;
        loadReports();
    }, 400));

    await loadReports();
}

async function loadReports() {
    showLoader();

    const params = {
        page: REPORTS_PAGE_STATE.currentPage,
        per_page: REPORTS_PAGE_STATE.perPage,
        search: REPORTS_PAGE_STATE.search || undefined,
    };

    const query = buildQueryString(params);

    try {
        const response = await laravelRequest(`${Laravel.reports.students}${query}`);
        // Expecting { success: bool, data: [...], meta: { total, current_page, per_page } }
        const reports = response.data || [];
        const meta = response.meta || { total: 0, current_page: 1, per_page: REPORTS_PAGE_STATE.perPage };
        REPORTS_PAGE_STATE.data = reports;
        REPORTS_PAGE_STATE.total = meta.total || 0;
        REPORTS_PAGE_STATE.currentPage = meta.current_page || 1;
        REPORTS_PAGE_STATE.perPage = meta.per_page || REPORTS_PAGE_STATE.perPage;

        renderReportsTable(reports);
        renderReportsPagination();
    } catch (err) {
        console.error("Failed to load reports:", err);
        showToast(err.message || "Could not load reports", "error");
        REPORTS_PAGE_STATE.data = [];
        renderReportsTable([]);
        renderReportsPagination();
    } finally {
        hideLoader();
    }
}

function renderReportsTable(reports) {
    const container = document.getElementById("reports-table-container");

    if (!reports || reports.length === 0) {
        container.innerHTML = `
            <div class="table-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21v-12" />
                </svg>
                <p class="table-empty-title">No reports found</p>
                <p class="table-empty-hint">No attendance data yet.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-wrapper">
            <table class="table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Code</th>
                        <th>Total Sessions</th>
                        <th>Present</th>
                        <th>Late</th>
                        <th>Absent</th>
                        <th>Attendance %</th>
                        <th style="width: 80px;">Action</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const report of reports) {
        const fullName = `${report.first_name || ""} ${report.last_name || ""}`.trim() || "—";
        const code = report.student_code || "—";
        const total = report.total_sessions || 0;
        const present = report.present_count || 0;
        const late = report.late_count || 0;
        const absent = report.absent_count || 0;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";
        let percentClass = "";
        if (percentage >= 80) percentClass = "report-percentage-high";
        else if (percentage >= 60) percentClass = "report-percentage-medium";
        else percentClass = "report-percentage-low";

        html += `
            <tr>
                <td class="report-student-col">${escapeHtml(fullName)}</td>
                <td>${escapeHtml(code)}</td>
                <td>${total}</td>
                <td>${present}</td>
                <td>${late}</td>
                <td>${absent}</td>
                <td class="report-percentage-col ${percentClass}">${percentage}%</td>
                <td>
                    <a href="report-detail.html?id=${report.id}" class="btn btn-sm btn-primary">View</a>
                </td>
            </tr>
        `;
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderReportsPagination() {
    const container = document.getElementById("reports-pagination-container");
    const total = REPORTS_PAGE_STATE.total;
    const perPage = REPORTS_PAGE_STATE.perPage;
    const current = REPORTS_PAGE_STATE.currentPage;

    if (total <= perPage) {
        container.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(total / perPage);
    let html = `<div class="pagination"><div class="pagination-controls">`;

    const prevDisabled = current <= 1;
    html += `<button class="pagination-btn" data-page="${current - 1}" ${prevDisabled ? "disabled" : ""}>‹</button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === current) {
            html += `<button class="pagination-btn pagination-btn-active" data-page="${i}">${i}</button>`;
        } else if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
            html += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
        } else if (i === current - 2 || i === current + 2) {
            html += `<span class="pagination-ellipsis">…</span>`;
        }
    }

    const nextDisabled = current >= totalPages;
    html += `<button class="pagination-btn" data-page="${current + 1}" ${nextDisabled ? "disabled" : ""}>›</button>`;

    html += `</div></div>`;
    container.innerHTML = html;

    container.querySelectorAll(".pagination-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = parseInt(btn.dataset.page);
            if (page && page !== REPORTS_PAGE_STATE.currentPage) {
                REPORTS_PAGE_STATE.currentPage = page;
                loadReports();
            }
        });
    });
}

// ---- Helper ----
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}