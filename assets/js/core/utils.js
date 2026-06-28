// =====================================================================
// core/utils.js
// Generic helpers used across pages: date/time formatting, debounce,
// query-string building/reading, and countdown helpers (needed for the
// live-session timer).
// =====================================================================

// ---------------------------------------------------------------------
// DATE / TIME FORMATTING
// ---------------------------------------------------------------------

const ARABIC_DAY_NAMES = [
    "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];

/**
 * "2026-06-24T19:25:00" -> "24 Jun 2026"
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date)) return "";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * "2026-06-24T19:25:00" -> "19:25" (24-hour format)
 * @param {string} isoString
 * @returns {string}
 */
function formatTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date)) return "";
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * "2026-06-24T19:25:00" -> "24 Jun 2026, 19:25"
 * @param {string} isoString
 * @returns {string}
 */
function formatDateTime(isoString) {
    if (!isoString) return "";
    return `${formatDate(isoString)}, ${formatTime(isoString)}`;
}

/**
 * "2026-06-24T19:25:00" -> "الأربعاء"
 * @param {string} isoString
 * @returns {string}
 */
function getArabicDayName(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date)) return "";
    return ARABIC_DAY_NAMES[date.getDay()];
}

// ---------------------------------------------------------------------
// DEBOUNCE (for search inputs)
// ---------------------------------------------------------------------

/**
 * Returns a debounced version of fn — only runs after `delay` ms have
 * passed since the last call. Use on search/filter inputs to avoid
 * firing an API request on every keystroke.
 *
 * Usage:
 *   const debouncedSearch = debounce((value) => loadStudents(value), 400);
 *   searchInput.addEventListener("input", (e) => debouncedSearch(e.target.value));
 *
 * @param {Function} fn
 * @param {number} [delay=400]
 * @returns {Function}
 */
function debounce(fn, delay = 400) {
    let timeoutId = null;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ---------------------------------------------------------------------
// QUERY STRING HELPERS
// ---------------------------------------------------------------------

/**
 * Builds a query string from a params object, skipping null/undefined/"" values.
 * buildQueryString({ search: "ali", group_id: null, page: 2 }) -> "?search=ali&page=2"
 * buildQueryString({}) -> ""
 * @param {object} params
 * @returns {string}
 */
function buildQueryString(params = {}) {
    const cleaned = Object.entries(params).filter(
        ([, value]) => value !== null && value !== undefined && value !== ""
    );
    if (cleaned.length === 0) return "";
    const query = new URLSearchParams(cleaned).toString();
    return `?${query}`;
}

/**
 * Reads a single query param from the current page URL.
 * getQueryParam("id") on "...?id=5" -> "5"
 * @param {string} name
 * @returns {string|null}
 */
function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

/**
 * Reads all query params from the current page URL as a plain object.
 * @returns {object}
 */
function getAllQueryParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
}

// ---------------------------------------------------------------------
// COUNTDOWN HELPERS (for live-session.html timer)
// ---------------------------------------------------------------------

/**
 * Milliseconds remaining between now and an ISO end-time string.
 * Returns 0 (never negative) once the time has passed.
 * @param {string} endIso
 * @returns {number}
 */
function msUntil(endIso) {
    const end = new Date(endIso).getTime();
    if (isNaN(end)) return 0;
    return Math.max(0, end - Date.now());
}

/**
 * Splits a duration in ms into hours/minutes/seconds parts.
 * @param {number} ms
 * @returns {{hours: number, minutes: number, seconds: number}}
 */
function getCountdownParts(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    return {
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    };
}

/**
 * Formats a duration in ms as "MM:SS", or "H:MM:SS" once it's an hour or more.
 * @param {number} ms
 * @returns {string}
 */
function formatCountdown(ms) {
    const { hours, minutes, seconds } = getCountdownParts(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
}