// =====================================================================
// pages/sessionForm.js
// Handles Add / Edit Session modal.
// Exposes openSessionModal() and helper functions for populating dropdowns.
// =====================================================================

let editingSessionId = null;

/**
 * Fetches and populates the course dropdown inside the session modal.
 */
async function populateSessionCourseSelect() {
    const select = document.getElementById("session-course-id");
    if (!select) return;

    const currentVal = select.value;

    try {
        const response = await laravelRequest(Laravel.courses.index);
        const courses = response.data || [];

        select.innerHTML = '<option value="">Select a course…</option>';
        courses.forEach(course => {
            const opt = document.createElement("option");
            opt.value = course.id;
            opt.textContent = course.course_name;
            select.appendChild(opt);
        });

        if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        }
    } catch (err) {
        console.error("Failed to load courses:", err);
        showToast("Could not load courses", "error");
    }
}

/**
 * Fetches and populates the group dropdown inside the session modal.
 */
async function populateSessionGroupSelect() {
    const select = document.getElementById("session-group-id");
    if (!select) return;

    const currentVal = select.value;

    try {
        const response = await laravelRequest(Laravel.groups.index);
        const groups = response.data || [];

        select.innerHTML = '<option value="">Select a group…</option>';
        groups.forEach(group => {
            const opt = document.createElement("option");
            opt.value = group.id;
            opt.textContent = group.group_name + (group.course_name ? ` (${group.course_name})` : "");
            select.appendChild(opt);
        });

        if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        }
    } catch (err) {
        console.error("Failed to load groups:", err);
        showToast("Could not load groups", "error");
    }
}

/**
 * Fetches all users and filters those with role "instructor".
 * Populates the instructor dropdown.
 */
async function populateSessionInstructorSelect() {
    const select = document.getElementById("session-instructor-id");
    if (!select) return;

    const currentVal = select.value;

    try {
        const response = await laravelRequest(Laravel.users.index);
        const users = response.data || [];

        // Filter instructors (assuming role field exists)
        const instructors = users.filter(u => u.role === "instructor");

        select.innerHTML = '<option value="">Select an instructor…</option>';
        instructors.forEach(inst => {
            const opt = document.createElement("option");
            opt.value = inst.id;
            opt.textContent = inst.name || inst.email;
            select.appendChild(opt);
        });

        if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        }
    } catch (err) {
        console.error("Failed to load instructors:", err);
        showToast("Could not load instructors", "error");
    }
}

/**
 * Opens the session modal in "add" or "edit" mode.
 * @param {string} mode - "add" or "edit"
 * @param {object|null} session - session data for edit mode
 */
async function openSessionModal(mode, session = null) {
    const modal = document.getElementById("session-modal");
    const title = document.getElementById("session-modal-title");
    const form = document.getElementById("session-form");

    form.reset();
    clearSessionFormErrors();

    // Populate dropdowns (they will be re‑populated each time)
    await populateSessionCourseSelect();
    await populateSessionGroupSelect();
    await populateSessionInstructorSelect();

    if (mode === "add") {
        title.textContent = "Add Session";
        editingSessionId = null;
        // Set default status to "scheduled"
        document.getElementById("session-status").value = "scheduled";
    } else if (mode === "edit" && session) {
        title.textContent = "Edit Session";
        editingSessionId = session.id;
        document.getElementById("session-title").value = session.title || "";
        document.getElementById("session-description").value = session.description || "";
        document.getElementById("session-course-id").value = session.course_id || "";
        document.getElementById("session-group-id").value = session.group_id || "";
        document.getElementById("session-instructor-id").value = session.instructor_id || "";
        document.getElementById("session-status").value = session.status || "scheduled";
        // Format datetime-local from ISO string (e.g. "2026-07-01T10:00:00")
        if (session.start_time) {
            document.getElementById("session-start").value = session.start_time.slice(0, 16);
        }
        if (session.end_time) {
            document.getElementById("session-end").value = session.end_time.slice(0, 16);
        }
    } else {
        console.warn("openSessionModal: invalid mode or missing session data");
        return;
    }

    openModal("session-modal");
}

function clearSessionFormErrors() {
    document.querySelectorAll("#session-form .form-error").forEach(el => {
        el.textContent = "";
        el.style.display = "none";
    });
    document.querySelectorAll("#session-form .has-error").forEach(el => {
        el.classList.remove("has-error");
    });
}

function getSessionFormData() {
    return {
        title: document.getElementById("session-title").value.trim(),
        description: document.getElementById("session-description").value.trim(),
        course_id: parseInt(document.getElementById("session-course-id").value) || null,
        group_id: parseInt(document.getElementById("session-group-id").value) || null,
        instructor_id: parseInt(document.getElementById("session-instructor-id").value) || null,
        status: document.getElementById("session-status").value,
        start_time: document.getElementById("session-start").value,
        end_time: document.getElementById("session-end").value,
    };
}

function validateSessionForm(data) {
    const errors = {};
    if (!data.course_id) {
        errors["session-course-id"] = "Please select a course";
    }
    if (!data.group_id) {
        errors["session-group-id"] = "Please select a group";
    }
    if (!data.instructor_id) {
        errors["session-instructor-id"] = "Please select an instructor";
    }
    if (!data.start_time) {
        errors["session-start"] = "Start date/time is required";
    }
    if (!data.end_time) {
        errors["session-end"] = "End date/time is required";
    }
    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
        errors["session-end"] = "End time must be after start time";
    }
    return { valid: Object.keys(errors).length === 0, errors };
}

function showSessionFormErrors(errors) {
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

async function submitSessionForm() {
    const data = getSessionFormData();
    const { valid, errors } = validateSessionForm(data);
    if (!valid) {
        showSessionFormErrors(errors);
        return;
    }

    const saveBtn = document.getElementById("session-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
        let response;
        if (editingSessionId) {
            response = await laravelRequest(
                Laravel.sessions.update(editingSessionId),
                { method: "PUT", body: data }
            );
        } else {
            response = await laravelRequest(
                Laravel.sessions.store,
                { method: "POST", body: data }
            );
        }

        showToast(response.message || "Session saved successfully", "success");
        closeModal("session-modal");
        document.dispatchEvent(new CustomEvent("sessions:changed"));
    } catch (err) {
        console.error("Error saving session:", err);
        showToast(err.message || "Failed to save session", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
    }
}

// Auto‑wire the save button
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("session-save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", submitSessionForm);
    }
});