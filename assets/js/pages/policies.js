// =====================================================================
// pages/policies.js
// Policies list: search, pagination, table rendering, delete flow.
// Depends on policyForm.js.
// =====================================================================

const POLICIES_PAGE_STATE = {
    currentPage: 1,
    perPage: 15,
    total: 0,
    search: "",
    data: [],
};

async function initPoliciesPage() {
    document.getElementById("add-policy-btn").addEventListener("click", () => {
        openPolicyModal("add");
    });

    const searchInput = document.getElementById("search-policies");
    searchInput.addEventListener("input", debounce((e) => {
        POLICIES_PAGE_STATE.search = e.target.value.trim();
        POLICIES_PAGE_STATE.currentPage = 1;
        loadPolicies();
    }, 400));

    document.addEventListener("policies:changed", () => {
        loadPolicies();
    });

    await loadPolicies();
}

async function loadPolicies() {
    showLoader();

    const params = {
        page: POLICIES_PAGE_STATE.currentPage,
        per_page: POLICIES_PAGE_STATE.perPage,
        search: POLICIES_PAGE_STATE.search || undefined,
    };

    const query = buildQueryString(params);

    try {
        const response = await laravelRequest(`${Laravel.attendancePolicies.index}${query}`);
        const policies = response.data || [];
        const meta = response.meta || { total: 0, current_page: 1, per_page: POLICIES_PAGE_STATE.perPage };
        POLICIES_PAGE_STATE.data = policies;
        POLICIES_PAGE_STATE.total = meta.total || 0;
        POLICIES_PAGE_STATE.currentPage = meta.current_page || 1;
        POLICIES_PAGE_STATE.perPage = meta.per_page || POLICIES_PAGE_STATE.perPage;

        renderPoliciesTable(policies);
        renderPoliciesPagination();
    } catch (err) {
        console.error("Failed to load policies:", err);
        showToast(err.message || "Could not load policies", "error");
        POLICIES_PAGE_STATE.data = [];
        renderPoliciesTable([]);
        renderPoliciesPagination();
    } finally {
        hideLoader();
    }
}

function renderPoliciesTable(policies) {
    const container = document.getElementById("policies-table-container");

    if (!policies || policies.length === 0) {
        container.innerHTML = `
            <div class="table-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21v-12" />
                </svg>
                <p class="table-empty-title">No policies found</p>
                <p class="table-empty-hint">Add a new policy to get started.</p>
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
                        <th>Description</th>
                        <th>Late Threshold (min)</th>
                        <th>Absence Threshold (%)</th>
                        <th>Warning After</th>
                        <th>Auto-warn</th>
                        <th style="width: 80px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const policy of policies) {
        const name = policy.name || "Untitled";
        const desc = policy.description || "";
        const late = policy.late_threshold_minutes ?? "—";
        const absence = policy.absence_threshold_percent ?? "—";
        const warningAfter = policy.warning_after_absences ?? "—";
        const autoWarn = policy.auto_warn ? "Yes" : "No";

        html += `
            <tr>
                <td class="policy-name-col">${escapeHtml(name)}</td>
                <td class="policy-description-col" title="${escapeHtml(desc)}">${escapeHtml(desc)}</td>
                <td class="policy-threshold-col">${late}</td>
                <td class="policy-threshold-col">${absence}</td>
                <td>${warningAfter}</td>
                <td>${autoWarn}</td>
                <td>
                    <button class="table-action-btn edit-policy-btn" data-id="${policy.id}" title="Edit">
                        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2L18 6L7 17H3V13L14 2Z" />
                        </svg>
                    </button>
                    <button class="table-action-btn table-action-danger delete-policy-btn" data-id="${policy.id}" data-name="${escapeHtml(name)}" title="Delete">
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

    // Wire edit buttons
    container.querySelectorAll(".edit-policy-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id);
            try {
                const response = await laravelRequest(Laravel.attendancePolicies.show(id));
                const policy = response.data;
                if (policy) {
                    openPolicyModal("edit", policy);
                } else {
                    showToast("Policy not found", "error");
                }
            } catch (err) {
                showToast(err.message || "Could not load policy details", "error");
            }
        });
    });

    // Wire delete buttons
    container.querySelectorAll(".delete-policy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const name = btn.dataset.name;
            openDeletePolicyModal(id, name);
        });
    });
}

function renderPoliciesPagination() {
    const container = document.getElementById("policies-pagination-container");
    const total = POLICIES_PAGE_STATE.total;
    const perPage = POLICIES_PAGE_STATE.perPage;
    const current = POLICIES_PAGE_STATE.currentPage;

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
            if (page && page !== POLICIES_PAGE_STATE.currentPage) {
                POLICIES_PAGE_STATE.currentPage = page;
                loadPolicies();
            }
        });
    });
}

// ---- Delete flow ----

let deletePolicyId = null;
let deletePolicyName = "";

function openDeletePolicyModal(id, name) {
    deletePolicyId = id;
    deletePolicyName = name;
    document.getElementById("delete-policy-name").textContent = name;
    openModal("delete-policy-modal");
}

function confirmDeletePolicy() {
    if (!deletePolicyId) return;

    const confirmBtn = document.getElementById("confirm-delete-policy");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";

    laravelRequest(Laravel.attendancePolicies.destroy(deletePolicyId), { method: "DELETE" })
        .then(() => {
            showToast(`Policy "${deletePolicyName}" deleted`, "success");
            closeModal("delete-policy-modal");
            document.dispatchEvent(new CustomEvent("policies:changed"));
        })
        .catch(err => {
            showToast(err.message || "Failed to delete policy", "error");
        })
        .finally(() => {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
            deletePolicyId = null;
            deletePolicyName = "";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirm-delete-policy");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", confirmDeletePolicy);
    }
});

// ---- Helper ----
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}