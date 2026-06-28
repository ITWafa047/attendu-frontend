# AttendU Frontend — Project Structure Plan

A clean multi-page frontend built with plain HTML, CSS, and JavaScript.
Every page is a real `.html` file, and shared behavior lives in reusable JS modules.

---

## 1. Folder structure

```
attendu-frontend/
│
├── index.html                  → redirects to login or dashboard based on token
├── login.html
├── dashboard.html
│
├── students.html
├── sessions.html
├── live-session.html           → ?id={session_id}
├── sync-final.html             → final synchronization page
├── courses.html
├── groups.html
├── policies.html               → attendance policies
├── warnings.html
├── reports.html
├── report-detail.html          → ?id={student_id}
├── users.html                  → instructors management (admin only)
│
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── avatar-placeholder.png
│   │   └── icons/               → sidebar, actions, status SVGs
│   │
│   ├── css/
│   │   ├── base/
│   │   │   ├── reset.css
│   │   │   ├── variables.css    → colors, spacing, font tokens
│   │   │   └── typography.css
│   │   │
│   │   ├── layout/
│   │   │   ├── layout.css       → page grid: sidebar + content
│   │   │   ├── sidebar.css
│   │   │   └── navbar.css
│   │   │
│   │   ├── components/
│   │   │   ├── buttons.css
│   │   │   ├── forms.css        → inputs, selects, file upload, validation
│   │   │   ├── tables.css
│   │   │   ├── modals.css
│   │   │   ├── cards.css        → dashboard cards
│   │   │   ├── badges.css       → status badges and warning labels
│   │   │   ├── pagination.css
│   │   │   ├── toast.css        → notifications
│   │   │   └── loader.css       → spinners, skeletons
│   │   │
│   │   └── pages/
│   │       ├── login.css
│   │       ├── dashboard.css
│   │       ├── students.css
│   │       ├── sessions.css
│   │       ├── live-session.css
│   │       ├── courses-groups.css → shared styles for simple CRUD pages
│   │       ├── policies.css
│   │       ├── warnings.css
│   │       ├── reports.css
│   │       └── users.css
│   │
│   └── js/
│       ├── core/
│       │   ├── config.js        → base URL and endpoint constants
│       │   ├── api.js           → fetch wrapper with auth, JSON handling, errors
│       │   ├── auth.js          → login, logout, token/user helpers, guardPage()
│       │   ├── storage.js       → localStorage helpers
│       │   ├── utils.js         → date formatting, debounce, query-string builder
│       │   ├── ui.js            → toast, modal, loader helpers
│       │   └── validators.js    → required field and image validation
│       │
│       ├── components/
│       │   ├── sidebar.js      → role-aware sidebar HTML
│       │   ├── navbar.js       → top bar with user and logout
│       │   ├── table.js        → reusable table renderer
│       │   ├── pagination.js   → page navigation controls
│       │   └── searchFilter.js → search and filter bar logic
│       │
│       └── pages/
│           ├── login.js
│           ├── dashboard.js
│           ├── students.js        → list, search, group filter
│           ├── studentForm.js     → add/edit modal, multipart upload
│           ├── courses.js
│           ├── groups.js
│           ├── sessions.js        → list, search, type/day filter
│           ├── sessionForm.js     → add/edit session modal
│           ├── liveSession.js     → start session, poll live attendance
│           ├── policies.js
│           ├── warnings.js        → list and manual warnings
│           ├── reports.js         → student summary table
│           ├── reportDetail.js    → student detail report
│           └── users.js          → instructors CRUD
│
└── README.md
```

---

## 2. Why this structure

- One HTML page per feature keeps the app modular and easy to reason about.
- Shared behavior lives in `core/` so auth, API, and UI patterns are consistent.
- Reusable UI pieces live in `components/`, so table, pagination, sidebar, and navbar code is not duplicated.
- Page-specific logic stays in `pages/`, keeping each screen focused on its own API and DOM updates.
- CSS organization mirrors this architecture: `base` → `layout` → `components` → `pages`.

---

## 3. Core JS responsibilities

| File | Purpose |
|---|---|
| `config.js` | `BASE_URL` and endpoint constants |
| `api.js` | `fetch` wrapper with auth header, JSON parsing, and error handling |
| `auth.js` | login/logout, token/user helpers, role-based page guard |
| `storage.js` | localStorage helpers for token and user data |
| `utils.js` | date/time formatting, debounce, query-string builder |
| `ui.js` | toast notifications, modal controls, loader helpers |
| `validators.js` | required fields, email validation, image type/size checks |

---

## 4. Role-based access

`sidebar.js` and `auth.js` manage both menu visibility and route protection.

- Admin sees: Students, Sessions, Courses, Groups, Policies, Warnings, Reports, Users.
- Instructor sees: Sessions and Live Session workflows only.
- Admin-only pages use `guardPage(['admin'])` to redirect unauthorized users back to an allowed page.

---

## 5. Recommended build order

1. `core/` files: `config`, `api`, `auth`, `storage`, `ui`, `utils`, `validators`
2. `login.html` + `login.js`
3. `components/sidebar.js`, `components/navbar.js`, and layout CSS
4. `dashboard.html`
5. `students.html` (CRUD with image upload)
6. `courses.html` and `groups.html`
7. `sessions.html` and `sessionForm.js`
8. `live-session.html` and `liveSession.js`
9. `policies.html`, `warnings.html`, `reports.html`, `users.html`

---

## 6. Backend contract notes

- Student create/edit requests use `multipart/form-data`.
- Send `course_ids[]` as array fields, not as a JSON string.
- Live session polling: `GET /sessions/{id}/live` every 5 seconds.
- There is no frontend `end session` endpoint; the UI simply stops polling and navigates away.
- `POST /attendance/store` is handled by the AI model, not the frontend.
- Face image validation: `jpg/jpeg/png`, max `10MB`, min `500×650px`.
- `GET /students` is paginated at 10 items per page; `pagination.js` expects `current_page`, `last_page`, and `total`.

---

## 7. Frontend modules roadmap

1. Core infrastructure — `config.js`, `api.js`, `auth.js`, `storage.js`, `ui.js`, `utils.js`, `validators.js`
2. Login — critical first screen
3. Sidebar + Navbar — shared shell and navigation
4. Students — main entity, complex form, high value
5. Courses & Groups — simple CRUD, important dependencies
6. Sessions — create/list/edit sessions
7. Live Session — polling attendance updates
8. Attendance Policies — threshold rules for live sessions
9. Warnings — auto/manual warning management
10. Reports — aggregated student/session analytics
11. Users — instructor management
12. Dashboard — summary view after data is available
