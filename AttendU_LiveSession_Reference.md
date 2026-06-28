# AttendU — Live Session Module Reference

This documents the **actual real-time flow** for the Live Session page, based
on the new spec (supersedes the earlier "polling every 5s" assumption — the
real flow uses a **WebSocket** for live attendance + a **REST sync flow** for
finalizing the session).

---

## 1. Full Flow Overview

```
1. Instructor clicks "Start Session"
   → POST /sessions/start
2. Frontend navigates to live-session.html?id={session_schedule_id}
   → opens WebSocket: /ws/attendance?session_schedule_id={id}
   → opens webcam, starts sending frames
3. WebSocket streams attendance_result events in real time
   → frontend updates table/badges/toasts per event type
4. Timer (end_time - start_time) expires OR backend sends "session_closed"
   → frontend locks webcam + closes WebSocket
   → POST /sync/session/{session_schedule_id}
5. Frontend navigates to sync-final.html
   → GET /sync/sessions/{session_schedule_id}  → render summary cards/tables
   → instructor reviews, then confirms
   → POST /sync/post-attendance/{session_schedule_id}
6. (Optional, non-essential) DELETE /sync/session/{session_schedule_id} → cleanup
```

---

## 2. REST Endpoints

### `POST /sessions/start`
Starts the session and tells backend to prep the AI model.

**Request:**
```json
{
  "session_schedule_id": 0,
  "start_time": "2026-06-28T11:51:21.830Z",
  "end_time": "2026-06-28T11:51:21.830Z"
}
```
**Response:**
```json
{
  "success": true,
  "message": "تم بدء السيشن بنجاح وتم إرسال البيانات للنظام",
  "data": { "session_id": "string", "total_students": "string" }
}
```
**Frontend action:** on success, redirect to `live-session.html?id={session_id}`.

---

### `GET /sessions/{id}/live`
Snapshot of session state (used for initial page load / fallback if WS drops).

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "string",
    "course_name": "string",
    "session_type": "string",
    "group_name": "string",
    "start_time": "string",
    "end_time": "string",
    "status": "string",
    "instructors": "string",
    "students": "string",
    "summary": {
      "total": "string",
      "present": "string",
      "late": "string",
      "absent": "string",
      "not_recorded": "string"
    }
  }
}
```
**Frontend action:** use this to render the session header info + initial summary cards before the WebSocket starts streaming live updates.

---

### `POST /sync/session/{session_schedule_id}`
Called once the timer ends or `session_closed` is received via WS. Finalizes/syncs attendance.

**Success (200):**
```json
{
  "status": "success",
  "message": "Session 2 attendance synced successfully",
  "session_schedule_id": "2",
  "synced_records": 2,
  "summary": { "present_count": 1, "late_count": 0, "absent_count": 0, "total_expected": 1 },
  "inserted_id": "6a3c64cad56048f9b2fe7f31"
}
```
**Frontend action:** turn off webcam → close WebSocket → navigate to `sync-final.html`.

**Errors:**
- `404` → `{"detail": "Session 2 not found"}` or `{"detail": "No attendance records found for session 2"}`
- `500` → `{"detail": "Failed to sync session: ..."}`

---

### `GET /sync/sessions/{session_schedule_id}`
Used on `sync-final.html` to render the final review screen.

**Success:**
```json
{
  "session_schedule_id": "2",
  "synced_at": "2026-06-25T02:14:18.040963",
  "attendance_data": {
    "summary": { "present": 1, "late": 0, "absent": 0, "total": 1 },
    "present_students": [
      { "student_code": "1000263922", "student_name": "نور المعلم2", "confidence_score": 20.229474703470864 }
    ],
    "late_students": [],
    "absent_students": []
  },
  "session_info": {
    "min_attend": 10,
    "max_attend": 30,
    "start_time": "2026-06-24T19:25:00",
    "end_time": "2026-06-24T22:00:00"
  }
}
```
**Frontend action:** render Summary Cards + Present Table + Late Table + Absent Table + Session Information block.

**No sync yet:**
```json
{ "status": "success", "message": "No synced sessions found", "total_sessions": 0, "sessions": [] }
```
**Error 500:** `{"detail": "Failed to retrieve sessions: ..."}`

---

### `POST /sync/post-attendance/{session_schedule_id}`
Final confirmation — pushes synced attendance to Laravel backend permanently.

**Success:**
```json
{ "status": "success", "message": "Attendance posted successfully" }
```
**Frontend action:** disable the confirm/submit button, show success toast.

**Errors:**
- `404` → `{"detail": "No final attendance found for session 2"}`
- `502` → `{"detail": "Failed to post to backend: ..."}`
- `500` → `{"detail": "Failed to post attendance: ..."}`

---

### `DELETE /sync/session/{session_schedule_id}`
Optional cleanup — **not essential to the UI flow**, can be skipped in v1.

**Success:**
```json
{ "status": "success", "message": "Session 2 data cleaned up", "deleted_records": 2, "session_schedule_id": "2" }
```
**Error 500:** `{"detail": "Failed to delete session data: ..."}`

---

## 3. WebSocket: `/ws/attendance?session_schedule_id={id}`

### Connection opens → first message
```json
{
  "type": "session_info",
  "data": { "session_schedule_id": "2", "student_count": 1, "status": "ready" }
}
```
**Frontend on connect:** open webcam, start sending frames, mark session UI as "ready".

### All subsequent live events arrive as:
```json
{ "type": "attendance_result", "data": { ... } }
```

The `data.status` field determines what the frontend does. Six cases:

| `status` | Example payload fields | Frontend behavior |
|---|---|---|
| **`present`** | `student_code`, `student_name`, `confidence_score`, `recorded_at`, `status:"present"` | Add student row to table, badge = Present, show success toast |
| **`late`** | same shape, `status:"late"` | Add student row to table, badge = Late |
| **`duplicate`** | `status:"duplicate"`, `message:"Student already marked"` | Do **not** add a new row — show "Already Recorded" indicator only |
| **`unknown`** | `message`: `"No face detected"` / `"Face not recognized"` / `"Turn head to verify liveness"` | Show as **Toast Warning** only, no table change |
| **`rejected`** | `message`: e.g. `"Anti-spoofing failed"` (+ `details:"Photo detected"`), or `"Low confidence match (0.71)"` (+ `student_code`, `confidence_score`) | Show **Toast Error**, do not add student. Causes: blur, brightness, anti-spoof, low confidence, other verification failures |
| **`session_closed`** | `message:"Session is not active"`, `session_schedule_id` | Lock webcam + close WebSocket. Triggered when the session timer (end_time − start_time) ends. Then call `POST /sync/session/{id}` → navigate to `sync-final.html` |

---

## 4. Pages involved

| Page | Purpose |
|---|---|
| `live-session.html` | Opens WebSocket + webcam, renders live table/badges/toasts per attendance_result event, runs the countdown timer |
| `sync-final.html` | Post-session review screen — calls `GET /sync/sessions/{id}`, renders summary cards + present/late/absent tables + session info, has a "confirm & submit" button that calls `POST /sync/post-attendance/{id}` |

---

## 5. Notes / things to handle carefully when coding this later

1. **Timer logic** — frontend must compute `end_time - start_time` itself and start a countdown on session load; don't rely solely on the backend to push `session_closed` (handle both: timer expiry locally AND the WS event, whichever comes first).
2. **Webcam lifecycle** — webcam must be explicitly stopped (`MediaStream.getTracks().forEach(t => t.stop())`) on `session_closed`, on sync, and on page navigate-away (cleanup in case of early exit).
2. **Reconnect strategy** — decide whether to auto-reconnect the WebSocket if it drops mid-session, or fall back to `GET /sessions/{id}/live` snapshot polling as backup.
3. **Toast vs table update** — only `present`/`late` add rows; `duplicate`/`unknown`/`rejected` are toast-only (don't touch the table).
4. **Button disable** — the "confirm & submit attendance" button on `sync-final.html` must disable itself immediately after a successful `POST /sync/post-attendance`, to prevent double-submits.
5. **Cleanup endpoint (`DELETE /sync/session/{id}`)** — explicitly marked non-essential by the spec; safe to leave out of v1 and add later if needed.
6. **Confidence score display** — shown for present/late/rejected (low-confidence) cases; worth showing in the UI as a small percentage/badge next to the student name.
7. **Arabic names** — student_name fields come in Arabic (e.g. "نور المعلم2") — make sure table/font supports RTL text rendering properly.
