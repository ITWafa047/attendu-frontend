// =====================================================================
// pages/courses.js
// Courses list: search, pagination, table rendering, delete flow.
// Depends on courseForm.js (for openCourseModal).
// =====================================================================

const COURSES_PAGE_STATE = {
    currentPage: 1,
    perPage: 15,
    total: 0,
    search: "",
    data: [],
};

/**
 * Entry point – called from courses.html inline script.
 */
async function initCoursesPage() {
    // Wire UI elements
    document.getElementById("add-course-btn").addEventListener("click", () => {
        openCourseModal("add");
    });

    const searchInput = document.getElementById("search-courses");
    searchInput.addEventListener("input", debounce((e) => {
        COURSES_PAGE_STATE.search = e.target.value.trim();
        COURSES_PAGE_STATE.currentPage = 1;
        loadCourses();
    }, 400));

    // Listen for refresh events from the form
    document.addEventListener("courses:changed", () => {
        loadCourses();
    });

    // Load initial data
    await loadCourses();
}

/**
 * Fetches courses from the API and updates the table + pagination.
 */
async function loadCourses() {
    showLoader();

    const params = {
        page: COURSES_PAGE_STATE.currentPage,
        per_page: COURSES_PAGE_STATE.perPage,
        search: COURSES_PAGE_STATE.search || undefined,
    };

    const query = buildQueryString(params);

    try {
        const response = await laravelRequest(`${Laravel.courses.index}${query}`);
        // Assume response shape: { success: bool, data: [...], meta: { total, current_page, per_page, ... } }
        // or possibly { data: [...], total, ... } depending on Laravel's pagination format.
        // We'll adapt to common Laravel pagination: { data: [...], meta: { total, current_page, per_page } }.
        const courses = response.data || [];
        const meta = response.meta || { total: 0, current_page: 1, per_page: COURSES_PAGE_STATE.perPage };
        COURSES_PAGE_STATE.data = courses;
        COURSES_PAGE_STATE.total = meta.total || 0;
        COURSES_PAGE_STATE.currentPage = meta.current_page || 1;
        COURSES_PAGE_STATE.perPage = meta.per_page || COURSES_PAGE_STATE.perPage;

        renderCoursesTable(courses);
        renderCoursesPagination();
    } catch (err) {
        console.error("Failed to load courses:", err);
        showToast(err.message || "Could not load courses", "error");
        COURSES_PAGE_STATE.data = [];
        renderCoursesTable([]);
        renderCoursesPagination();
    } finally {
        hideLoader();
    }
}

/**
 * Renders the courses table.
 * @param {Array} courses
 */
function renderCoursesTable(courses) {
    const container = document.getElementById("courses-table-container");

    if (!courses || courses.length === 0) {
        container.innerHTML = `
            <div class="table-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21v-12" />
                </svg>
                <p class="table-empty-title">No courses found</p>
                <p class="table-empty-hint">Add a new course to get started.</p>
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
                        <th>Description</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th style="width: 80px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const course of courses) {
        const start = course.start_date ? formatDate(course.start_date) : "—";
        const end = course.end_date ? formatDate(course.end_date) : "—";
        const code = course.course_code || "—";
        const desc = course.description || "";

        html += `
            <tr>
                <td><strong>${escapeHtml(course.course_name)}</strong></td>
                <td class="course-code-col">${escapeHtml(code)}</td>
                <td>${escapeHtml(desc)}</td>
                <td class="course-dates-col">${start}</td>
                <td class="course-dates-col">${end}</td>
                <td>
                    <button class="table-action-btn edit-course-btn" data-id="${course.id}" title="Edit">
                        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2L18 6L7 17H3V13L14 2Z" />
                        </svg>
                    </button>
                    <button class="table-action-btn table-action-danger delete-course-btn" data-id="${course.id}" data-name="${escapeHtml(course.course_name)}" title="Delete">
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
    container.querySelectorAll(".edit-course-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id);
            try {
                const response = await laravelRequest(Laravel.courses.show(id));
                const course = response.data;
                if (course) {
                    openCourseModal("edit", course);
                } else {
                    showToast("Course not found", "error");
                }
            } catch (err) {
                showToast(err.message || "Could not load course details", "error");
            }
        });
    });

    // Wire delete buttons
    container.querySelectorAll(".delete-course-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const name = btn.dataset.name;
            openDeleteCourseModal(id, name);
        });
    });
}

/**
 * Renders pagination controls.
 */
function renderCoursesPagination() {
    const container = document.getElementById("courses-pagination-container");
    const total = COURSES_PAGE_STATE.total;
    const perPage = COURSES_PAGE_STATE.perPage;
    const current = COURSES_PAGE_STATE.currentPage;

    if (total <= perPage) {
        container.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(total / perPage);
    let html = `<div class="pagination"><div class="pagination-controls">`;

    // Previous
    const prevDisabled = current <= 1;
    html += `<button class="pagination-btn" data-page="${current - 1}" ${prevDisabled ? "disabled" : ""}>‹</button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === current) {
            html += `<button class="pagination-btn pagination-btn-active" data-page="${i}">${i}</button>`;
        } else if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
            html += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
        } else if (i === current - 2 || i === current + 2) {
            html += `<span class="pagination-ellipsis">…</span>`;
        }
    }

    // Next
    const nextDisabled = current >= totalPages;
    html += `<button class="pagination-btn" data-page="${current + 1}" ${nextDisabled ? "disabled" : ""}>›</button>`;

    html += `</div></div>`;
    container.innerHTML = html;

    // Wire pagination buttons
    container.querySelectorAll(".pagination-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = parseInt(btn.dataset.page);
            if (page && page !== COURSES_PAGE_STATE.currentPage) {
                COURSES_PAGE_STATE.currentPage = page;
                loadCourses();
            }
        });
    });
}

// ---- Delete flow ----

let deleteCourseId = null;
let deleteCourseName = "";

function openDeleteCourseModal(id, name) {
    deleteCourseId = id;
    deleteCourseName = name;
    document.getElementById("delete-course-name").textContent = name;
    openModal("delete-course-modal");
}

function confirmDeleteCourse() {
    if (!deleteCourseId) return;

    const confirmBtn = document.getElementById("confirm-delete-course");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";

    laravelRequest(Laravel.courses.destroy(deleteCourseId), { method: "DELETE" })
        .then(() => {
            showToast(`Course "${deleteCourseName}" deleted`, "success");
            closeModal("delete-course-modal");
            document.dispatchEvent(new CustomEvent("courses:changed"));
        })
        .catch(err => {
            showToast(err.message || "Failed to delete course", "error");
        })
        .finally(() => {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
            deleteCourseId = null;
            deleteCourseName = "";
        });
}

// Wire delete confirmation button
document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirm-delete-course");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", confirmDeleteCourse);
    }
});

// ---- Helper ----
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}