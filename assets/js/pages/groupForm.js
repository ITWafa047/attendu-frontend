// =====================================================================
// pages/groupForm.js
// Handles the Add / Edit Group modal.
// Exposes openGroupModal() and a helper to populate course dropdown.
// =====================================================================

let editingGroupId = null;

/** Populates the course select dropdown inside the group modal. */
async function populateGroupCourseSelect() {
    const select = document.getElementById("group-course-id");
    if (!select) return;

    // Preserve the currently selected value if any
    const currentVal = select.value;

    try {
        const response = await laravelRequest(Laravel.courses.index);
        const courses = response.data || [];

        // Clear old options except the default
        select.innerHTML = '<option value="">Select a course…</option>';
        courses.forEach(course => {
            const opt = document.createElement("option");
            opt.value = course.id;
            opt.textContent = course.course_name;
            select.appendChild(opt);
        });

        // Restore selected value if it still exists
        if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        }
    } catch (err) {
        console.error("Failed to load courses for group form:", err);
        showToast("Could not load course list", "error");
    }
}

/**
 * Opens the group modal.
 * @param {string} mode - "add" or "edit"
 * @param {object|null} group - group data for edit mode
 */
async function openGroupModal(mode, group = null) {
    const modal = document.getElementById("group-modal");
    const title = document.getElementById("group-modal-title");
    const form = document.getElementById("group-form");

    // Reset form
    form.reset();
    clearGroupFormErrors();

    // Populate course dropdown
    await populateGroupCourseSelect();

    if (mode === "add") {
        title.textContent = "Add Group";
        editingGroupId = null;
    } else if (mode === "edit" && group) {
        title.textContent = "Edit Group";
        editingGroupId = group.id;
        document.getElementById("group-name").value = group.group_name || "";
        document.getElementById("group-code").value = group.group_code || "";
        document.getElementById("group-academic-year").value = group.academic_year || "";
        // Select the correct course
        if (group.course_id) {
            document.getElementById("group-course-id").value = group.course_id;
        }
    } else {
        console.warn("openGroupModal: invalid mode or missing group data");
        return;
    }

    openModal("group-modal");
}

function clearGroupFormErrors() {
    document.querySelectorAll("#group-form .form-error").forEach(el => {
        el.textContent = "";
        el.style.display = "none";
    });
    document.querySelectorAll("#group-form .has-error").forEach(el => {
        el.classList.remove("has-error");
    });
}

function getGroupFormData() {
    return {
        group_name: document.getElementById("group-name").value.trim(),
        group_code: document.getElementById("group-code").value.trim(),
        academic_year: document.getElementById("group-academic-year").value.trim(),
        course_id: parseInt(document.getElementById("group-course-id").value) || null,
    };
}

function validateGroupForm(data) {
    const errors = {};
    if (!data.group_name) {
        errors.group_name = "Group name is required";
    }
    if (!data.group_code) {
        errors.group_code = "Group code is required";
    }
    if (!data.academic_year) {
        errors.academic_year = "Please select an academic year";
    }
    if (!data.course_id) {
        errors["group-course-id"] = "Please select a course";
    }
    return { valid: Object.keys(errors).length === 0, errors };
}

function showGroupFormErrors(errors) {
    for (const [field, message] of Object.entries(errors)) {
        // The field name in DOM might be "group-course-id" etc.
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

async function submitGroupForm() {
    const data = getGroupFormData();
    const { valid, errors } = validateGroupForm(data);
    if (!valid) {
        showGroupFormErrors(errors);
        return;
    }

    const saveBtn = document.getElementById("group-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
        let response;
        if (editingGroupId) {
            response = await laravelRequest(
                Laravel.groups.update(editingGroupId),
                { method: "PUT", body: data }
            );
        } else {
            response = await laravelRequest(
                Laravel.groups.store,
                { method: "POST", body: data }
            );
        }

        showToast(response.message || "Group saved successfully", "success");
        closeModal("group-modal");
        document.dispatchEvent(new CustomEvent("groups:changed"));
    } catch (err) {
        console.error("Error saving group:", err);
        showToast(err.message || "Failed to save group", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("group-save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", submitGroupForm);
    }
});