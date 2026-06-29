// =====================================================================
// pages/policyForm.js
// Handles Add / Edit Policy modal.
// Exposes openPolicyModal().
// =====================================================================

let editingPolicyId = null;

/**
 * Opens the policy modal in "add" or "edit" mode.
 * @param {string} mode - "add" or "edit"
 * @param {object|null} policy - policy data for edit mode
 */
function openPolicyModal(mode, policy = null) {
    const modal = document.getElementById("policy-modal");
    const title = document.getElementById("policy-modal-title");
    const form = document.getElementById("policy-form");

    form.reset();
    clearPolicyFormErrors();

    if (mode === "add") {
        title.textContent = "Add Policy";
        editingPolicyId = null;
        // Set default values
        document.getElementById("policy-auto-warn").value = "1";
    } else if (mode === "edit" && policy) {
        title.textContent = "Edit Policy";
        editingPolicyId = policy.id;
        document.getElementById("policy-name").value = policy.name || "";
        document.getElementById("policy-description").value = policy.description || "";
        document.getElementById("policy-late-threshold").value = policy.late_threshold_minutes ?? "";
        document.getElementById("policy-absence-threshold").value = policy.absence_threshold_percent ?? "";
        document.getElementById("policy-warning-after").value = policy.warning_after_absences ?? "";
        document.getElementById("policy-auto-warn").value = policy.auto_warn ? "1" : "0";
    } else {
        console.warn("openPolicyModal: invalid mode or missing policy data");
        return;
    }

    openModal("policy-modal");
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
        name: document.getElementById("policy-name").value.trim(),
        description: document.getElementById("policy-description").value.trim(),
        late_threshold_minutes: parseInt(document.getElementById("policy-late-threshold").value) || 0,
        absence_threshold_percent: parseInt(document.getElementById("policy-absence-threshold").value) || 0,
        warning_after_absences: parseInt(document.getElementById("policy-warning-after").value) || null,
        auto_warn: document.getElementById("policy-auto-warn").value === "1",
    };
}

function validatePolicyForm(data) {
    const errors = {};
    if (!data.name) {
        errors["policy-name"] = "Policy name is required";
    }
    if (data.late_threshold_minutes < 0) {
        errors["policy-late-threshold"] = "Must be 0 or greater";
    }
    if (data.absence_threshold_percent < 0 || data.absence_threshold_percent > 100) {
        errors["policy-absence-threshold"] = "Must be between 0 and 100";
    }
    if (data.warning_after_absences !== null && data.warning_after_absences < 0) {
        errors["policy-warning-after"] = "Must be 0 or greater";
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