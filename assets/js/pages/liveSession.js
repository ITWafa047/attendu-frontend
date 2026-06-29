// =====================================================================
// pages/liveSession.js
// Live session page: WebSocket, webcam, attendance updates, timer.
// =====================================================================

/** @type {object} session data from /sessions/{id}/live */
let liveSessionData = null;
/** @type {WebSocket|null} */
let ws = null;
/** @type {MediaStream|null} */
let mediaStream = null;
/** @type {number|null} frameIntervalId */
let frameIntervalId = null;
/** @type {number|null} timerIntervalId */
let timerIntervalId = null;
/** @type {number} end time timestamp */
let endTimeMs = 0;
/** @type {boolean} sessionEnded = false */
let sessionEnded = false;

/** @type {object} summary counters */
const summary = {
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    notRecorded: 0,
};

// ---- Init ----
async function initLiveSessionPage() {
    const sessionId = getQueryParam("id");
    if (!sessionId) {
        showToast("No session ID provided", "error");
        window.location.href = "sessions.html";
        return;
    }

    try {
        // Load session snapshot
        const response = await laravelRequest(Laravel.sessions.live(sessionId));
        if (!response.success) {
            showToast(response.message || "Failed to load session", "error");
            window.location.href = "sessions.html";
            return;
        }
        liveSessionData = response.data;
        renderSessionHeader(liveSessionData);
        updateSummary(liveSessionData.summary || { total: 0, present: 0, late: 0, absent: 0, not_recorded: 0 });
        // Pre-populate table with any existing records? Typically empty at start.
        // Start timer
        const startTime = new Date(liveSessionData.start_time).getTime();
        const endTime = new Date(liveSessionData.end_time).getTime();
        endTimeMs = endTime;
        startTimer(endTime);

        // Open WebSocket
        openWebSocket(sessionId);

        // Start webcam and frame sender
        await startWebcam();

        // Wire "End Session" button
        document.getElementById("end-session-btn").addEventListener("click", endSessionManually);

    } catch (err) {
        console.error("Error loading live session:", err);
        showToast(err.message || "Failed to load session", "error");
        window.location.href = "sessions.html";
    }
}

// ---- Render header ----
function renderSessionHeader(data) {
    document.getElementById("session-title").textContent = data.course_name || "Session";
    document.getElementById("session-course-group").textContent =
        `${data.course_name || ""} · ${data.group_name || ""}`;
    document.getElementById("session-instructor").textContent =
        `Instructor: ${data.instructors || "—"}`;
}

// ---- Summary update ----
function updateSummary(summaryData) {
    summary.total = summaryData.total || 0;
    summary.present = summaryData.present || 0;
    summary.late = summaryData.late || 0;
    summary.absent = summaryData.absent || 0;
    summary.notRecorded = summaryData.not_recorded || 0;

    document.getElementById("stat-total").textContent = summary.total;
    document.getElementById("stat-present").textContent = summary.present;
    document.getElementById("stat-late").textContent = summary.late;
    document.getElementById("stat-absent").textContent = summary.absent;
    document.getElementById("stat-not-recorded").textContent = summary.notRecorded;
}

// ---- Timer ----
function startTimer(endTime) {
    timerIntervalId = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        document.getElementById("session-timer").textContent = formatCountdown(remaining);
        if (remaining <= 0) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
            // Session timer expired – end session
            if (!sessionEnded) {
                endSession("Timer expired");
            }
        }
    }, 1000);
}

// ---- WebSocket ----
function openWebSocket(sessionId) {
    const wsUrl = buildPythonWsUrl(Python.live.attendance, { session_schedule_id: sessionId });
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected");
        showToast("WebSocket connected", "success");
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleWebSocketMessage(msg);
        } catch (e) {
            console.error("Invalid WebSocket message:", e);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        showToast("WebSocket error", "error");
    };

    ws.onclose = () => {
        console.log("WebSocket closed");
        // If session not ended, maybe attempt reconnection? For now, just notify.
        if (!sessionEnded) {
            showToast("WebSocket disconnected. Please refresh.", "error");
        }
    };
}

function handleWebSocketMessage(msg) {
    if (msg.type === "session_info") {
        // session_info: { data: { session_schedule_id, student_count, status } }
        console.log("Session info:", msg.data);
        // Nothing else to do; summary may be updated later.
        return;
    }

    if (msg.type === "attendance_result") {
        const result = msg.data;
        const status = result.status;
        switch (status) {
            case "present":
            case "late":
                // Add to table, update summary
                addAttendanceRow(result);
                break;
            case "duplicate":
                // Show toast only
                showToast(result.message || "Student already recorded", "warning");
                break;
            case "unknown":
                // Toast warning
                showToast(result.message || "Face not recognized", "warning");
                break;
            case "rejected":
                // Toast error
                showToast(result.message || "Verification failed", "error");
                break;
            case "session_closed":
                // End session
                if (!sessionEnded) {
                    endSession("Session closed by server");
                }
                break;
            default:
                console.warn("Unknown attendance status:", status);
        }
    } else {
        console.warn("Unknown WebSocket message type:", msg.type);
    }
}

// ---- Attendance row ----
function addAttendanceRow(data) {
    const tbody = document.getElementById("live-attendance-tbody");
    const status = data.status; // "present" or "late"
    const badgeClass = `badge-${status}`;
    const confidence = data.confidence_score ? data.confidence_score.toFixed(1) : "—";
    const recordedAt = data.recorded_at ? formatTime(data.recorded_at) : "—";

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${escapeHtml(data.student_code || "")}</td>
        <td>${escapeHtml(data.student_name || "")}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
        <td>${confidence}</td>
        <td>${recordedAt}</td>
    `;
    tbody.appendChild(row);

    // Update summary counters
    if (status === "present") summary.present++;
    else if (status === "late") summary.late++;
    // total remains unchanged (total is expected count)
    // we don't decrement notRecorded because we don't have per-student tracking; but we can recalc from table later if needed.
    updateSummary(summary);
    // For simplicity, we just increment; notRecorded = total - present - late - absent (but we don't know absent yet)
    // We'll compute notRecorded from total minus present+late+absent (absent unknown)
    // Better to recalc from table rows? We'll just use the summary from server initially, then increment on present/late.
    // We'll update notRecorded as total - present - late - absent (assuming absent is 0 for now)
    // But we don't have absent count yet; we'll just leave as is.
    // The summary object will be updated when we get absent events (but absent events might not come via WS?).
    // The spec says unknown/rejected are toast-only, not table. So absent may be determined after sync.
    // We'll maintain summary only from present/late increments, and notRecorded = total - present - late - absent (absent will be updated only after sync, but we won't have absent during live). So just show present/late counts.
    // We'll set notRecorded = total - present - late (assuming absent 0 for now)
    summary.notRecorded = summary.total - summary.present - summary.late;
    updateSummary(summary);
}

// ---- Webcam ----
async function startWebcam() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
            },
            audio: false,
        });
        const video = document.getElementById("webcam-video");
        video.srcObject = mediaStream;
        await video.play();

        // Start capturing frames every 500ms
        frameIntervalId = setInterval(sendFrame, 500);
    } catch (err) {
        console.error("Webcam error:", err);
        showToast("Could not access webcam. Please allow camera access.", "error");
    }
}

function sendFrame() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const video = document.getElementById("webcam-video");
        const canvas = document.getElementById("webcam-canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to JPEG blob (binary)
        canvas.toBlob((blob) => {
            if (blob) {
                ws.send(blob);
            }
        }, "image/jpeg", 0.8);
    }
}

function stopWebcam() {
    if (frameIntervalId) {
        clearInterval(frameIntervalId);
        frameIntervalId = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
    const video = document.getElementById("webcam-video");
    video.srcObject = null;
}

// ---- End session ----
async function endSession(reason) {
    if (sessionEnded) return;
    sessionEnded = true;
    showToast(`Session ending: ${reason}`, "info");

    // Stop webcam and frame sending
    stopWebcam();

    // Close WebSocket
    if (ws) {
        ws.close();
        ws = null;
    }

    // Clear timers
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }

    // Call POST /sync/session/{id}
    const sessionId = getQueryParam("id");
    if (!sessionId) {
        showToast("No session ID", "error");
        window.location.href = "sessions.html";
        return;
    }

    showLoader();
    try {
        const response = await pythonRequest(Python.sync.session(sessionId), {
            method: "POST",
        });
        if (response.status === "success") {
            showToast("Session synced successfully", "success");
            // Navigate to sync-final.html
            window.location.href = `sync-final.html?id=${sessionId}`;
        } else {
            showToast(response.message || "Failed to sync session", "error");
            // Stay on page, but maybe allow retry?
        }
    } catch (err) {
        console.error("Sync error:", err);
        showToast(err.message || "Error syncing session", "error");
    } finally {
        hideLoader();
    }
}

function endSessionManually() {
    if (!sessionEnded) {
        if (confirm("Are you sure you want to end this session early?")) {
            endSession("Manually ended by instructor");
        }
    }
}

// ---- Helper escape ----
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}