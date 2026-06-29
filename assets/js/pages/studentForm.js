// ============================================================================
// studentForm.js — Add/Edit Student modal: field rendering, face-image
// picker + validation, group/course options, and submit handling.
//
// IMPORTANT — fields differ between create and edit because, per Laravel.json,
// UpdateStudentRequest does NOT list first_name/last_name/student_code as
// editable (only StoreStudentRequest requires them). In edit mode those three
// are shown read-only — that's intentional, matching the documented API
// shape, not an oversight.
//
// ASSUMPTION FLAGGED: the edit-mode group/course pre-fill below matches by
// name against the loaded groups/courses lists, because StudentResource only
// exposes group_name/course_name strings, not their IDs. This is a heuristic
// to replace once a live backend confirms the real GET /students/{id} shape
// (no live backend has been tested against yet — see PROJECT_CONTEXT.md
// Known Issues #4 and #7).
// ============================================================================

const STUDENT_FORM_STATE = {
    mode: "create",       // "create" | "edit"
    studentId: null,
    groups: [],
    courses: [],
    faceImageFile: null
};

/**
 * Minimal HTML-escaping helper for values interpolated into innerHTML.
 * Shared by studentForm.js and students.js (loaded after this file).
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Populates the group <select> used inside the student form (separate from
 * the list page's filter dropdown, which students.js manages itself).
 * @param {Array<Object>} groups
 * @returns {void}
 */
function populateStudentFormGroupSelect(groups) {
    STUDENT_FORM_STATE.groups = groups;
    const select = document.getElementById("student-form-group-select");
    if (!select) return;
    select.innerHTML = "<option value=\"\">Select a group</option>" +
        groups.map((g) => `<option value="${g.id}">${escapeHtml(g.group_name)} — ${escapeHtml(g.course_name || "")}</option>`).join("");
}

/**
 * Populates the course checkbox list used for course_ids[].
 * @param {Array<Object>} courses
 * @returns {void}
 */
function populateStudentFormCourseList(courses) {
    STUDENT_FORM_STATE.courses = courses;
    const list = document.getElementById("student-form-course-list");
    if (!list) return;
    list.innerHTML = courses.map((c) => `
        <label class="course-checkbox-item">
            <input type="checkbox" name="course_ids" value="${c.id}">
            ${escapeHtml(c.course_name)}
        </label>
    `).join("");
}

/**
 * Opens the Add/Edit modal in the given mode and (re)renders its fields.
 * @param {"create"|"edit"} mode
 * @param {Object} [student] - required when mode is "edit"
 * @returns {void}
 */
function openStudentModal(mode, student) {
    STUDENT_FORM_STATE.mode = mode;
    STUDENT_FORM_STATE.studentId = student ? student.id : null;
    STUDENT_FORM_STATE.faceImageFile = null;

    document.getElementById("student-modal-title").textContent =
        mode === "edit" ? "Edit Student" : "Add Student";
    document.getElementById("student-form-submit-btn").textContent =
        mode === "edit" ? "Save Changes" : "Save Student";

    renderStudentFormFields(mode, student);
    populateStudentFormGroupSelect(STUDENT_FORM_STATE.groups);
    populateStudentFormCourseList(STUDENT_FORM_STATE.courses);

    if (mode === "edit" && student) {
        prefillStudentForm(student);
    }

    openModal("student-modal");
}

/**
 * Builds the field markup for the given mode and injects it into
 * #student-form-grid.
 * @param {"create"|"edit"} mode
 * @param {Object} [student]
 * @returns {void}
 */
function renderStudentFormFields(mode, student) {
    const grid = document.getElementById("student-form-grid");

    const identityBlock = mode === "edit"
        ? `
            <div class="student-form-readonly-banner">
                <span>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)} · ${escapeHtml(student.student_code)}</span>
                <span>Name and student code aren't editable here — the update endpoint doesn't accept changes to them.</span>
            </div>
        `
        : `
            <div class="form-group">
                <label class="form-label" for="sf-first-name">First name</label>
                <input type="text" id="sf-first-name" name="first_name" class="form-input" maxlength="255" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="sf-last-name">Last name</label>
                <input type="text" id="sf-last-name" name="last_name" class="form-input" maxlength="255" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="sf-student-code">Student code</label>
                <input type="text" id="sf-student-code" name="student_code" class="form-input" maxlength="255" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="sf-national-id">National ID</label>
                <input type="text" id="sf-national-id" name="national_id" class="form-input" maxlength="50" required>
            </div>
        `;

    const editOnlyFields = mode === "edit"
        ? `
            <div class="form-group">
                <label class="form-label" for="sf-national-id">National ID</label>
                <input type="text" id="sf-national-id" name="national_id" class="form-input" maxlength="50">
            </div>
            <div class="form-group">
                <label class="form-label" for="sf-registered-at">Registered at</label>
                <input type="date" id="sf-registered-at" name="registered_at" class="form-input">
            </div>
        `
        : "";

    grid.innerHTML = `
        ${identityBlock}
        <div class="form-group">
            <label class="form-label" for="sf-email">Email</label>
            <input type="email" id="sf-email" name="email" class="form-input" maxlength="255" ${mode === "create" ? "required" : ""}>
        </div>
        <div class="form-group">
            <label class="form-label" for="sf-phone">Phone number</label>
            <input type="text" id="sf-phone" name="phone_number" class="form-input" maxlength="20">
        </div>
        <div class="form-group">
            <label class="form-label" for="sf-gender">Gender</label>
            <select id="sf-gender" name="gender" class="form-select" ${mode === "create" ? "required" : ""}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
            </select>
        </div>
        ${editOnlyFields}
        <div class="form-group">
            <label class="form-label" for="student-form-group-select">Group</label>
            <select id="student-form-group-select" class="form-select" name="group_id" ${mode === "create" ? "required" : ""}></select>
        </div>
        <div class="form-group form-group-full">
            <label class="form-label">Courses</label>
            <div class="course-checkbox-list" id="student-form-course-list"></div>
            <span class="form-hint">Select at least one course.</span>
        </div>
        <div class="face-image-picker">
            <div class="face-image-preview" id="sf-face-preview">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>
            </div>
            <div class="face-image-actions">
                <input type="file" id="sf-face-image" accept=".jpg,.jpeg,.png" style="display:none;">
                <button type="button" class="btn btn-secondary" id="sf-face-image-btn">
                    ${mode === "edit" ? "Replace photo" : "Upload photo"}
                </button>
                <span class="form-hint">JPG or PNG, min 500×650px, max ${mode === "edit" ? "4MB" : "10MB"}.</span>
                <span class="form-error" id="sf-face-image-error" style="display:none;"></span>
            </div>
        </div>
    `;

    wireFaceImagePicker(mode);
}

/**
 * Fills the form with an existing student's data for edit mode.
 * @param {Object} student
 * @returns {void}
 */
function prefillStudentForm(student) {
    document.getElementById("sf-email").value = student.email || "";
    document.getElementById("sf-phone").value = student.phone_number || "";
    document.getElementById("sf-gender").value = student.gender || "";

    const nationalIdInput = document.getElementById("sf-national-id");
    if (nationalIdInput) nationalIdInput.value = student.national_id || "";

    // Heuristic name-matching — see file header note.
    const studentGroupNames = (student.groups || []).map((g) => g.group_name);
    const matchedGroup = STUDENT_FORM_STATE.groups.find((g) => studentGroupNames.includes(g.group_name));
    if (matchedGroup) {
        document.getElementById("student-form-group-select").value = matchedGroup.id;
    }

    const studentCourseNames = new Set((student.groups || []).map((g) => g.course_name));
    document.querySelectorAll("#student-form-course-list input[type=\"checkbox\"]").forEach((cb) => {
        const course = STUDENT_FORM_STATE.courses.find((c) => String(c.id) === cb.value);
        if (course && studentCourseNames.has(course.course_name)) {
            cb.checked = true;
        }
    });

    const preview = document.getElementById("sf-face-preview");
    if (student.face_image) {
        preview.innerHTML = `<img src="${escapeHtml(student.face_image)}" alt="">`;
    }
}

/**
 * Wires the "Upload/Replace photo" button + hidden file input + live
 * preview + validation. Resolves Known Issue #3 (4MB vs 10MB) by passing
 * an explicit maxSizeMB override into validateFaceImage() — see the
 * validators.js patch notes delivered alongside this module.
 * @param {"create"|"edit"} mode
 * @returns {void}
 */
function wireFaceImagePicker(mode) {
    const btn = document.getElementById("sf-face-image-btn");
    const input = document.getElementById("sf-face-image");
    const preview = document.getElementById("sf-face-preview");
    const errorEl = document.getElementById("sf-face-image-error");
    const maxSizeMB = mode === "edit" ? 4 : 10;

    btn.addEventListener("click", () => input.click());

    input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;

        errorEl.style.display = "none";
        errorEl.textContent = "";

        const result = await validateFaceImage(file, maxSizeMB);

        if (!result.valid) {
            errorEl.textContent = (result.errors && result.errors.join(" ")) || "Invalid image.";
            errorEl.style.display = "block";
            input.value = "";
            STUDENT_FORM_STATE.faceImageFile = null;
            return;
        }

        STUDENT_FORM_STATE.faceImageFile = file;

        const reader = new FileReader();
        reader.onload = () => {
            preview.innerHTML = `<img src="${reader.result}" alt="">`;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Reads the current form into a FormData object matching
 * StoreStudentRequest / UpdateStudentRequest field names.
 * @returns {FormData}
 */
function buildStudentFormData() {
    const formData = new FormData();
    const mode = STUDENT_FORM_STATE.mode;

    if (mode === "create") {
        formData.append("first_name", document.getElementById("sf-first-name").value.trim());
        formData.append("last_name", document.getElementById("sf-last-name").value.trim());
        formData.append("student_code", document.getElementById("sf-student-code").value.trim());
        formData.append("national_id", document.getElementById("sf-national-id").value.trim());
    } else {
        const nationalIdInput = document.getElementById("sf-national-id");
        if (nationalIdInput && nationalIdInput.value.trim()) {
            formData.append("national_id", nationalIdInput.value.trim());
        }
        const registeredAt = document.getElementById("sf-registered-at");
        if (registeredAt && registeredAt.value) {
            formData.append("registered_at", registeredAt.value);
        }
    }

    formData.append("email", document.getElementById("sf-email").value.trim());

    const phone = document.getElementById("sf-phone").value.trim();
    if (phone) formData.append("phone_number", phone);

    const gender = document.getElementById("sf-gender").value;
    if (gender) formData.append("gender", gender);

    const groupId = document.getElementById("student-form-group-select").value;
    if (groupId) formData.append("group_id", groupId);

    document.querySelectorAll("#student-form-course-list input:checked").forEach((cb) => {
        formData.append("course_ids[]", cb.value);
    });

    if (STUDENT_FORM_STATE.faceImageFile) {
        formData.append("face_image", STUDENT_FORM_STATE.faceImageFile);
    }

    return formData;
}

/**
 * Validates required fields per StoreStudentRequest before submit.
 * Edit mode has no required fields per UpdateStudentRequest (everything
 * optional there), so this only meaningfully runs in create mode.
 * @returns {{valid: boolean, message?: string}}
 */
function validateStudentForm() {
    if (STUDENT_FORM_STATE.mode !== "create") return { valid: true };

    const required = ["sf-first-name", "sf-last-name", "sf-student-code", "sf-national-id", "sf-email"];
    for (const id of required) {
        const el = document.getElementById(id);
        if (!el.value.trim()) {
            return { valid: false, message: "Please fill in all required fields." };
        }
    }

    if (!isValidEmail(document.getElementById("sf-email").value.trim())) {
        return { valid: false, message: "Please enter a valid email address." };
    }

    if (!document.getElementById("sf-gender").value) {
        return { valid: false, message: "Please select a gender." };
    }

    if (!document.getElementById("student-form-group-select").value) {
        return { valid: false, message: "Please select a group." };
    }

    if (!document.querySelectorAll("#student-form-course-list input:checked").length) {
        return { valid: false, message: "Please select at least one course." };
    }

    if (!STUDENT_FORM_STATE.faceImageFile) {
        return { valid: false, message: "Please upload a face photo." };
    }

    return { valid: true };
}

/**
 * Wires the form's submit handler once at script load. The modal markup is
 * already in the DOM since this script loads at the bottom of students.html.
 * @returns {void}
 */
(function wireStudentFormSubmit() {
    const form = document.getElementById("student-form");
    const submitBtn = document.getElementById("student-form-submit-btn");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const validation = validateStudentForm();
        if (!validation.valid) {
            showToast(validation.message, "error");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.classList.add("btn-loading");

        try {
            const formData = buildStudentFormData();
            const res = STUDENT_FORM_STATE.mode === "create"
                ? await laravelRequest(Laravel.students.store, { method: "POST", body: formData })
                : await laravelRequest(Laravel.students.updateWithImage(STUDENT_FORM_STATE.studentId), { method: "POST", body: formData });

            showToast((res && res.message) || "Student saved", "success");
            closeModal("student-modal");
            document.dispatchEvent(new CustomEvent("students:changed"));
        } catch (err) {
            showToast(err.message || "Could not save student", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove("btn-loading");
        }
    });
})();