// =====================================================================
// pages/reportDetail.js
// Student report detail: loads student info, summary, and session list.
// =====================================================================

async function initReportDetailPage() {
    const studentId = getQueryParam("id");
    if (!studentId) {
        showToast("No student ID provided", "error");
        window.location.href = "reports.html";
        return;
    }

    await loadStudentReport(studentId);
}

async function loadStudentReport(studentId) {
    showLoader();

    try {
        const [profileResponse, attendanceResponse] = await Promise.all([
            laravelRequest(Laravel.reports.studentShow(studentId)),
            laravelRequest(Laravel.attendance.byStudent(studentId)),
        ]);

        if (!profileResponse.success) {
            showToast(profileResponse.message || "Student not found", "error");
            window.location.href = "reports.html";
            return;
        }

        const student = profileResponse.data.student || {};
        const attendanceData = attendanceResponse.data || {};

        renderStudentInfo(student);
        renderSummary(attendanceData.summary);
        renderSessions(attendanceData.attendances || []);
    } catch (err) {
        console.error("Failed to load student report:", err);
        showToast(err.message || "Could not load report", "error");
        window.location.href = "reports.html";
    } finally {
        hideLoader();
    }
}

function renderStudentInfo(student) {
    if (!student) return;
    const fullName = student.student_name || `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student";
    document.getElementById("report-student-name").textContent = fullName;
    document.getElementById("student-code").textContent = student.student_code || "—";
    document.getElementById("student-email").textContent = student.email || "—";
    document.getElementById("student-phone").textContent = student.phone_number || "—";
    document.getElementById("student-gender").textContent = student.gender || "—";
    document.getElementById("student-national-id").textContent = student.national_id || "—";
}

function renderSummary(summary) {
    if (!summary) summary = { total: 0, present: 0, late: 0, absent: 0 };
    document.getElementById("detail-total").textContent = summary.total || 0;
    document.getElementById("detail-present").textContent = summary.present || 0;
    document.getElementById("detail-late").textContent = summary.late || 0;
    document.getElementById("detail-absent").textContent = summary.absent || 0;
}

function renderSessions(sessions) {
    const tbody = document.getElementById("report-sessions-tbody");

    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--muted);">No session records found.</td></tr>`;
        return;
    }

    let html = "";
    for (const session of sessions) {
        const title = session.session_type || `Session #${session.session_id}`;
        const course = session.course_name || "—";
        const date = session.session_date ? formatDate(session.session_date) : "—";
        const status = session.status || "absent";
        const badgeClass = `badge-${status}`;

        html += `
            <tr>
                <td>${escapeHtml(title)}</td>
                <td>${escapeHtml(course)}</td>
                <td>${date}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary view-session-attendance-btn" data-session-id="${session.session_id}" data-session-title="${escapeHtml(title)}" data-session-course="${escapeHtml(course)}" data-session-date="${escapeHtml(session.session_date || "")}">View</button>
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;

    tbody.querySelectorAll(".view-session-attendance-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const sessionId = parseInt(btn.dataset.sessionId, 10);
            const title = btn.dataset.sessionTitle || "Session Attendance";
            const course = btn.dataset.sessionCourse || "";
            const date = btn.dataset.sessionDate || "";
            openSessionAttendanceModal(sessionId, title, course, date);
        });
    });
}

let activeSessionId = null;

async function openSessionAttendanceModal(sessionId, title, course, date) {
    activeSessionId = sessionId;
    const titleEl = document.getElementById("session-attendance-modal-title");
    const metaEl = document.getElementById("session-attendance-meta");

    titleEl.textContent = `Session Attendance: ${title}`;
    metaEl.textContent = `${course}${course && date ? " · " : ""}${date ? formatDateTime(date) : ""}`;

    await loadSessionAttendance(sessionId);
    openModal("session-attendance-modal");
}

async function loadSessionAttendance(sessionId) {
    const tbody = document.getElementById("session-attendance-tbody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--muted);">Loading session attendance…</td></tr>`;

    try {
        const response = await laravelRequest(Laravel.attendance.bySession(sessionId));
        const data = response.data || {};
        renderSessionAttendanceTable(data.attendances || []);
    } catch (err) {
        console.error("Failed to load session attendance:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--danger);">Could not load session attendance.</td></tr>`;
    }
}

function renderSessionAttendanceTable(attendances) {
    const tbody = document.getElementById("session-attendance-tbody");
    if (!attendances || attendances.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--muted);">No attendance records for this session.</td></tr>`;
        return;
    }

    let html = "";
    for (const attendance of attendances) {
        const studentName = attendance.student_name || "—";
        const studentCode = attendance.student_code || "—";
        const status = attendance.status || "absent";
        const checkIn = attendance.check_in_time ? formatDateTime(attendance.check_in_time) : "—";

        html += `
            <tr>
                <td>${escapeHtml(studentName)}</td>
                <td>${escapeHtml(studentCode)}</td>
                <td>
                    <select class="form-select session-attendance-status" data-attendance-id="${attendance.attendance_id}">
                        <option value="present" ${status === "present" ? "selected" : ""}>Present</option>
                        <option value="late" ${status === "late" ? "selected" : ""}>Late</option>
                        <option value="absent" ${status === "absent" ? "selected" : ""}>Absent</option>
                    </select>
                </td>
                <td>${checkIn}</td>
                <td>
                    <button class="btn btn-sm btn-primary update-attendance-btn" data-attendance-id="${attendance.attendance_id}" data-checkin="${attendance.check_in_time || ""}">Save</button>
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;

    tbody.querySelectorAll(".update-attendance-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const attendanceId = parseInt(btn.dataset.attendanceId, 10);
            const select = tbody.querySelector(`select.session-attendance-status[data-attendance-id="${attendanceId}"]`);
            const status = select?.value || "absent";
            const rawCheckin = btn.dataset.checkin || null;
            const checkInTime = status === "absent" ? null : rawCheckin;
            await updateAttendanceRecord(attendanceId, status, checkInTime);
        });
    });
}

async function updateAttendanceRecord(attendanceId, status, checkInTime) {
    const saveButtons = document.querySelectorAll(`.update-attendance-btn[data-attendance-id="${attendanceId}"]`);
    saveButtons.forEach(btn => {
        btn.disabled = true;
        btn.textContent = "Saving…";
    });

    try {
        await laravelRequest(Laravel.attendance.update(attendanceId), {
            method: "PUT",
            body: {
                status,
                check_in_time: checkInTime,
            },
        });

        showToast("Attendance updated", "success");
        if (activeSessionId) {
            await loadSessionAttendance(activeSessionId);
        }
    } catch (err) {
        console.error("Failed to update attendance:", err);
        showToast(err.message || "Could not update attendance", "error");
    } finally {
        saveButtons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = "Save";
        });
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}