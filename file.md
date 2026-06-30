# AttendU Frontend API Review Summary

## Overview
This summary reviews the frontend implementation against the documented API endpoints in `assets/APIs/Laravel.json` and `assets/APIs/Python.json`, plus the endpoint mappings in `assets/js/core/config.js`.

## API endpoint coverage

### Authentication
- `POST /login` → `assets/js/core/auth.js` via `laravelRequest(Laravel.auth.login)`
  - Request: `email`, `password`
  - Response: `message`, `user`, `role`, `token`
- `POST /logout` → `assets/js/core/auth.js` via `laravelRequest(Laravel.auth.logout)`
- `GET /me` → `assets/js/core/auth.js` via `laravelRequest(Laravel.auth.me)`

### Sidebar + Navbar
- UI shell only. Uses auth state and current user retrieval.
- No additional API body validation beyond logout and `/me`.

### Students
- `GET /students` → list page and warning modal student select.
- `POST /students` → student creation via `assets/js/pages/studentForm.js`
  - Uses `FormData` with `first_name`, `last_name`, `student_code`, `national_id`, `email`, `phone_number`, `gender`, `group_id`, `course_ids[]`, `face_image`.
- `PUT /students/{id}` / `POST /students/{id}` for update via `studentForm.js`
  - Update mode omits immutable identity fields and sends optional `national_id`, `registered_at`, `email`, `phone_number`, `gender`, `group_id`, `course_ids[]`, `face_image`.
- `DELETE /students/{id}` likely supported by list page delete flow.

### Courses & Groups
- `GET /courses`, `POST /courses`, `PUT /courses/{id}`, `DELETE /courses/{id}`
  - `assets/js/pages/courseForm.js` sends `course_name`, `course_code`, `description`, `start_date`, `end_date`.
- `GET /groups`, `POST /groups`, `PUT /groups/{id}`, `DELETE /groups/{id}`
  - `assets/js/pages/groupForm.js` sends `group_name`, `group_code`, `academic_year`, `course_id`.
- These field names appear aligned with documented course/group schema.

### Sessions
- `GET /sessions` → list page.
- `POST /sessions` / `PUT /sessions/{id}` → `assets/js/pages/sessionForm.js`
  - Frontend sends: `title`, `description`, `course_id`, `group_id`, `instructor_id`, `status`, `start_time`, `end_time`.
  - Documented session schema appears to expect different names or additional fields, so this is a likely mismatch.
- `GET /sessions/{id}/live` → `assets/js/pages/liveSession.js` to initialize live attendance.
- `POST /sessions/start` is present in config but not otherwise clearly used.

### Live Session / Python WebSocket
- `assets/js/core/config.js` defines Python live endpoint `Python.live.attendance = "/ws/attendance"`.
- `assets/js/pages/liveSession.js` opens a WebSocket with `buildPythonWsUrl(Python.live.attendance, { session_schedule_id: sessionId })`.
- Live attendance uses WebSocket messages; request/response body contracts are separate from standard REST docs.
- Python sync flow uses `assets/js/pages/syncFinal.js` with:
  - `POST /sync/session/{sessionScheduleId}`
  - `POST /sync/post-attendance/{sessionScheduleId}`
  - `GET /sync/sessions/{sessionScheduleId}`

### Attendance Policies
- `GET /attendance-policies`, `POST /attendance-policies`, `PUT /attendance-policies/{id}`, `DELETE /attendance-policies/{id}`
- `assets/js/pages/policyForm.js` sends JSON fields consistent with docs: `course_id`, `max_absences_allowed`, `min_attend`, `max_attend`.

### Warnings
- `GET /warnings` → warnings list page.
- `POST /warnings/{studentId}` → `assets/js/pages/warningForm.js`
  - Frontend sends body `{ reason }`.
  - Documented request likely expects `course_id` and `warning_reason`, so this is a mismatch.

### Reports
- `GET /reports/students` → `assets/js/pages/reports.js`
- `GET /reports/students/{id}` → `assets/js/pages/reportDetail.js`
- Response handling uses `response.success` and `response.data`, matching the documented wrapper.

### Users / Instructors
- `GET /users` → users list page.
- `POST /users/instructor` → `assets/js/pages/userForm.js`
  - Frontend sends `first_name`, `last_name`, `email`, `phone_number`, `gender`, `password`, `password_confirmation`.
  - Backend docs likely require `name` instead of separate first/last, indicating a mismatch.
- `DELETE /users/{id}` likely used by the list page.

### Dashboard Stats
- `GET /dashboard/stats` → `assets/js/pages/dashboard.js`
- Response `data` is used correctly according to documented wrapper.

## Key Findings
- `auth.js` and login flow align with documented auth endpoints.
- `studentForm.js` uses multipart `FormData`, matching the image-upload API flow.
- `courseForm.js`, `groupForm.js`, `policyForm.js`, `reports.js`, and `dashboard.js` are mostly aligned with documented payloads.
- `sessionForm.js` is the highest-risk mismatch due to field names.
- `warningForm.js` likely sends the wrong warning payload.
- `userForm.js` likely needs to map `first_name`/`last_name` into the API’s expected instructor payload.
- `liveSession.js` correctly uses the Python WebSocket flow instead of REST submit bodies.

## Recommended Fixes
1. Verify session payload fields in `assets/js/pages/sessionForm.js` and update to exactly match the backend request schema.
2. Fix warning creation payload in `assets/js/pages/warningForm.js` to include documented fields such as `course_id` and `warning_reason`.
3. Confirm and align instructor creation payload in `assets/js/pages/userForm.js` with `POST /users/instructor` expectations.
4. Validate if `POST /sessions/start` is actually required for the frontend flow or can be removed from `assets/js/core/config.js`.
5. Confirm Python live WS message contract separately from Laravel REST contracts.

## Notes
- `assets/js/core/api.js` handles auth headers, JSON body serialization, and FormData uploads consistently.
- `assets/js/core/config.js` centralizes endpoint definitions and Python WebSocket URL construction.
- This summary focuses on API contract validation and frontend request/response alignment, not CSS or layout review.
