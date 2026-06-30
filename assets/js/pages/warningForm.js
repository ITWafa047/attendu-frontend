// =====================================================================
// pages/warningForm.js
// Handles issuing a new warning via modal.
// Exposes openWarningModal() and populates student dropdown.
// =====================================================================

let currentStudentId = null;

/**
 * Fetches and populates the student dropdown in the warning modal.
 */
async function populateWarningStudentSelect() {
    const select = document.getElementById("warning-student");
    if (!select) return;

    const currentVal = select.value;

    try {
        // Fetch students (maybe we need only active ones? For now, all)
        const response = await laravelRequest(Laravel.students.index);
        const students = response.data || [];

        select.innerHTML = '<option value="">Select a student…</option>';
        students.forEach(student => {
            const opt = document.createElement("option");
            opt.value = student.id;
            opt.textContent = `${student.first_name} ${student.last_name} (${student.student_code})`;
            select.appendChild(opt);
        });

        if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        }
    } catch (err) {
        console.error("Failed to load students:", err);
        showToast("Could not load students", "error");
    }
}

/**
 * Opens the warning modal to issue a new warning.
 */
async function openWarningModal() {
    const modal = document.getElementById("warning-modal");
    const title = document.getElementById("warning-modal-title");
    const form = document.getElementById("warning-form");

    form.reset();
    clearWarningFormErrors();

    title.textContent = "Issue Warning";
    currentStudentId = null;

    // Populate student dropdown
    await populateWarningStudentSelect();

    openModal("warning-modal");
}

function clearWarningFormErrors() {
    document.querySelectorAll("#warning-form .form-error").forEach(el => {
        el.textContent = "";
        el.style.display = "none";
    });
    document.querySelectorAll("#warning-form .has-error").forEach(el => {
        el.classList.remove("has-error");
    });
}

function getWarningFormData() {
    return {
        student_id: parseInt(document.getElementById("warning-student").value) || null,
        reason: document.getElementById("warning-reason").value.trim(),
    };
}

function validateWarningForm(data) {
    const errors = {};
    if (!data.student_id) {
        errors["warning-student"] = "Please select a student";
    }
    if (!data.reason) {
        errors["warning-reason"] = "Please provide a reason";
    }
    return { valid: Object.keys(errors).length === 0, errors };
}

function showWarningFormErrors(errors) {
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

async function submitWarningForm() {
    const data = getWarningFormData();
    const { valid, errors } = validateWarningForm(data);
    if (!valid) {
        showWarningFormErrors(errors);
        return;
    }

    const saveBtn = document.getElementById("warning-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Issuing…";

    try {
        // POST /warnings/{studentId}
        const response = await laravelRequest(
            Laravel.warnings.store(data.student_id),
            {
                method: "POST",
                body: { reason: data.reason },
            }
        );

        showToast(response.message || "Warning issued successfully", "success");
        closeModal("warning-modal");
        document.dispatchEvent(new CustomEvent("warnings:changed"));
    } catch (err) {
        console.error("Error issuing warning:", err);
        showToast(err.message || "Failed to issue warning", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Issue Warning";
    }
}

// Auto‑wire the save button
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("warning-save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", submitWarningForm);
    }
});