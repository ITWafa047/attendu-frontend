// =====================================================================
// pages/courseForm.js
// Handles the Add / Edit Course modal logic.
// Exposes openCourseModal() for use by courses.js and any other page.
// =====================================================================

/** @type {string|null} ID of the course being edited, null for create mode */
let editingCourseId = null;

/**
 * Opens the course modal in either "add" or "edit" mode.
 * @param {string} mode - "add" or "edit"
 * @param {object|null} course - course data for edit mode
 */
function openCourseModal(mode, course = null) {
    const modal = document.getElementById("course-modal");
    const title = document.getElementById("course-modal-title");
    const form = document.getElementById("course-form");
    const nameInput = document.getElementById("course-name");
    const codeInput = document.getElementById("course-code");
    const descInput = document.getElementById("course-description");
    const startInput = document.getElementById("course-start-date");
    const endInput = document.getElementById("course-end-date");

    // Reset form and errors
    form.reset();
    clearCourseFormErrors();

    if (mode === "add") {
        title.textContent = "Add Course";
        editingCourseId = null;
    } else if (mode === "edit" && course) {
        title.textContent = "Edit Course";
        editingCourseId = course.id;
        nameInput.value = course.course_name || "";
        codeInput.value = course.course_code || "";
        descInput.value = course.description || "";
        startInput.value = course.start_date ? course.start_date.slice(0, 10) : "";
        endInput.value = course.end_date ? course.end_date.slice(0, 10) : "";
    } else {
        console.warn("openCourseModal: invalid mode or missing course data");
        return;
    }

    openModal("course-modal");
}

/** Clears all inline error messages for the course form. */
function clearCourseFormErrors() {
    document.querySelectorAll("#course-form .form-error").forEach(el => {
        el.textContent = "";
        el.style.display = "none";
    });
    document.querySelectorAll("#course-form .has-error").forEach(el => {
        el.classList.remove("has-error");
    });
}

/**
 * Collects form data as a plain object.
 * @returns {object}
 */
function getCourseFormData() {
    return {
        course_name: document.getElementById("course-name").value.trim(),
        course_code: document.getElementById("course-code").value.trim(),
        description: document.getElementById("course-description").value.trim(),
        start_date: document.getElementById("course-start-date").value || null,
        end_date: document.getElementById("course-end-date").value || null,
    };
}

/**
 * Validates the course form.
 * @param {object} data - from getCourseFormData()
 * @returns {{ valid: boolean, errors: object }}
 */
function validateCourseForm(data) {
    const errors = {};
    if (!data.course_name) {
        errors.course_name = "Course name is required";
    }
    // Optional: add more rules (e.g., end_date after start_date)
    return { valid: Object.keys(errors).length === 0, errors };
}

/** Shows inline errors on the form fields. */
function showCourseFormErrors(errors) {
    for (const [field, message] of Object.entries(errors)) {
        const errorEl = document.getElementById(`${field}-error`);
        const inputEl = document.getElementById(field);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = "block";
        }
        if (inputEl) {
            inputEl.closest(".form-group")?.classList.add("has-error");
        }
    }
}

/**
 * Submits the course form (create or update).
 * Called by courses.js after wiring the save button.
 */
async function submitCourseForm() {
    const data = getCourseFormData();
    const { valid, errors } = validateCourseForm(data);
    if (!valid) {
        showCourseFormErrors(errors);
        return;
    }

    const saveBtn = document.getElementById("course-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
        let response;
        if (editingCourseId) {
            // Update
            response = await laravelRequest(
                Laravel.courses.update(editingCourseId),
                { method: "PUT", body: data }
            );
        } else {
            // Create
            response = await laravelRequest(
                Laravel.courses.store,
                { method: "POST", body: data }
            );
        }

        showToast(response.message || "Course saved successfully", "success");
        closeModal("course-modal");
        // Notify the list page to refresh
        document.dispatchEvent(new CustomEvent("courses:changed"));
    } catch (err) {
        console.error("Error saving course:", err);
        showToast(err.message || "Failed to save course", "error");
        // If validation errors from server, we could parse and display them
        // but for simplicity we just show the toast.
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
    }
}

// ---- Auto-wire the save button ----
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("course-save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", submitCourseForm);
    }
});