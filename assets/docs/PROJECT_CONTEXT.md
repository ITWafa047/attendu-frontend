**Last Updated:** 2026-06-29
**Completed Modules:** 3/12
**Current Module:** Sidebar + Navbar (shared shell)
**Current Progress:** 65%
**Next Module:** Students

---

# Project Overview

**Project name:** AttendU

**Purpose:** A smart attendance system for university courses. Instructors run live class sessions where an AI face-recognition service automatically identifies and marks students present/late/absent in real time, replacing manual roll calls. Admins manage students, courses, groups, sessions, attendance policies, warnings, reports, and instructor accounts. The system has two user roles: **admin** (full access) and **instructor** (sessions only).

**Tech stack:**
- **Frontend (this project):** Plain HTML + CSS + JavaScript. No framework, no build tool, no bundler, no npm. Multi-page app — every page is a real `.html` file.
- **Backend #1 — Laravel:** Main REST API. Handles auth, students, courses, groups, sessions, attendance records, attendance policies, warnings, reports, and instructor/user management. OpenAPI spec available at upload path `Laravel.json`.
- **Backend #2 — Python (AI service):** Handles face recognition, live-session WebSocket streaming, and the post-session sync/finalize flow. OpenAPI spec available at upload path `Python.json`. **No base URL was declared in this spec** — a placeholder is in use (see Known Issues).

**Project architecture:**
- One `.html` file per page/module (no client-side router, no SPA).
- Shared logic lives in `assets/js/core/*.js` — written once, loaded on every protected page, in a strict dependency order (see Files section).
- Shared UI pieces (sidebar, navbar, and later: table renderer, pagination, modal helpers) live in `assets/js/components/*.js` and are injected into placeholder DOM containers (`#sidebar`, `#navbar`) via render functions called from inline `<script>` blocks at the bottom of each page.
- Page-specific logic lives in `assets/js/pages/*.js`, one file per page.
- CSS is layered: `base` (reset, design tokens, typography) → `layout` (app shell skeleton) → `components` (reusable UI: buttons, forms, toast, loader, and later: tables, pagination, modals, badges) → `pages` (page-specific overrides only).
- Every protected page must call `guardPage(allowedRoles)` and `renderAppShell({ activeKey, pageTitle })` in an inline script at the bottom of its `<body>`, after all core + component scripts are loaded.

**Folder structure** (✅ = file exists on disk right now, ⬜ = planned but not yet created):

```
attendu-frontend/
│
├── ✅ login.html
├── ✅ dashboard.html                      (PLACEHOLDER shell only — see Current Module)
├── ⬜ students.html
├── ⬜ courses.html
├── ⬜ groups.html
├── ⬜ sessions.html
├── ⬜ live-session.html
├── ⬜ sync-final.html
├── ⬜ policies.html
├── ⬜ warnings.html
├── ⬜ reports.html
├── ⬜ report-detail.html
├── ⬜ users.html
│
├── assets/
│   ├── css/
│   │   ├── base/
│   │   │   ├── ✅ reset.css
│   │   │   ├── ✅ variables.css
│   │   │   └── ✅ typography.css
│   │   ├── layout/
│   │   │   ├── ✅ layout.css
│   │   │   ├── ✅ sidebar.css
│   │   │   └── ✅ navbar.css
│   │   ├── components/
│   │   │   ├── ✅ buttons.css
│   │   │   ├── ✅ forms.css
│   │   │   ├── ✅ toast.css
│   │   │   ├── ✅ loader.css
│   │   │   ├── ⬜ tables.css         (needed next — Students module)
│   │   │   ├── ⬜ pagination.css     (needed next — Students module)
│   │   │   ├── ⬜ modals.css         (needed next — Students module)
│   │   │   └── ⬜ badges.css         (needed next — Students module)
│   │   └── pages/
│   │       ├── ✅ login.css
│   │       ├── ⬜ students.css
│   │       ├── ⬜ courses-groups.css
│   │       ├── ⬜ sessions.css
│   │       ├── ⬜ live-session.css
│   │       ├── ⬜ policies.css
│   │       ├── ⬜ warnings.css
│   │       ├── ⬜ reports.css
│   │       ├── ⬜ users.css
│   │       └── ⬜ dashboard.css
│   │
│   └── js/
│       ├── core/
│       │   ├── ✅ config.js
│       │   ├── ✅ storage.js
│       │   ├── ✅ api.js
│       │   ├── ✅ auth.js
│       │   ├── ✅ ui.js
│       │   ├── ✅ utils.js
│       │   └── ✅ validators.js
│       ├── components/
│       │   ├── ✅ sidebar.js
│       │   ├── ✅ navbar.js
│       │   ├── ⬜ table.js
│       │   ├── ⬜ pagination.js
│       │   └── ⬜ searchFilter.js
│       └── pages/
│           ├── ✅ login.js
│           ├── ⬜ dashboard.js
│           ├── ⬜ students.js
│           ├── ⬜ studentForm.js
│           ├── ⬜ courses.js
│           ├── ⬜ groups.js
│           ├── ⬜ sessions.js
│           ├── ⬜ sessionForm.js
│           ├── ⬜ liveSession.js
│           ├── ⬜ policies.js
│           ├── ⬜ warnings.js
│           ├── ⬜ reports.js
│           ├── ⬜ reportDetail.js
│           └── ⬜ users.js
```

Reference/spec files that exist outside the codebase (uploaded by the user, used for research, never modified):
- `Laravel.json` — full OpenAPI 3.1 spec for the Laravel backend.
- `Python.json` — OpenAPI spec for the Python AI service (no `servers` field).
- `AttendU_System.txt` — original system description; source of the module list/build order.
- `Live_Session.pdf` — source for the saved Live Session reference doc (see below).
- `AttendU_Frontend_Structure.md` (delivered earlier as a planning artifact) — the original full folder/file plan, superseded in detail by this document but still valid as the high-level rationale.
- `AttendU_LiveSession_Reference.md` (delivered earlier as a planning artifact) — full REST + WebSocket flow for the Live Session module (all 6 `attendance_result` status cases, sync endpoints, implementation notes). **Not yet implemented in code.**

---

# Modules Status

Build order was deliberately chosen by dependency chains, not arbitrary feature priority (a module can't be built before what it depends on exists).

| # | Module | Status | Summary |
|---|---|---|---|
| 1 | Core Infrastructure | ✅ Completed | `config.js`, `storage.js`, `api.js`, `auth.js`, `ui.js`, `utils.js`, `validators.js` — all 7 files built, one critical bug found and fixed in `api.js`, all logic unit-tested via Node scripts. |
| 2 | Login | ✅ Completed | `login.html` + `login.js` + `login.css`, plus the first versions of `typography.css`, `buttons.css`, `forms.css`, `toast.css`, `loader.css`. Tested end-to-end with Playwright screenshots (desktop, mobile, validation errors, network-error toast). |
| 3 | Sidebar + Navbar (shared shell) | ✅ Completed | `layout.css`, `sidebar.css`, `navbar.css`, `sidebar.js`, `navbar.js`, plus a placeholder `dashboard.html` built solely to host/test the shell. Tested with Playwright for both roles + mobile drawer; one bug found and fixed (hamburger icon rendering at 0×0). |
| 4 | Students | 🟡 In Progress (~10%) | API research phase done (see Current Module below). No HTML/CSS/JS files created yet. |
| 5 | Courses & Groups | ⬜ Not Started | Simple CRUD pages; depend on nothing but Core Infra + shell. |
| 6 | Sessions | ⬜ Not Started | Depends on Courses, Groups, and Users(instructors) existing. |
| 7 | Live Session | ⬜ Not Started | Full reference doc already saved (`AttendU_LiveSession_Reference.md`) covering the WebSocket + sync flow in detail. Blocked on confirming the Python API-key delivery mechanism (see Known Issues). |
| 8 | Attendance Policies | ⬜ Not Started | Simple CRUD. |
| 9 | Warnings | ⬜ Not Started | Depends on attendance data existing to be meaningful. |
| 10 | Reports | ⬜ Not Started | Aggregates students/sessions/attendance data. |
| 11 | Users / Instructors | ⬜ Not Started | Admin-only, simple CRUD. |
| 12 | Dashboard (real content) | ⬜ Not Started | Current `dashboard.html` is a placeholder shell only — needs real stat cards from `GET /dashboard/stats`. |

---

# Current Module

**Module:** Students (4th in the build order)

**What has been completed:**
- Pulled and confirmed the exact Laravel API schemas needed to build this module (full request/response shapes documented in the API Integration section below): `StudentResource`, `StoreStudentRequest`, `UpdateStudentRequest`, `Course`, and the inline `Group` list shape.
- Confirmed that `/students/{id}` has **three** methods in the spec: `GET` (show), `PUT` (operationId `students.update`), `DELETE` (destroy), and **also** `POST` (operationId `student.update_3`). The `POST` variant is the multipart-friendly update endpoint and is the one already wired into `config.js` as `Laravel.students.updateWithImage(id)`.
- Confirmed (re-affirming an earlier explicit user decision) that the `PUT` variant is intentionally **not** included in `config.js` — all student edits (with or without a new photo) will go through the single `POST /students/{id}` endpoint.
- Discovered a face-image size discrepancy between create and update (see Known Issues #3) that needs a decision before `studentForm.js` is built.

**What is currently being worked on:** Nothing yet built — the next concrete step is the component CSS this module needs (`tables.css`, `pagination.css`, `modals.css`, `badges.css`), since they don't exist yet and the Students list/form pages depend on them.

**Last completed task:** Pulling and verifying the Students/Courses/Groups API schemas from `Laravel.json` (see exact shapes in API Integration below).

**Current progress percentage:** ~10% of this module (research only; zero implementation files created so far).

---

# Files

Every file created or modified across the whole project so far, in build order.

### Core (`assets/js/core/`)

**`config.js`**
- Purpose: Single source of truth for both backend base URLs and every endpoint path.
- Main functionality: `BASE_URL_LARAVEL`; `Laravel` object grouped by feature (`Laravel.auth.login`, `Laravel.students.show(id)`, etc.); `PYTHON_CONFIG` object (`BASE_URL`, `WS_BASE_URL`, `API_KEY`); `Python` object (currently only `sync.*` and `live.attendance`); `buildPythonWsUrl(endpoint, params)` helper that appends `api_key` as a query param.
- Important notes: By explicit user decision, these endpoints are **intentionally excluded**: `Laravel.students.update` (PUT), `Laravel.attendance.store`, `Python.upload.image`, `Python.upload.updateStudentImage`, `Python.students.destroy`, `Python.session.start`, `Python.session.info`, `Python.home`. Do not re-add these without asking the user first — they were removed twice after being added back once. Contains a security comment flagging the hardcoded `API_KEY` as frontend-visible.

**`storage.js`**
- Purpose: `localStorage` wrapper for the session.
- Main functionality: `setToken`/`getToken`/`removeToken`, `setUser`/`getUser`/`removeUser`, `clearSession()`. Keys: `attendu_token`, `attendu_user`.
- Important notes: No bugs found here at any review point; left untouched since first written.

**`api.js`**
- Purpose: All HTTP calls to either backend go through this file.
- Main functionality: `laravelRequest(endpoint, options)` (auto Bearer token), `pythonRequest(endpoint, options)` (auto `X-API-Key` header), both built on an internal `apiRequest(baseUrl, endpoint, options)` with a 15-second `AbortController` timeout and automatic `FormData` detection (skips `Content-Type` so the browser sets the multipart boundary).
- Important notes: **A critical bug was found and fixed here.** The non-OK response throw (real status/message) was happening inside a `try` block whose `catch` then overwrote it with a generic `"Network error - server unreachable"`, discarding real 401/422 errors. Fixed by re-throwing `APIError`-named errors immediately at the top of the catch block, before the generic fallback. Verified with a simulated 401 test — confirmed working. Separately, `pythonRequest`'s `X-API-Key` header is an **unconfirmed assumption** (see Known Issues #1).

**`auth.js`**
- Purpose: Login/logout/session/role-guard logic.
- Main functionality: `login(email, password)`, `logout()`, `getCurrentUser()`, `refreshCurrentUser()` (calls `/me`), `isLoggedIn()`, `guardPage(allowedRoles)`.
- Important notes: Laravel's actual `/login` response is `{ message, user: {id,name,email,phone,gender}, role, token }` — note `role` is a **sibling** field, not nested inside `user`. `login()` merges them into one object (`{ ...user, role }`) before saving. `guardPage()` redirect targets were chosen by Claude with no strong user preference given: not-logged-in → `login.html`; logged-in-but-wrong-role → `dashboard.html`.

**`ui.js`**
- Purpose: Shared, markup-free UI primitives.
- Main functionality: `showToast(message, type, duration)` (auto-creates `#toast-container`), `openModal(id)`/`closeModal(id)` (expects a documented modal markup convention — see UI/UX Notes), `showLoader()`/`hideLoader()` (ref-counted `#global-loader` overlay).
- Important notes: Modal close is auto-wired globally via `[data-modal-close]` attribute clicks and the Escape key — individual pages don't need to add their own close-button listeners.

**`utils.js`**
- Purpose: Generic formatting/helper functions used across pages.
- Main functionality: `formatDate`/`formatTime`/`formatDateTime`/`getArabicDayName` (hardcoded Arabic weekday name array); `debounce(fn, delay)`; `buildQueryString`/`getQueryParam`/`getAllQueryParams`; `msUntil`/`getCountdownParts`/`formatCountdown` (built specifically for the future Live Session countdown timer).
- Important notes: All functions were unit-tested via standalone Node scripts with real output verification (e.g. confirmed `formatCountdown(3700000)` → `"1:01:40"`).

**`validators.js`**
- Purpose: Form validation, including the face-image rules from the spec.
- Main functionality: `isRequired`, `isValidEmail`, `isValidPassword(value, minLength=6)`, `isNumeric`, `minLength`, `maxLength`, `validateForm(values, rules)` (generic, returns `{valid, errors}`), `FACE_IMAGE_RULES` (`jpg/jpeg/png`, `maxSizeMB: 10`, `minWidth: 500`, `minHeight: 650`), `validateImageFileBasics(file)` (sync), `getImageDimensions(file)` (async, browser-only), `validateFaceImage(file)` (combines both).
- Important notes: `FACE_IMAGE_RULES.maxSizeMB` is currently a single value (10MB) — but the just-discovered API spec shows the **update** endpoint only allows 4MB (see Known Issues #3). This file will need a second rule set or a parameter before the Students edit form is built.

### Components (`assets/js/components/`)

**`sidebar.js`**
- Purpose: Renders the role-based navigation menu.
- Main functionality: `SIDEBAR_ICONS` (inline SVGs per nav item), `SIDEBAR_MENUS` (`admin`: 9 items — Dashboard, Students, Courses, Groups, Sessions, Attendance Policies, Warnings, Reports, Instructors; `instructor`: 2 items — Dashboard, Sessions only), `renderSidebar(activeKey)` reads `getCurrentUser().role` and injects the right menu into `#sidebar`, `toggleSidebar()` plus document-level click-outside/Escape listeners for the mobile drawer.
- Important notes: Role-menu split was an explicit earlier decision, re-confirmed during this module: instructors only ever see Dashboard + Sessions.

**`navbar.js`**
- Purpose: Renders page title, current user info, and logout control.
- Main functionality: `renderNavbar(pageTitle)` injects title + user name/role/avatar(initials)/logout button into `#navbar`, wires the logout button to `logout()`; `renderAppShell({activeKey, pageTitle})` is the convenience wrapper that calls both `renderSidebar` and `renderNavbar` — **this is the function every future page should call**, not the two individually.
- Important notes: A bug was found and fixed in the matching CSS (not this file) — see `navbar.css` below.

### Pages (`assets/js/pages/`)

**`login.js`**
- Purpose: Login page logic.
- Main functionality: Redirects to `dashboard.html` immediately if already logged in; password show/hide toggle; submit handler runs `validateForm` (email required+valid, password required) → shows inline field errors if invalid → otherwise sets the submit button to a loading state, calls `login()`, and on success toasts + redirects to `dashboard.html`, on failure re-enables the button and shows both a toast and an inline form-error box with `err.message`.
- Important notes: Fully tested via Playwright, including the network-error path (no backend running), which also served as live confirmation of the `api.js` bug fix.

### CSS — base (`assets/css/base/`)

**`reset.css`** *(pre-existing, found already on disk at the start of this conversation; full content reproduced below since it was not fully re-quoted earlier in the conversation)*
```css
*, *::before, *::after { box-sizing: border-box; }
html, body, h1, h2, h3, h4, p, figure, blockquote, dl, dd { margin: 0; }
html { -webkit-text-size-adjust: 100%; }
body { min-height: 100vh; line-height: 1.5; -webkit-font-smoothing: antialiased; }
img, picture, svg, video { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; color: inherit; }
button { cursor: pointer; background: none; border: none; }
a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; padding: 0; }
:focus-visible { outline: 2px solid var(--accent, #06B6D4); outline-offset: 2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
    }
}
```

**`variables.css`** *(pre-existing palette, kept as-is; Claude added the Arabic font fallback + `--info`/`--info-soft` + transition tokens during the Login module — full current content reproduced below since it's referenced by every other CSS file)*
```css
:root {
    --bg: #F7F8FA;
    --surface: #FFFFFF;
    --ink: #101828;
    --muted: #667085;
    --border: #E4E7EC;

    --primary: #1E3A8A;       /* deep indigo — authority/trust */
    --primary-dark: #152C6B;
    --primary-soft: #E8ECF8;
    --accent: #06B6D4;        /* cyan — the "scan" color, used sparingly */
    --accent-soft: rgba(6, 182, 212, 0.12);

    --danger: #D92D20;
    --danger-soft: #FEF3F2;
    --success: #079455;
    --success-soft: #ECFDF3;
    --warning: #DC6803;
    --warning-soft: #FFFAEB;
    --info: #3B82C4;
    --info-soft: #E9F2FA;

    --font-display: "Space Grotesk", "IBM Plex Sans Arabic", "Segoe UI", sans-serif;
    --font-body: "Inter", "IBM Plex Sans Arabic", "Segoe UI", sans-serif;
    --font-mono: "JetBrains Mono", "Consolas", monospace;

    --transition-fast: 150ms ease;
    --transition-base: 250ms ease;

    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-full: 999px;

    --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
    --shadow-md: 0 4px 12px rgba(16, 24, 40, 0.08);
    --shadow-lg: 0 16px 40px rgba(16, 24, 40, 0.16);

    --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
    --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;
}
```
- Important notes: An alternative palette (indigo + **amber** accent + IBM Plex Sans body, instead of cyan + Inter) was proposed by Claude but never adopted — the user asked to see both, then moved on without picking, so the pre-existing cyan/indigo/Inter direction was kept by default. If visual rework is ever requested, this is the file to change, and all components reference these variables rather than hardcoded colors, so a palette swap is low-risk.

**`typography.css`**
- Purpose: Font loading + base type styles.
- Main functionality: `@import` for Space Grotesk, Inter, IBM Plex Sans Arabic, JetBrains Mono from Google Fonts; base `body`/`h1-h4` styles using the font variables; `.text-muted`, `.text-mono`, `.rtl` (sets `direction: rtl; text-align: right;` for wrapping Arabic content blocks).

### CSS — components (`assets/css/components/`)

**`buttons.css`** — `.btn` base + `.btn-primary`/`.btn-secondary`/`.btn-danger`/`.btn-block`, disabled state, `.btn-loading` (spinner via `::after` + `@keyframes btn-spin`).

**`forms.css`** — `.form-group`/`.form-label`/`.form-input`/`.form-select`/`.form-textarea`, focus ring using `--primary-soft`, `.has-error` state using `--danger`, `.form-error`/`.form-hint`, `.form-input-wrap` + `.form-input-toggle` (positions a show/hide button inside a password field).

**`toast.css`** — `#toast-container` (fixed top-right), `.toast` base + `.toast-success`/`.toast-error`/`.toast-warning`/`.toast-info` (left-border accent + tinted background), `.toast-visible` (transition-in), mobile override (full-width, no longer top-right anchored).

**`loader.css`** — `#global-loader` (fixed full-screen overlay, blurred backdrop), `.loader-visible`, `.loader-spinner` (CSS-only spin animation).

### CSS — layout (`assets/css/layout/`) — new this module

**`layout.css`** — `.app-shell` (flex container), `#sidebar` (fixed, 260px, gradient background using `--primary`→`--primary-dark`), `.app-main` (margin-left offset to clear the fixed sidebar), `#navbar` (sticky top), `.app-content` (padding). At `max-width: 900px`, the sidebar becomes an off-canvas drawer (`transform: translateX(-100%)`, shown via `body.sidebar-open`), with a dimmed `::before` backdrop.

**`sidebar.css`** — `.sidebar-brand`/`.sidebar-brand-mark`, `.sidebar-nav`, `.sidebar-link` (+ `:hover` and `.active` using `--accent`), `.sidebar-icon svg` sized explicitly at 18px (this explicit sizing is why sidebar icons never had the 0×0 bug that hit the navbar).

**`navbar.css`** — `#navbar` flex layout, `.navbar-toggle` (mobile hamburger), `.navbar-title`, `.navbar-user`/`.navbar-user-info`/`.navbar-user-name`/`.navbar-user-role`, `.navbar-avatar` (circle, initials), `.navbar-logout`, responsive rules hiding the user-info text and showing the toggle under 900px.
- **Bug fixed here:** `.navbar-toggle svg` and `.navbar-logout svg` had no explicit `width`/`height`, causing the hamburger icon to render at a measured 0×0 (confirmed via Playwright bounding-box inspection) — completely invisible despite the button technically existing. Fixed by adding explicit `width: 22px; height: 22px;` (toggle) and `width: 18px; height: 18px;` (logout) rules. **Lesson for future icon work: always give inline SVGs without `width`/`height` attributes an explicit CSS size — don't assume a parent's flex/sizing will constrain them.**

### CSS — pages (`assets/css/pages/`)

**`login.css`** — `.login-page` (2-column grid, split screen), `.login-brand` (gradient panel), `.login-logo`/`.login-logo-mark`, `.login-scan-frame` (corner-bracket pseudo-element motif — the signature design element), `.login-scan-line` (animated sweep, respects `prefers-reduced-motion`), `.login-form-panel`/`.login-form-card`, `.login-form-error` box. Responsive: at `max-width: 860px` collapses to a single column, hides the tagline, shrinks the scan-frame insets.

### HTML pages (project root)

**`login.html`** — Links: `reset.css`, `variables.css`, `typography.css`, `buttons.css`, `forms.css`, `toast.css`, `loader.css`, `login.css`. Body: `.login-page` with brand panel (scan-frame + scan-line + logo + heading + tagline) and form panel (email + password-with-toggle + submit + inline error box). Loads all 7 core scripts in dependency order, then `login.js`. **Fully tested** via Playwright: desktop, mobile, empty-form validation errors, and a real failed-login network-error case.

**`dashboard.html`** — ⚠️ **Placeholder only**, built solely to host and test the Sidebar+Navbar shell module — **not** the real Dashboard module deliverable. Links: `reset.css`, `variables.css`, `typography.css`, `layout.css`, `sidebar.css`, `navbar.css`, `buttons.css`, `toast.css`, `loader.css`. Body: `.app-shell` > `#sidebar` + `.app-main` (`#navbar` + `.app-content` with a single placeholder paragraph). Inline script: `guardPage(); renderAppShell({ activeKey: "dashboard", pageTitle: "Dashboard" });`. **Tested** via Playwright for both admin and instructor roles, plus mobile drawer open/close — this is where the navbar-icon bug was caught.

---

# API Integration

Only endpoints currently wired into `config.js`, plus the newly-researched Students/Courses/Groups shapes needed for the in-progress module, are listed below with full detail. (Endpoints deliberately excluded from `config.js` per user decision are listed in Important Decisions, not repeated here as "integrated".)

### Auth

| Method | URL | Request | Response | Used in |
|---|---|---|---|---|
| POST | `/login` | `{ email, password }` | `{ message, user: {id,name,email,phone,gender}, role, token }` | `auth.js` → `login()` |
| POST | `/logout` | — (Bearer token) | `{ message }` (assumed) | `auth.js` → `logout()` |
| GET | `/me` | — (Bearer token) | Same shape as login's `user`+`role` | `auth.js` → `refreshCurrentUser()` |

### Students (researched this session — not yet consumed by any page)

| Method | URL | Request | Response |
|---|---|---|---|
| GET | `/students` | query params (search/group filter — exact param names not yet confirmed from spec, infer from list usage when building) | `{ status: bool, message: string\|null, data: [StudentResource] }` |
| POST | `/students` | `multipart/form-data` — `StoreStudentRequest` | `201 { status, message: "تم إضافة الطالب بنجاح", data: StudentResource }` |
| GET | `/students/{id}` | — | `{ status, data: StudentResource }` |
| POST | `/students/{id}` | `multipart/form-data` — `UpdateStudentRequest` (operationId `student.update_3` — **this is the one mapped to `Laravel.students.updateWithImage(id)`, use this for ALL edits**) | `{ status, message: "تم تعديل الطالب بنجاح", data: StudentResource }` |
| ~~PUT~~ | ~~`/students/{id}`~~ | ~~`UpdateStudentRequest`~~ | **Excluded from `config.js` by user decision — do not use.** |
| DELETE | `/students/{id}` | — | (assumed `{status, message}`, not yet re-verified) |

**`StudentResource`** (response shape):
```json
{
  "id": "integer",
  "first_name": "string",
  "last_name": "string",
  "student_code": "string",
  "email": "string",
  "phone_number": "string|null",
  "gender": "string",
  "national_id": "string",
  "face_image": "string|null",
  "groups": [
    { "group_name": "string", "course_name": "string", "academic_year": "string|null" }
  ]
}
```

**`StoreStudentRequest`** (POST `/students` body — multipart):
```
first_name      string, required, max 255
last_name       string, required, max 255
student_code    string, required, max 255
email           string, required, email format, max 255
phone_number    string, optional, max 20
gender          string, required, enum: "male" | "female"
national_id     string, required, max 50
face_image      binary, required, maxLength 10240 (≈10MB — matches validators.js FACE_IMAGE_RULES)
group_id        integer, required
course_ids      integer[], required, minItems 1
```

**`UpdateStudentRequest`** (POST `/students/{id}` body — multipart, **all fields optional**):
```
email           string, optional, email format
phone_number    string|null, optional
gender          string|null, optional, enum: "male" | "female"
national_id     string|null, optional
registered_at   string|null, optional, date-time
group_id        integer|null, optional
face_image      binary|null, optional, maxLength 4096 (≈4MB — ⚠️ DIFFERENT from create's 10MB, see Known Issues #3)
course_ids      integer[], optional, minItems 1
```

### Courses (not yet consumed by any page — needed for the Students form's course multi-select and the future Courses module)

| Method | URL | Response |
|---|---|---|
| GET | `/courses` | `{ success: bool, data: [Course] }` |

**`Course`**:
```json
{
  "id": "integer",
  "course_name": "string",
  "course_code": "string|null",
  "description": "string|null",
  "start_date": "string|null (date-time)",
  "end_date": "string|null (date-time)",
  "created_at": "string|null (date-time)",
  "updated_at": "string|null (date-time)"
}
```

### Groups (not yet consumed by any page — needed for the Students form's group select)

| Method | URL | Response |
|---|---|---|
| GET | `/groups` | `{ success: bool, data: [{id, group_name, group_code, academic_year, course_id, course_name}] }` |

### Python AI service

| Method | URL | Notes |
|---|---|---|
| POST | `/sync/session/{session_schedule_id}` | Finalizes attendance after a live session ends. Full request/response documented in `AttendU_LiveSession_Reference.md`. |
| GET | `/sync/sessions/{session_schedule_id}` | Post-session review data. |
| POST | `/sync/post-attendance/{session_schedule_id}` | Final confirm/submit to Laravel. |
| WS | `/ws/attendance?session_schedule_id={id}&api_key={key}` | Live attendance stream — 6 message-status cases documented in the Live Session reference doc. |

⚠️ Authentication mechanism for the Python REST endpoints above is **unconfirmed** — see Known Issues #1.

---

# Components

- **`api.js` — `laravelRequest()` / `pythonRequest()`**: the only two functions that should ever call `fetch()` directly in this codebase. Any new page needing server data goes through one of these, never raw `fetch`.
- **`auth.js` — `guardPage(allowedRoles)`**: must be the first line of every protected page's inline script.
- **`ui.js` — `showToast`, `openModal`/`closeModal`, `showLoader`/`hideLoader`**: the only sanctioned way to show notifications/modals/loading state. No page should build its own toast or modal logic.
- **`validators.js` — `validateForm(values, rules)`**: generic validator every form should use rather than hand-rolling field checks.
- **`sidebar.js` / `navbar.js` — `renderAppShell({activeKey, pageTitle})`**: every protected page calls this once, after `guardPage()`, to render its own copy of the shared shell (each page has its own `#sidebar`/`#navbar` containers in its HTML; nothing is shared across page loads since this is a multi-page app, not an SPA).
- **Planned, not yet built:** `table.js` (generic table row renderer), `pagination.js` (page-number UI + click handling), `searchFilter.js` (generic search input + filter dropdown wiring) — needed imminently for the Students list.

---

# Authentication

- **Token storage:** `localStorage` key `attendu_token`, written/read via `storage.js`'s `setToken()`/`getToken()`.
- **User storage:** `localStorage` key `attendu_user`, holds the merged `{ ...user, role }` object, via `setUser()`/`getUser()`.
- **Route protection:** Every protected page calls `guardPage(allowedRoles)` at the top of its bottom-of-body inline script. No token → redirect to `login.html`. Token present but role not in `allowedRoles` → redirect to `dashboard.html`. Calling `guardPage()` with no arguments allows any logged-in role through.
- **User roles:** Exactly two — `"admin"` and `"instructor"` (string values, lowercase, as returned by the Laravel API's `role` field).
- **Authentication flow:**
  1. User submits `login.html` form → `login(email, password)` in `auth.js`.
  2. `laravelRequest(Laravel.auth.login, {method:"POST", body:{email,password}})`.
  3. Laravel responds `{ message, user, role, token }` → merged into one user object → saved via `storage.js`.
  4. Redirect to `dashboard.html`.
  5. Every subsequent `laravelRequest()` call automatically attaches `Authorization: Bearer {token}` (handled inside `api.js`, not something each page needs to do manually).
  6. Logout: `logout()` calls `Laravel.auth.logout`, then unconditionally clears local storage and redirects to `login.html` regardless of whether the server call succeeded.

---

# Coding Standards

- **Indentation:** 4 spaces, consistently, across all JS and CSS files.
- **Quotes:** Double quotes in JavaScript strings.
- **Functions:** `async`/`await` throughout — no `.then()` chains anywhere in the codebase.
- **Naming:** camelCase for functions/variables; SCREAMING_SNAKE_CASE for constant config objects/maps (`SIDEBAR_ICONS`, `FACE_IMAGE_RULES`, `STORAGE_KEYS`).
- **Comments:** Every core/component file opens with a banner comment (`// ====...`) stating the file's purpose. Every exported function has a JSDoc block (`@param`/`@returns`) above it.
- **Error convention:** Every thrown error object in `api.js` has `name: "APIError"` — this is load-bearing, not decorative; `auth.js`/page code can rely on checking `err.name` or just reading `err.message`/`err.status` directly.
- **CSS:** All colors/spacing/fonts/radii/shadows reference `variables.css` custom properties — never hardcode a hex color or pixel value that already has a token. Class naming is flat/component-scoped (`.sidebar-link`, `.navbar-toggle`, `.login-form-card`) rather than strict BEM, but always prefixed by the component/page it belongs to.
- **Endpoint path builders:** In `config.js`, any endpoint needing a URL parameter is an arrow function (`show: (id) => \`/students/${id}\``); static endpoints are plain strings.
- **No inline `<style>` or `<script>` logic beyond the minimal bottom-of-body shell-init block** (`guardPage(...)`, `renderAppShell(...)`) — everything else lives in its own `.js`/`.css` file.
- **Testing discipline:** Every interactive page built so far has been verified with headless Chromium (Playwright) screenshots and live DOM interaction (clicks, form fills, bounding-box checks) before being handed off — not just written and assumed correct. This caught two real bugs (the `api.js` error-swallowing bug, the navbar icon 0×0 bug). **Continue this practice for every future module.**

---

# UI/UX Notes

- **Palette:** Deep indigo (`--primary: #1E3A8A`) + cyan accent (`--accent: #06B6D4`, "the scan color," used sparingly) on a near-white background (`--bg: #F7F8FA`). This was a pre-existing direction kept by default (see Important Decisions #9) rather than the indigo+amber alternative Claude proposed.
- **Type:** Space Grotesk (display/headings) + Inter (body) + IBM Plex Sans Arabic as an automatic per-character fallback for Arabic text (student names, API messages) — neither display nor body font has Arabic glyphs, so the browser silently substitutes the Arabic font mid-string without needing any JS logic.
- **Signature design element:** A "scan-frame" corner-bracket motif (pure CSS, `::before`/`::after` on `.login-scan-frame`) plus an animated scan-line sweep on the login page's brand panel — evokes the product's face-recognition identity without rendering a literal face. Respects `prefers-reduced-motion`.
- **Login layout:** Split-screen (brand panel + form panel), collapsing to a stacked single column under 860px with the tagline hidden and the scan-frame insets shrunk.
- **App shell layout:** Fixed 260px sidebar (gradient `--primary`→`--primary-dark`) + sticky top navbar + scrollable content area. Below 900px the sidebar becomes an off-canvas drawer with a dimmed backdrop, toggled by a navbar hamburger button.
- **Sidebar active state:** Uses `--accent` (cyan) as a solid background on the active link — this is the only place cyan appears as a large filled area rather than a thin accent line.
- **Toast convention:** Top-right stacking, left-border-colored by type (`success`/`error`/`warning`/`info`), click-to-dismiss or auto-dismiss after a configurable duration.
- **Modal convention (documented in `ui.js`, not yet used by any page):**
  ```html
  <div id="some-modal" class="modal">
    <div class="modal-overlay" data-modal-close></div>
    <div class="modal-box"> ...content... </div>
  </div>
  ```
  `openModal("some-modal")`/`closeModal("some-modal")` toggle a `.modal-open` class; any element with `data-modal-close` (overlay, a Cancel button, an "✕" button) closes it automatically; Escape also closes it. **`modals.css` styling these classes does not exist yet** — needed for the Students add/edit modal.
- **RTL handling:** A `.rtl` utility class (`direction:rtl; text-align:right;`) exists for wrapping blocks of Arabic content (e.g. a student's Arabic name + details) where the whole block should flow right-to-left, separate from the automatic per-character font fallback which handles inline Arabic words mixed into otherwise-LTR text.

---

# Important Decisions

1. **Vanilla multi-page HTML/CSS/JS, no framework** — explicit user requirement from the start of the project.
2. **Core infra build order fixed and followed exactly:** `config.js` → `storage.js` → `api.js` → `auth.js` → `ui.js` → `utils.js` → `validators.js`, because each depends only on files before it in the list.
3. **Module build order fixed by dependency chains**, not subjective importance — see Modules Status table.
4. **`api.js` error-handling bug fix:** structured `APIError` objects (carrying real HTTP status + backend message) must be re-thrown as-is before any generic network-error fallback, otherwise real error messages (e.g. "Invalid credentials") get silently replaced with a useless generic message. This was caught by an actual simulated-401 test, not just code review.
5. **`Python.live.attendance` is a plain string, not a function** — it was briefly changed to a zero-argument function during one edit, which would have caused `buildPythonWsUrl` to stringify the function itself into the URL. Reverted; kept as a plain string since it needs no parameters.
6. **Several spec-documented endpoints are deliberately excluded from `config.js`** by explicit user instruction ("I don't need them"), after Claude had initially restored them thinking they were accidentally trimmed: `Laravel.students.update` (PUT), `Laravel.attendance.store`, `Python.upload.image`, `Python.upload.updateStudentImage`, `Python.students.destroy`, `Python.session.start`, `Python.session.info`, `Python.home`. **Do not re-add these without explicitly asking the user again** — this has already been asked and answered twice.
7. **All student profile edits go through `POST /students/{id}` (`Laravel.students.updateWithImage`)**, never the excluded `PUT` variant — confirmed appropriate during Students-module research since Laravel's multipart-update convention matches this operation (`operationId: student.update_3`).
8. **`pythonRequest()` auto-attaches an `X-API-Key` header** to every Python call — this is an explicit assumption, flagged as unconfirmed, not a verified fact (see Known Issues #1).
9. **Login visual direction:** an unexplained pre-existing `reset.css`/`variables.css` (indigo+cyan+Inter) was found on disk with no conversation record of being chosen. Claude proposed an alternative (indigo+amber+IBM Plex Sans) and asked the user to pick; the user asked to see both in detail but never made an explicit final choice before moving on to "we need to work on login module." Claude proceeded with the pre-existing cyan/indigo/Inter direction as the practical default, and added the one functionally necessary fix regardless of palette choice: an Arabic font fallback, since neither original font had Arabic glyphs and the app displays Arabic text throughout.
10. **Signature login design element:** the scan-frame/scan-line corner-bracket motif was chosen specifically to tie into the product's face-recognition identity without literally rendering a face (avoiding AI-generated realistic faces entirely).
11. **Sidebar role-based menus:** Admin gets all 9 module links; Instructor gets only Dashboard + Sessions — based on an explicit early-conversation ranking decision ("Instructor → sees only Sessions"), re-confirmed (not re-litigated) when building the actual sidebar component.
12. **`dashboard.html` built early is explicitly a test harness for the Sidebar+Navbar module, not the real Dashboard deliverable.** Its content area is a one-line placeholder; the real stat-cards implementation is module #12 in the build order and has not been started.
13. **Mandatory visual/functional testing before handoff:** every page built so far was verified with headless Chromium screenshots and live DOM interaction, not just written and assumed correct. This is now an established practice, not a one-off — continue it.

---

# Known Issues

1. **🔴 Unconfirmed: Python API key delivery mechanism.** `pythonRequest()` sends the key as an `X-API-Key` header; the WebSocket helper (`buildPythonWsUrl`) sends it as an `api_key` query parameter. Nobody has confirmed against the actual Python server source which mechanism (or both) it actually expects. If wrong, every Python REST call will silently fail authentication. **Must be resolved before building the Live Session module.**
2. **🔴 Unconfirmed: real Python service base URL.** `Python.json` has no `servers` field. `PYTHON_CONFIG.BASE_URL` (`http://127.0.0.1:8000`) and `WS_BASE_URL` (`ws://127.0.0.1:8000`) are placeholders, not confirmed deployment values.
3. **🟡 Face-image max-size discrepancy between create and update.** `StoreStudentRequest.face_image` allows up to `maxLength: 10240` (≈10MB, matches `validators.js`'s current `FACE_IMAGE_RULES.maxSizeMB: 10`), but `UpdateStudentRequest.face_image` only allows `maxLength: 4096` (≈4MB). `validators.js` currently has only one shared rule set — **this needs to be resolved (either two rule sets, or a parameter to `validateFaceImage()`) before `studentForm.js` is built**, or users will be able to select 5-9MB images on the edit form that the backend will reject.
4. **🟡 No live backend has been used for any testing so far.** Every test of API-dependent flows has only verified the network-error path (server unreachable) and structural/visual correctness — never against a real running Laravel or Python server. Real integration testing is still entirely pending.
5. **🟡 `dashboard.html`'s sidebar links to pages that don't exist yet** (`students.html`, `courses.html`, etc. all 404 right now) — expected at this stage, not a regression, just worth knowing before clicking around the current build.
6. **🟡 Missing component CSS needed imminently:** `tables.css`, `pagination.css`, `modals.css`, `badges.css` do not exist yet, and the Students module (next up) needs all four.
7. **🟢 Minor:** `DELETE /students/{id}` response shape was not explicitly re-verified during this session's research pass (assumed `{status, message}` by pattern-matching other delete endpoints) — worth a quick double-check against `Laravel.json` when `students.js`'s delete handler is actually written.

---

# TODO

Prioritized — top of list is the very next thing to do.

- [ ] **Students module:**
  - [ ] Decide how to handle the face-image 4MB-vs-10MB discrepancy in `validators.js` (Known Issue #3)
  - [ ] Create `assets/css/components/tables.css`
  - [ ] Create `assets/css/components/pagination.css`
  - [ ] Create `assets/css/components/modals.css` (must match the `[data-modal-close]`/`.modal-open` convention already documented in `ui.js`)
  - [ ] Create `assets/css/components/badges.css` (will also be reused later for attendance status badges: present/late/absent)
  - [ ] Create `assets/css/pages/students.css`
  - [ ] Create `students.html` (search bar, group-filter dropdown, table, pagination, "Add Student" button, per-row edit/delete actions)
  - [ ] Create `students.js` (load list via `Laravel.students.index` with query params built via `buildQueryString()`, debounced search via `debounce()`, render rows, wire pagination, delete-confirm flow)
  - [ ] Create `studentForm.js` (add/edit modal: fields per `StoreStudentRequest`/`UpdateStudentRequest`, face-image picker with preview + `validateFaceImage()`, group `<select>`, multi-select for `course_ids[]`, submit via `FormData` to `Laravel.students.store` or `Laravel.students.updateWithImage`)
  - [ ] Test the full create/edit/delete flow with Playwright (validation states, image preview, error states) before considering the module done
- [ ] **Courses module** (`courses.html`/`courses.js`) — simple CRUD
- [ ] **Groups module** (`groups.html`/`groups.js`) — simple CRUD, needs Courses' `GET /courses` for its course dropdown
- [ ] **Sessions module** (`sessions.html`/`sessions.js`/`sessionForm.js`) — needs Courses, Groups, and Users(instructors) to exist first
- [ ] **Resolve Known Issues #1 and #2** (Python API-key mechanism + real base URL) before starting Live Session
- [ ] **Live Session module** (`live-session.html`, `sync-final.html`) — full plan already in `AttendU_LiveSession_Reference.md`
- [ ] **Attendance Policies module** (`policies.html`/`policies.js`)
- [ ] **Warnings module** (`warnings.html`/`warnings.js`)
- [ ] **Reports module** (`reports.html`, `report-detail.html`)
- [ ] **Users/Instructors module** (`users.html`/`users.js`, admin-only)
- [ ] **Dashboard module** — replace the current placeholder `dashboard.html` content with real stat cards from `GET /dashboard/stats`

---

# Next Recommended Task

Resolve the face-image size-limit question (Known Issue #3) first since it's a 2-minute decision that blocks clean form-validation code, then build the four missing component CSS files (`tables.css`, `pagination.css`, `modals.css`, `badges.css`) since the Students list and form pages cannot be built without them. After that: `students.html` + `students.js` for the list view, tested with Playwright (including an empty-state and a populated-state screenshot), then `studentForm.js` for create/edit. Use the exact `StoreStudentRequest`/`UpdateStudentRequest`/`StudentResource` shapes documented in the API Integration section above — they've already been verified against the real `Laravel.json` spec, no need to re-derive them.

---

# Handover Summary

AttendU is a vanilla HTML/CSS/JS multi-page frontend for a university face-recognition attendance system, talking to a Laravel REST API and a separate Python AI service. Three of twelve planned modules are fully built, tested with real headless-browser screenshots, and verified bug-free as of this writing: **Core Infrastructure** (7 shared JS files: config/storage/api/auth/ui/utils/validators — including one critical bug fix in error handling), **Login** (full page, split-screen design with a scan-frame motif, tested including the network-error path), and **Sidebar+Navbar** (the shared app shell every future page will use, role-aware for admin vs instructor, tested on both roles and mobile, including a fixed icon-sizing bug). The **Students module** is next and currently ~10% done — only API research is complete (exact Laravel request/response shapes for students/courses/groups, all documented above); no Students-specific files exist yet. Four component CSS files (tables, pagination, modals, badges) are needed before that module can proceed and don't exist yet. A face-image size-limit inconsistency between the create and update endpoints (10MB vs 4MB) was just discovered and needs a decision before the student form's validation logic is written. Two open questions block the future Live Session module specifically (Python API-key delivery mechanism, and the real Python service base URL) but do not block Students, Courses, Groups, or Sessions. A full separate reference document for the Live Session module's WebSocket/sync flow already exists (`AttendU_LiveSession_Reference.md`) and should be consulted when that module is reached, rather than re-deriving it from the original PDF. Every file in this project follows strict conventions documented in Coding Standards above (4-space indent, async/await only, `name:"APIError"` error convention, CSS variables only, JSDoc on every function) — any new code should match them exactly rather than introducing a new style. The single most important practice to continue: **test every interactive page with a real headless-browser render before considering it done** — this has already caught two genuine bugs that pure code review missed.
