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
        const response = await laravelRequest(Laravel.reports.studentShow(studentId));
        // Expected shape: { success: bool, data: { student: {...}, summary: {...}, sessions: [...] } }
        if (!response.success) {
            showToast(response.message || "Student not found", "error");
            window.location.href = "reports.html";
            return;
        }

        const data = response.data;
        renderStudentInfo(data.student);
        renderSummary(data.summary);
        renderSessions(data.sessions || []);
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
    const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student";
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
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--muted);">No session records found.</td></tr>`;
        return;
    }

    let html = "";
    for (const session of sessions) {
        const title = session.title || "Untitled";
        const course = session.course_name || "—";
        const date = session.date ? formatDate(session.date) : "—";
        const status = session.status || "absent";
        const badgeClass = `badge-${status}`;

        html += `
            <tr>
                <td>${escapeHtml(title)}</td>
                <td>${escapeHtml(course)}</td>
                <td>${date}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}