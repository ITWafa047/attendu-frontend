// =====================================================================
// pages/syncFinal.js
// Post-session review: fetch synced data, display summary and tables,
// and submit final attendance.
// =====================================================================

let sessionId = null;
let syncData = null;
let submitted = false;

async function initSyncFinalPage() {
    sessionId = getQueryParam("id");
    if (!sessionId) {
        showToast("No session ID provided", "error");
        window.location.href = "sessions.html";
        return;
    }

    await loadSyncData();

    document.getElementById("cancel-sync-btn").addEventListener("click", () => {
        window.location.href = "sessions.html";
    });

    document.getElementById("confirm-sync-btn").addEventListener("click", confirmSync);
}

async function loadSyncData() {
    showLoader();
    try {
        const response = await pythonRequest(Python.sync.getSynced(sessionId));
        // Response shape: { session_schedule_id, synced_at, attendance_data: { summary, present_students, late_students, absent_students }, session_info }
        if (response.status === "success" && response.attendance_data) {
            syncData = response;
            renderSyncData(syncData);
        } else {
            // No data or error
            showToast(response.message || "No synced data found", "warning");
            // Still show empty state
            renderEmptyState();
        }
    } catch (err) {
        console.error("Error loading sync data:", err);
        showToast(err.message || "Failed to load session data", "error");
        renderEmptyState();
    } finally {
        hideLoader();
    }
}

function renderSyncData(data) {
    const summary = data.attendance_data.summary || { present: 0, late: 0, absent: 0, total: 0 };
    document.getElementById("sync-total").textContent = summary.total || 0;
    document.getElementById("sync-present").textContent = summary.present || 0;
    document.getElementById("sync-late").textContent = summary.late || 0;
    document.getElementById("sync-absent").textContent = summary.absent || 0;

    // Session info
    const info = data.session_info || {};
    const infoGrid = document.getElementById("session-info-grid");
    infoGrid.innerHTML = `
        <div class="info-item"><strong>Start:</strong> ${info.start_time ? formatDateTime(info.start_time) : "—"}</div>
        <div class="info-item"><strong>End:</strong> ${info.end_time ? formatDateTime(info.end_time) : "—"}</div>
        <div class="info-item"><strong>Min Attend:</strong> ${info.min_attend ?? "—"}</div>
        <div class="info-item"><strong>Max Attend:</strong> ${info.max_attend ?? "—"}</div>
        <div class="info-item"><strong>Synced At:</strong> ${data.synced_at ? formatDateTime(data.synced_at) : "—"}</div>
    `;

    // Present table
    const presentTbody = document.getElementById("sync-present-tbody");
    const presentList = data.attendance_data.present_students || [];
    presentTbody.innerHTML = presentList.map(s => `
        <tr>
            <td>${escapeHtml(s.student_code || "")}</td>
            <td>${escapeHtml(s.student_name || "")}</td>
            <td>${s.confidence_score ? s.confidence_score.toFixed(1) + '%' : "—"}</td>
        </tr>
    `).join("");

    // Late table
    const lateTbody = document.getElementById("sync-late-tbody");
    const lateList = data.attendance_data.late_students || [];
    lateTbody.innerHTML = lateList.map(s => `
        <tr>
            <td>${escapeHtml(s.student_code || "")}</td>
            <td>${escapeHtml(s.student_name || "")}</td>
            <td>${s.confidence_score ? s.confidence_score.toFixed(1) + '%' : "—"}</td>
        </tr>
    `).join("");

    // Absent table
    const absentTbody = document.getElementById("sync-absent-tbody");
    const absentList = data.attendance_data.absent_students || [];
    absentTbody.innerHTML = absentList.map(s => `
        <tr>
            <td>${escapeHtml(s.student_code || "")}</td>
            <td>${escapeHtml(s.student_name || "")}</td>
        </tr>
    `).join("");

    // Update status badge
    document.getElementById("sync-status").textContent = "Ready to submit";
    document.getElementById("sync-status").className = "badge badge-success";
}

function renderEmptyState() {
    document.getElementById("sync-total").textContent = "0";
    document.getElementById("sync-present").textContent = "0";
    document.getElementById("sync-late").textContent = "0";
    document.getElementById("sync-absent").textContent = "0";
    document.getElementById("session-info-grid").innerHTML = "<p>No data available</p>";
    document.getElementById("sync-present-tbody").innerHTML = "";
    document.getElementById("sync-late-tbody").innerHTML = "";
    document.getElementById("sync-absent-tbody").innerHTML = "";
    document.getElementById("sync-status").textContent = "No data";
    document.getElementById("sync-status").className = "badge badge-warning";
}

async function confirmSync() {
    if (submitted) return;
    if (!syncData) {
        showToast("No data to submit", "error");
        return;
    }

    submitted = true;
    const confirmBtn = document.getElementById("confirm-sync-btn");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Submitting…";

    try {
        const response = await pythonRequest(Python.sync.postAttendance(sessionId), {
            method: "POST",
        });
        if (response.status === "success") {
            showToast("Attendance posted successfully!", "success");
            document.getElementById("sync-status").textContent = "Submitted";
            document.getElementById("sync-status").className = "badge badge-success";
            confirmBtn.textContent = "Done";
            // Optionally redirect after a delay
        } else {
            showToast(response.message || "Failed to post attendance", "error");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm & Submit";
            submitted = false;
        }
    } catch (err) {
        console.error("Error posting attendance:", err);
        showToast(err.message || "Error submitting attendance", "error");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm & Submit";
        submitted = false;
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}