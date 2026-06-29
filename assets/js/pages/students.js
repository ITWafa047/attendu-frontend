// ============================================================================
// students.js — Students list page: search, group filter, pagination, table
// rendering, and the delete-confirm flow. Add/Edit form logic lives in
// studentForm.js (loaded before this file, per dependency order).
//
// ASSUMPTIONS FLAGGED (verify against the real config.js/utils.js):
//   1. buildQueryString(params) is assumed to return a query string WITHOUT
//      a leading "?" (e.g. "page=1&search=foo"). See loadStudents() below.
//   2. Laravel.groups.index and Laravel.courses.index are assumed to exist
//      as plain-string GET endpoints ("/groups", "/courses"), following the
//      same convention as Laravel.students.index. Neither was confirmed in
//      PROJECT_CONTEXT.md as already wired — add them to config.js if not
//      already present.
//   3. Laravel.students.destroy(id) is assumed to exist as an arrow-function
//      endpoint builder, matching the documented config.js convention for
//      parameterized endpoints.
// ============================================================================

const STUDENTS_PAGE_STATE = {
    page: 1,
    perPage: 10,
    search: "",
    groupId: "",
    lastMeta: null,
    students: [],
    pendingDeleteId: null
};

/**
 * Entry point — called once from the inline bottom-of-body script, after
 * guardPage() and renderAppShell() have run.
 * @returns {Promise<void>}
 */
async function initStudentsPage() {
    wireStudentsToolbar();
    wireDeleteModal();
    document.addEventListener("students:changed", loadStudents);

    await Promise.all([loadGroupAndCourseOptions(), loadStudents()]);
}

/**
 * Wires the search input (debounced), group filter dropdown, and Add button.
 * @returns {void}
 */
function wireStudentsToolbar() {
    const searchInput = document.getElementById("students-search-input");
    const groupFilter = document.getElementById("students-group-filter");
    const addBtn = document.getElementById("add-student-btn");

    const debouncedSearch = debounce(() => {
        STUDENTS_PAGE_STATE.search = searchInput.value.trim();
        STUDENTS_PAGE_STATE.page = 1;
        loadStudents();
    }, 400);

    searchInput.addEventListener("input", debouncedSearch);

    groupFilter.addEventListener("change", () => {
        STUDENTS_PAGE_STATE.groupId = groupFilter.value;
        STUDENTS_PAGE_STATE.page = 1;
        loadStudents();
    });

    addBtn.addEventListener("click", () => openStudentModal("create"));
}

/**
 * Fetches groups + courses once. Used for the list page's filter dropdown
 * and (via studentForm.js) the add/edit form's group select + course list.
 * @returns {Promise<void>}
 */
async function loadGroupAndCourseOptions() {
    try {
        const res = await laravelRequest(Laravel.groups.index, { method: "GET" });
        const groups = res.data || [];

        const groupFilter = document.getElementById("students-group-filter");
        groupFilter.innerHTML = "<option value=\"\">All groups</option>" +
            groups.map((g) => `<option value="${g.id}">${escapeHtml(g.group_name)} — ${escapeHtml(g.course_name || "")}</option>`).join("");

        populateStudentFormGroupSelect(groups);
    } catch (err) {
        showToast(err.message || "Could not load groups", "error");
    }

    try {
        const res = await laravelRequest(Laravel.courses.index, { method: "GET" });
        populateStudentFormCourseList(res.data || []);
    } catch (err) {
        showToast(err.message || "Could not load courses", "error");
    }
}

/**
 * Loads the current page of students from the API and re-renders the table.
 * @returns {Promise<void>}
 */
async function loadStudents() {
    showLoader();
    try {
        const params = {
            page: STUDENTS_PAGE_STATE.page,
            per_page: STUDENTS_PAGE_STATE.perPage
        };
        if (STUDENTS_PAGE_STATE.search) params.search = STUDENTS_PAGE_STATE.search;
        if (STUDENTS_PAGE_STATE.groupId) params.group_id = STUDENTS_PAGE_STATE.groupId;

        const query = buildQueryString(params);
        const endpoint = query ? `${Laravel.students.index}?${query}` : Laravel.students.index;

        const res = await laravelRequest(endpoint, { method: "GET" });

        STUDENTS_PAGE_STATE.students = res.data || [];
        STUDENTS_PAGE_STATE.lastMeta = res.meta || null;

        renderStudentsTable(STUDENTS_PAGE_STATE.students);
        renderPagination(STUDENTS_PAGE_STATE.lastMeta);
    } catch (err) {
        showToast(err.message || "Could not load students", "error");
        renderStudentsTable([]);
    } finally {
        hideLoader();
    }
}

/**
 * Renders the student rows into the table body, or the empty state if none.
 * @param {Array<Object>} students
 * @returns {void}
 */
function renderStudentsTable(students) {
    const tbody = document.getElementById("students-table-body");
    const emptyState = document.getElementById("students-empty-state");

    if (!students.length) {
        tbody.innerHTML = "";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";

    tbody.innerHTML = students.map((student) => {
        const fullName = `${student.first_name} ${student.last_name}`;
        const initials = `${(student.first_name || "")[0] || ""}${(student.last_name || "")[0] || ""}`.toUpperCase();
        const avatar = student.face_image
            ? `<img class="student-avatar" src="${escapeHtml(student.face_image)}" alt="${escapeHtml(fullName)}">`
            : `<span class="student-avatar-fallback">${escapeHtml(initials)}</span>`;

        const groupBadges = (student.groups || []).map((g) =>
            `<span class="badge badge-info" title="${escapeHtml(g.course_name || "")}">${escapeHtml(g.group_name)}</span>`
        ).join("") || `<span class="badge badge-neutral">No group</span>`;

        return `
            <tr data-student-id="${student.id}">
                <td>
                    <div class="student-name-cell">
                        ${avatar}
                        <div>
                            <div class="student-name">${escapeHtml(fullName)}</div>
                            <div class="student-code">${escapeHtml(student.student_code)}</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(student.email)}</td>
                <td class="table-cell-muted">${escapeHtml(student.phone_number || "—")}</td>
                <td><div class="badge-chip-list">${groupBadges}</div></td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="table-action-btn" data-action="edit" data-id="${student.id}" aria-label="Edit student">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button type="button" class="table-action-btn table-action-danger" data-action="delete" data-id="${student.id}" aria-label="Delete student">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-action=\"edit\"]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const student = STUDENTS_PAGE_STATE.students.find((s) => String(s.id) === btn.dataset.id);
            if (student) openStudentModal("edit", student);
        });
    });

    tbody.querySelectorAll("[data-action=\"delete\"]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const student = STUDENTS_PAGE_STATE.students.find((s) => String(s.id) === btn.dataset.id);
            if (student) openDeleteConfirm(student);
        });
    });
}

/**
 * Renders prev/next + numbered page buttons from the API's pagination meta.
 * Assumes a Laravel-default shape ({ current_page, last_page, total }) for
 * the `meta` object — adjust if the real API nests pagination differently.
 * @param {Object|null} meta
 * @returns {void}
 */
function renderPagination(meta) {
    const container = document.getElementById("students-pagination");

    if (!meta || !meta.last_page || meta.last_page <= 1) {
        container.innerHTML = "";
        return;
    }

    const current = meta.current_page || STUDENTS_PAGE_STATE.page;
    const last = meta.last_page;
    const total = meta.total != null ? meta.total : "";

    let buttons = "";
    buttons += `<button type="button" class="pagination-btn" data-page="${current - 1}" ${current === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>`;

    for (let p = 1; p <= last; p++) {
        if (p === 1 || p === last || Math.abs(p - current) <= 1) {
            buttons += `<button type="button" class="pagination-btn ${p === current ? "pagination-btn-active" : ""}" data-page="${p}">${p}</button>`;
        } else if (p === 2 || p === last - 1) {
            buttons += `<span class="pagination-ellipsis">…</span>`;
        }
    }

    buttons += `<button type="button" class="pagination-btn" data-page="${current + 1}" ${current === last ? "disabled" : ""} aria-label="Next page">›</button>`;

    container.innerHTML = `
        <div class="pagination-info">${total !== "" ? `${total} student${total === 1 ? "" : "s"} total` : ""}</div>
        <div class="pagination-controls">${buttons}</div>
    `;

    container.querySelectorAll(".pagination-btn[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetPage = Number(btn.dataset.page);
            if (targetPage < 1 || targetPage > last || targetPage === current) return;
            STUDENTS_PAGE_STATE.page = targetPage;
            loadStudents();
        });
    });
}

/**
 * Opens the delete-confirm modal for a given student.
 * @param {Object} student
 * @returns {void}
 */
function openDeleteConfirm(student) {
    STUDENTS_PAGE_STATE.pendingDeleteId = student.id;
    document.getElementById("delete-student-name").textContent = `${student.first_name} ${student.last_name}`;
    openModal("delete-student-modal");
}

/**
 * Wires the confirm-delete button once; reads the pending id from state.
 * @returns {void}
 */
function wireDeleteModal() {
    document.getElementById("confirm-delete-student-btn").addEventListener("click", async () => {
        const id = STUDENTS_PAGE_STATE.pendingDeleteId;
        if (!id) return;

        try {
            const res = await laravelRequest(Laravel.students.destroy(id), { method: "DELETE" });
            showToast((res && res.message) || "Student deleted", "success");
            closeModal("delete-student-modal");
            STUDENTS_PAGE_STATE.pendingDeleteId = null;
            await loadStudents();
        } catch (err) {
            showToast(err.message || "Could not delete student", "error");
        }
    });
}