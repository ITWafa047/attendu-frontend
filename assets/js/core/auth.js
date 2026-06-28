// =====================================================================
// core/auth.js
// Login / logout / current-user / role-guard helpers.
// Built on top of api.js (laravelRequest) and storage.js (token/user).
//
// Laravel /login response shape (confirmed from Laravel.json):
//   { "message": "Login successful", "user": {id, name, email, phone, gender}, "role": "string", "token": "string" }
// Note "role" is a SIBLING field, not nested inside "user" — we merge them
// before saving, so storage.getUser() always returns { id, name, email, phone, gender, role }.
// =====================================================================

/**
 * Logs in against Laravel, stores token + merged user/role on success.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} the merged user object ({ ...user, role })
 * @throws {APIError} on 422 (validation) or other failures — let the caller
 *         catch this and show err.message (e.g. "Invalid credentials") to the user.
 */
async function login(email, password) {
    const response = await laravelRequest(Laravel.auth.login, {
        method: "POST",
        body: { email, password },
    });

    const mergedUser = { ...response.user, role: response.role };

    setToken(response.token);
    setUser(mergedUser);

    return mergedUser;
}

/**
 * Logs out: tells Laravel to invalidate the token, then clears local
 * session regardless of whether the server call succeeds, and redirects
 * to the login page.
 */
async function logout() {
    try {
        await laravelRequest(Laravel.auth.logout, { method: "POST" });
    } catch (_) {
        // Even if the server call fails (e.g. token already expired),
        // we still want to clear the local session below.
    } finally {
        clearSession();
        window.location.href = "login.html";
    }
}

/**
 * Returns the cached user object from storage (no network call).
 * @returns {object|null}
 */
function getCurrentUser() {
    return getUser();
}

/**
 * Re-fetches the current user from Laravel (/me) and refreshes storage.
 * Useful for validating that the stored token is still valid, or to pick
 * up role/profile changes made on another device.
 * @returns {Promise<object>} the merged user object
 */
async function refreshCurrentUser() {
    const response = await laravelRequest(Laravel.auth.me);
    const mergedUser = { ...response.user, role: response.role };
    setUser(mergedUser);
    return mergedUser;
}

/**
 * True if a token is present in storage. Does NOT verify the token is
 * still valid server-side — just checks local state.
 */
function isLoggedIn() {
    return !!getToken();
}

/**
 * Call this at the top of every protected page.
 *
 *   guardPage();                    // any logged-in user
 *   guardPage(["admin"]);           // admin-only page
 *   guardPage(["admin", "instructor"]); // either role
 *
 * - Not logged in at all          -> redirect to login.html
 * - Logged in but role not allowed -> redirect to dashboard.html
 *
 * @param {string[]} [allowedRoles] - if omitted/empty, any logged-in user passes
 */
function guardPage(allowedRoles = []) {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    if (allowedRoles.length > 0) {
        const user = getCurrentUser();
        if (!user || !allowedRoles.includes(user.role)) {
            window.location.href = "dashboard.html";
        }
    }
}