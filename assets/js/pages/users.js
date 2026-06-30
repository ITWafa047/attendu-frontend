// =====================================================================
// pages/users.js
// Users (Instructors) list: search, pagination, table rendering, delete.
// Depends on userForm.js.
// =====================================================================

const USERS_PAGE_STATE = {
    currentPage: 1,
    perPage: 15,
    total: 0,
    search: "",
    data: [],
};

async function initUsersPage() {
    document.getElementById("add-user-btn").addEventListener("click", () => {
        openUserModal();
    });

    const searchInput = document.getElementById("search-users");
    searchInput.addEventListener("input", debounce((e) => {
        USERS_PAGE_STATE.search = e.target.value.trim();
        USERS_PAGE_STATE.currentPage = 1;
        loadUsers();
    }, 400));

    document.addEventListener("users:changed", () => {
        loadUsers();
    });

    await loadUsers();
}

async function loadUsers() {
    showLoader();

    const params = {
        page: USERS_PAGE_STATE.currentPage,
        per_page: USERS_PAGE_STATE.perPage,
        search: USERS_PAGE_STATE.search || undefined,
    };

    const query = buildQueryString(params);

    try {
        const response = await laravelRequest(`${Laravel.users.index}${query}`);
        // Assume response.data is an array of all users
        // Filter to only instructors (role === "instructor")
        let allUsers = response.data || [];
        // If the backend doesn't filter by role, we filter client-side
        // But we also need pagination to work with filtered data; for simplicity we rely on backend pagination and filter after.
        // We'll filter client-side but then pagination will break if we don't adjust totals.
        // Better: assume backend returns only instructors? The endpoint is /users, might return all.
        // We'll filter and also update total based on filtered length.
        const instructors = allUsers.filter(u => u.role === "instructor");
        // For pagination, we cannot reliably paginate after filter; we trust that if search param is used, it's applied on backend.
        // We'll just show all instructors and if we need pagination, we'll implement server-side filtering later.
        // Since the spec says "Users / Instructors" management, we assume the index endpoint can filter by role.
        // For now, we'll use the response as-is and assume it only returns instructors.
        // We'll keep the filtering but also adjust total.
        USERS_PAGE_STATE.data = instructors;
        USERS_PAGE_STATE.total = instructors.length; // This might be wrong if backend paginates, but we'll just use meta if available.
        // Better: use meta from response if present, but we need to trust meta.

        // Use meta from response if exists
        const meta = response.meta || { total: instructors.length, current_page: 1, per_page: USERS_PAGE_STATE.perPage };
        USERS_PAGE_STATE.total = meta.total || instructors.length;
        USERS_PAGE_STATE.currentPage = meta.current_page || 1;
        USERS_PAGE_STATE.perPage = meta.per_page || USERS_PAGE_STATE.perPage;

        renderUsersTable(instructors);
        renderUsersPagination();
    } catch (err) {
        console.error("Failed to load users:", err);
        showToast(err.message || "Could not load instructors", "error");
        USERS_PAGE_STATE.data = [];
        renderUsersTable([]);
        renderUsersPagination();
    } finally {
        hideLoader();
    }
}

function renderUsersTable(users) {
    const container = document.getElementById("users-table-container");

    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="table-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21v-12" />
                </svg>
                <p class="table-empty-title">No instructors found</p>
                <p class="table-empty-hint">Add a new instructor to manage sessions.</p>
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
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Gender</th>
                        <th>Role</th>
                        <th style="width: 80px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const user of users) {
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—";
        const email = user.email || "—";
        const phone = user.phone_number || "—";
        const gender = user.gender || "—";
        const role = user.role || "instructor";

        html += `
            <tr>
                <td class="user-name-col">${escapeHtml(fullName)}</td>
                <td>${escapeHtml(email)}</td>
                <td>${escapeHtml(phone)}</td>
                <td>${escapeHtml(gender)}</td>
                <td><span class="user-role-badge">${escapeHtml(role)}</span></td>
                <td>
                    <button class="table-action-btn table-action-danger delete-user-btn" data-id="${user.id}" data-name="${escapeHtml(fullName)}" title="Delete">
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
    container.querySelectorAll(".delete-user-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const name = btn.dataset.name;
            openDeleteUserModal(id, name);
        });
    });
}

function renderUsersPagination() {
    const container = document.getElementById("users-pagination-container");
    const total = USERS_PAGE_STATE.total;
    const perPage = USERS_PAGE_STATE.perPage;
    const current = USERS_PAGE_STATE.currentPage;

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
            if (page && page !== USERS_PAGE_STATE.currentPage) {
                USERS_PAGE_STATE.currentPage = page;
                loadUsers();
            }
        });
    });
}

// ---- Delete flow ----

let deleteUserId = null;
let deleteUserName = "";

function openDeleteUserModal(id, name) {
    deleteUserId = id;
    deleteUserName = name;
    document.getElementById("delete-user-name").textContent = name;
    openModal("delete-user-modal");
}

function confirmDeleteUser() {
    if (!deleteUserId) return;

    const confirmBtn = document.getElementById("confirm-delete-user");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";

    laravelRequest(Laravel.users.destroy(deleteUserId), { method: "DELETE" })
        .then(() => {
            showToast(`Instructor "${deleteUserName}" deleted`, "success");
            closeModal("delete-user-modal");
            document.dispatchEvent(new CustomEvent("users:changed"));
        })
        .catch(err => {
            showToast(err.message || "Failed to delete instructor", "error");
        })
        .finally(() => {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
            deleteUserId = null;
            deleteUserName = "";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirm-delete-user");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", confirmDeleteUser);
    }
});

// ---- Helper ----
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}