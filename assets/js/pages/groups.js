// =====================================================================
// pages/groups.js
// Groups list: search, pagination, table rendering, delete flow.
// Depends on groupForm.js.
// =====================================================================

const GROUPS_PAGE_STATE = {
    currentPage: 1,
    perPage: 15,
    total: 0,
    search: "",
    data: [],
};

async function initGroupsPage() {
    document.getElementById("add-group-btn").addEventListener("click", () => {
        openGroupModal("add");
    });

    const searchInput = document.getElementById("search-groups");
    searchInput.addEventListener("input", debounce((e) => {
        GROUPS_PAGE_STATE.search = e.target.value.trim();
        GROUPS_PAGE_STATE.currentPage = 1;
        loadGroups();
    }, 400));

    document.addEventListener("groups:changed", () => {
        loadGroups();
    });

    await loadGroups();
}

async function loadGroups() {
    showLoader();

    const params = {
        page: GROUPS_PAGE_STATE.currentPage,
        per_page: GROUPS_PAGE_STATE.perPage,
        search: GROUPS_PAGE_STATE.search || undefined,
    };

    const query = buildQueryString(params);

    try {
        const response = await laravelRequest(`${Laravel.groups.index}${query}`);
        const groups = response.data || [];
        const meta = response.meta || { total: 0, current_page: 1, per_page: GROUPS_PAGE_STATE.perPage };
        GROUPS_PAGE_STATE.data = groups;
        GROUPS_PAGE_STATE.total = meta.total || 0;
        GROUPS_PAGE_STATE.currentPage = meta.current_page || 1;
        GROUPS_PAGE_STATE.perPage = meta.per_page || GROUPS_PAGE_STATE.perPage;

        renderGroupsTable(groups);
        renderGroupsPagination();
    } catch (err) {
        console.error("Failed to load groups:", err);
        showToast(err.message || "Could not load groups", "error");
        GROUPS_PAGE_STATE.data = [];
        renderGroupsTable([]);
        renderGroupsPagination();
    } finally {
        hideLoader();
    }
}

function renderGroupsTable(groups) {
    const container = document.getElementById("groups-table-container");

    if (!groups || groups.length === 0) {
        container.innerHTML = `
            <div class="table-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21v-12" />
                </svg>
                <p class="table-empty-title">No groups found</p>
                <p class="table-empty-hint">Add a new group to get started.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-wrapper">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Academic Year</th>
                        <th>Course</th>
                        <th style="width: 80px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const group of groups) {
        const courseName = group.course_name || "—";
        const code = group.group_code || "—";
        const year = group.academic_year || "—";

        html += `
            <tr>
                <td><strong>${escapeHtml(group.group_name)}</strong></td>
                <td class="group-code-col">${escapeHtml(code)}</td>
                <td>${escapeHtml(year)}</td>
                <td class="group-course-col">${escapeHtml(courseName)}</td>
                <td>
                    <button class="table-action-btn edit-group-btn" data-id="${group.id}" title="Edit">
                        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2L18 6L7 17H3V13L14 2Z" />
                        </svg>
                    </button>
                    <button class="table-action-btn table-action-danger delete-group-btn" data-id="${group.id}" data-name="${escapeHtml(group.group_name)}" title="Delete">
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

    // Edit buttons
    container.querySelectorAll(".edit-group-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id);
            try {
                const response = await laravelRequest(Laravel.groups.show(id));
                const group = response.data;
                if (group) {
                    openGroupModal("edit", group);
                } else {
                    showToast("Group not found", "error");
                }
            } catch (err) {
                showToast(err.message || "Could not load group details", "error");
            }
        });
    });

    // Delete buttons
    container.querySelectorAll(".delete-group-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const name = btn.dataset.name;
            openDeleteGroupModal(id, name);
        });
    });
}

function renderGroupsPagination() {
    const container = document.getElementById("groups-pagination-container");
    const total = GROUPS_PAGE_STATE.total;
    const perPage = GROUPS_PAGE_STATE.perPage;
    const current = GROUPS_PAGE_STATE.currentPage;

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
            if (page && page !== GROUPS_PAGE_STATE.currentPage) {
                GROUPS_PAGE_STATE.currentPage = page;
                loadGroups();
            }
        });
    });
}

// ---- Delete flow ----

let deleteGroupId = null;
let deleteGroupName = "";

function openDeleteGroupModal(id, name) {
    deleteGroupId = id;
    deleteGroupName = name;
    document.getElementById("delete-group-name").textContent = name;
    openModal("delete-group-modal");
}

function confirmDeleteGroup() {
    if (!deleteGroupId) return;

    const confirmBtn = document.getElementById("confirm-delete-group");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";

    laravelRequest(Laravel.groups.destroy(deleteGroupId), { method: "DELETE" })
        .then(() => {
            showToast(`Group "${deleteGroupName}" deleted`, "success");
            closeModal("delete-group-modal");
            document.dispatchEvent(new CustomEvent("groups:changed"));
        })
        .catch(err => {
            showToast(err.message || "Failed to delete group", "error");
        })
        .finally(() => {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
            deleteGroupId = null;
            deleteGroupName = "";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirm-delete-group");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", confirmDeleteGroup);
    }
});

// ---- Helper ----
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}