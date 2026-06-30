// =====================================================================
// pages/userForm.js
// Handles creating a new instructor.
// Exposes openUserModal().
// =====================================================================

/**
 * Opens the user modal to create a new instructor.
 */
function openUserModal() {
    const modal = document.getElementById("user-modal");
    const title = document.getElementById("user-modal-title");
    const form = document.getElementById("user-form");

    form.reset();
    clearUserFormErrors();
    title.textContent = "Add Instructor";

    openModal("user-modal");
}

function clearUserFormErrors() {
    document.querySelectorAll("#user-form .form-error").forEach(el => {
        el.textContent = "";
        el.style.display = "none";
    });
    document.querySelectorAll("#user-form .has-error").forEach(el => {
        el.classList.remove("has-error");
    });
}

function getUserFormData() {
    const firstName = document.getElementById("user-first-name").value.trim();
    const lastName = document.getElementById("user-last-name").value.trim();

    return {
        name: `${firstName} ${lastName}`.trim(),
        email: document.getElementById("user-email").value.trim(),
        phone: document.getElementById("user-phone").value.trim() || null,
        gender: document.getElementById("user-gender").value,
        password: document.getElementById("user-password").value,
        password_confirmation: document.getElementById("user-password-confirm").value,
        role: "instructor",
    };
}

function validateUserForm(data) {
    const errors = {};
    const firstName = document.getElementById("user-first-name").value.trim();
    const lastName = document.getElementById("user-last-name").value.trim();
    if (!firstName) {
        errors["user-first-name"] = "First name is required";
    }
    if (!lastName) {
        errors["user-last-name"] = "Last name is required";
    }
    if (!data.email) {
        errors["user-email"] = "Email is required";
    } else if (!isValidEmail(data.email)) {
        errors["user-email"] = "Invalid email format";
    }
    if (!data.password) {
        errors["user-password"] = "Password is required";
    } else if (data.password.length < 6) {
        errors["user-password"] = "Password must be at least 6 characters";
    }
    if (data.password !== data.password_confirmation) {
        errors["user-password-confirm"] = "Passwords do not match";
    }
    return { valid: Object.keys(errors).length === 0, errors };
}

function showUserFormErrors(errors) {
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

async function submitUserForm() {
    const data = getUserFormData();
    const { valid, errors } = validateUserForm(data);
    if (!valid) {
        showUserFormErrors(errors);
        return;
    }

    const saveBtn = document.getElementById("user-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Creating…";

    try {
        // POST /users/instructor
        const response = await laravelRequest(
            Laravel.users.createInstructor,
            { method: "POST", body: data }
        );

        showToast(response.message || "Instructor created successfully", "success");
        closeModal("user-modal");
        document.dispatchEvent(new CustomEvent("users:changed"));
    } catch (err) {
        console.error("Error creating instructor:", err);
        showToast(err.message || "Failed to create instructor", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Create Instructor";
    }
}

// Auto‑wire the save button
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("user-save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", submitUserForm);
    }
});