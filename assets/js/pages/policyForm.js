// =====================================================================
// pages/policyForm.js
// Handles Add / Edit Policy modal.
// Exposes openPolicyModal().
// =====================================================================

let editingPolicyId = null;
let policyCourses = [];

/**
 * Opens the policy modal in "add" or "edit" mode.
 * @param {string} mode - "add" or "edit"
 * @param {object|null} policy - policy data for edit mode
 */
async function openPolicyModal(mode, policy = null) {
    const modal = document.getElementById("policy-modal");
    const title = document.getElementById("policy-modal-title");
    const form = document.getElementById("policy-form");

    form.reset();
    clearPolicyFormErrors();
    await populatePolicyCourseSelect();

    if (mode === "add") {
        title.textContent = "Add Policy";
        editingPolicyId = null;
    } else if (mode === "edit" && policy) {
        title.textContent = "Edit Policy";
        editingPolicyId = policy.id;
        document.getElementById("policy-course-id").value = policy.course_id || "";
        document.getElementById("policy-max-absences").value = policy.max_absences_allowed ?? "";
        document.getElementById("policy-min-attend").value = policy.min_attend ?? "";
        document.getElementById("policy-max-attend").value = policy.max_attend ?? "";
    } else {
        console.warn("openPolicyModal: invalid mode or missing policy data");
        return;
    }

    openModal("policy-modal");
}

async function populatePolicyCourseSelect() {
    const select = document.getElementById("policy-course-id");
    if (!select || policyCourses.length > 0) {
        return;
    }

    try {
        const response = await laravelRequest(Laravel.courses.index);
        policyCourses = response.data || [];
        select.innerHTML = `<option value="">Select a course</option>` +
            policyCourses.map(course => `
                <option value="${course.id}">${escapeHtml(course.course_name)}</option>
            `).join("");
    } catch (err) {
        console.error("Failed to load courses for policy form:", err);
        showToast(err.message || "Could not load courses", "error");
    }
}

function clearPolicyFormErrors() {
    document.querySelectorAll("#policy-form .form-error").forEach(el => {
        el.textContent = "";
        el.style.display = "none";
    });
    document.querySelectorAll("#policy-form .has-error").forEach(el => {
        el.classList.remove("has-error");
    });
}

function getPolicyFormData() {
    return {
        course_id: parseInt(document.getElementById("policy-course-id").value, 10) || null,
        max_absences_allowed: parseInt(document.getElementById("policy-max-absences").value, 10) || 0,
        min_attend: parseInt(document.getElementById("policy-min-attend").value, 10) || 0,
        max_attend: parseInt(document.getElementById("policy-max-attend").value, 10) || 0,
    };
}

function validatePolicyForm(data) {
    const errors = {};
    if (!data.course_id) {
        errors["policy-course-id"] = "Course is required";
    }
    if (data.max_absences_allowed < 0) {
        errors["policy-max-absences"] = "Must be 0 or greater";
    }
    if (data.min_attend < 0) {
        errors["policy-min-attend"] = "Must be 0 or greater";
    }
    if (data.max_attend < 0) {
        errors["policy-max-attend"] = "Must be 0 or greater";
    }
    if (data.max_attend < data.min_attend) {
        errors["policy-max-attend"] = "Max attend must be equal or greater than min attend";
    }
    return { valid: Object.keys(errors).length === 0, errors };
}

function showPolicyFormErrors(errors) {
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

async function submitPolicyForm() {
    const data = getPolicyFormData();
    const { valid, errors } = validatePolicyForm(data);
    if (!valid) {
        showPolicyFormErrors(errors);
        return;
    }

    const saveBtn = document.getElementById("policy-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
        let response;
        if (editingPolicyId) {
            response = await laravelRequest(
                Laravel.attendancePolicies.update(editingPolicyId),
                { method: "PUT", body: data }
            );
        } else {
            response = await laravelRequest(
                Laravel.attendancePolicies.store,
                { method: "POST", body: data }
            );
        }

        showToast(response.message || "Policy saved successfully", "success");
        closeModal("policy-modal");
        document.dispatchEvent(new CustomEvent("policies:changed"));
    } catch (err) {
        console.error("Error saving policy:", err);
        showToast(err.message || "Failed to save policy", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
    }
}

// Auto‑wire the save button
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("policy-save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", submitPolicyForm);
    }
});