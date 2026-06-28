// =====================================================================
// core/storage.js
// Thin wrapper around localStorage for the auth token + current user.
// api.js depends on getToken() to attach the Authorization header.
// =====================================================================

const STORAGE_KEYS = {
    TOKEN: "attendu_token",
    USER: "attendu_user",
};

function setToken(token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

function getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function removeToken() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

function setUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function getUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
}

function removeUser() {
    localStorage.removeItem(STORAGE_KEYS.USER);
}

function clearSession() {
    removeToken();
    removeUser();
}