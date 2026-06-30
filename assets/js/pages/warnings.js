// =====================================================================
// pages/warnings.js
// Warnings list: search, pagination, table rendering, delete flow.
// Depends on warningForm.js.
// =====================================================================

const WARNINGS_PAGE_STATE = {
    currentPage: 1,
    perPage: 15,
    total: 0,
    search: "",
    data: [],
};

async function initWarningsPage() {
    document.getElementById("add-warning-btn").addEventListener("click", () => {
        openWarningModal();
    });

    const searchInput = document.getElementById("search-warnings");
    searchInput.addEventListener("input", debounce((e) => {
        WARNINGS_PAGE_STATE.search = e.target.value.trim();
        WARNINGS_PAGE_STATE.currentPage = 1;
        loadWarnings();
    }, 400));

    document.addEventListener("warnings:changed", () => {
        loadWarnings();
    });

    await loadWarnings();
}

async function loadWarnings() {
    showLoader();

    const params = {
        page: WARNINGS_PAGE_STATE.currentPage,
        per_page: WARNINGS_PAGE_STATE.perPage,
        search: WARNINGS_PAGE_STATE.search || undefined,
    };

    const query = buildQueryString(params);

    try {
        const response = await laravelRequest(`${Laravel.warnings.index}${query}`);
        const warnings = response.data || [];
        const meta = response.meta || { total: 0, current_page: 1, per_page: WARNINGS_PAGE_STATE.perPage };
        WARNINGS_PAGE_STATE.data = warnings;
        WARNINGS_PAGE_STATE.total = meta.total || 0;
        WARNINGS_PAGE_STATE.currentPage = meta.current_page || 1;
        WARNINGS_PAGE_STATE.perPage = meta.per_page || WARNINGS_PAGE_STATE.perPage;

        renderWarningsTable(warnings);
        renderWarningsPagination();
    } catch (err) {
        console.error("Failed to load warnings:", err);
        showToast(err.message || "Could not load warnings", "error");
        WARNINGS_PAGE_STATE.data = [];
        renderWarningsTable([]);
        renderWarningsPagination();
    } finally {
        hideLoader();
    }
}

function renderWarningsTable(warnings) {
    const container = document.getElementById("warnings-table-container");

    if (!warnings || warnings.length === 0) {
        container.innerHTML = `
            <div class="table-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21v-12" />
                </svg>
                <p class="table-empty-title">No warnings found</p>
                <p class="table-empty-hint">Issue a warning to a student when needed.</p>
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
                        <th>Reason</th>
                        <th>Issued At</th>
                        <th>Status</th>
                        <th style="width: 80px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const warning of warnings) {
        const studentName = warning.student_name || "—";
        const reason = warning.reason || "—";
        const issuedAt = warning.issued_at ? formatDateTime(warning.issued_at) : "—";
        const status = warning.status || "active"; // active / resolved
        const statusClass = status === "active" ? "warning-status-active" : "warning-status-resolved";

        html += `
            <tr>
                <td class="warning-student-col">${escapeHtml(studentName)}</td>
                <td class="warning-reason-col">${escapeHtml(reason)}</td>
                <td>${issuedAt}</td>
                <td><span class="warning-status-badge ${statusClass}">${escapeHtml(status)}</span></td>
                <td>
                    <button class="table-action-btn table-action-danger delete-warning-btn" data-id="${warning.id}" data-student="${escapeHtml(studentName)}" title="Delete">
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

    // Wire delete buttons
    container.querySelectorAll(".delete-warning-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const student = btn.dataset.student;
            openDeleteWarningModal(id, student);
        });
    });
}

function renderWarningsPagination() {
    const container = document.getElementById("warnings-pagination-container");
    const total = WARNINGS_PAGE_STATE.total;
    const perPage = WARNINGS_PAGE_STATE.perPage;
    const current = WARNINGS_PAGE_STATE.currentPage;

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
            if (page && page !== WARNINGS_PAGE_STATE.currentPage) {
                WARNINGS_PAGE_STATE.currentPage = page;
                loadWarnings();
            }
        });
    });
}

// ---- Delete flow ----

let deleteWarningId = null;
let deleteWarningStudent = "";

function openDeleteWarningModal(id, student) {
    deleteWarningId = id;
    deleteWarningStudent = student;
    document.getElementById("delete-warning-student").textContent = student;
    openModal("delete-warning-modal");
}

function confirmDeleteWarning() {
    if (!deleteWarningId) return;

    const confirmBtn = document.getElementById("confirm-delete-warning");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";

    laravelRequest(Laravel.warnings.destroy(deleteWarningId), { method: "DELETE" })
        .then(() => {
            showToast(`Warning for "${deleteWarningStudent}" deleted`, "success");
            closeModal("delete-warning-modal");
            document.dispatchEvent(new CustomEvent("warnings:changed"));
        })
        .catch(err => {
            showToast(err.message || "Failed to delete warning", "error");
        })
        .finally(() => {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
            deleteWarningId = null;
            deleteWarningStudent = "";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirm-delete-warning");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", confirmDeleteWarning);
    }
});

// ---- Helper ----
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}