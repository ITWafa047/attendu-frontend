// =====================================================================
// core/api.js
// Two request functions — one per server — both built on a shared
// internal fetch wrapper so headers/errors/auth are handled consistently.
//
// Usage:
//   const courses = await laravelRequest(Laravel.courses.index);
//   const result  = await laravelRequest(Laravel.auth.login, { method: "POST", body: { email, password } });
//   const data    = await pythonRequest(Python.session.info(sessionId));
// =====================================================================

/**
 * Call the Laravel server (main API). Automatically attaches the
 * Bearer token from storage.js if one exists.
 */
async function laravelRequest(endpoint, options = {}) {
    return apiRequest(BASE_URL_LARAVEL, endpoint, { ...options, withAuth: true });
}

/**
 * Call the Python server (AI service). Automatically attaches the
 * bearer token from storage.js when available, just like the Laravel
 * wrapper does. This aligns Python REST requests with the same auth
 * pattern used by WebSocket connections.
 */
async function pythonRequest(endpoint, options = {}) {
    return apiRequest(PYTHON_CONFIG.BASE_URL, endpoint, { ...options, withAuth: true });
}

/**
 * Shared internal fetch wrapper used by both functions above.
 *
 * @param {string} baseUrl   - BASE_URL_LARAVEL or PYTHON_CONFIG.BASE_URL
 * @param {string} endpoint  - e.g. Laravel.students.show(5)
 * @param {object} options
 * @param {string} [options.method="GET"]
 * @param {object|FormData} [options.body]
 * @param {object} [options.headers]
 * @param {boolean} [options.withAuth]
 */
async function apiRequest(baseUrl, endpoint, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const { method = "GET", body = null, headers = {}, withAuth = false } = options;

        const url = `${baseUrl}${endpoint}`;
        const finalHeaders = { Accept: "application/json", ...headers };

        const isFormData = body instanceof FormData;

        if (!isFormData && body) {
            finalHeaders["Content-Type"] = "application/json";
        }

        if (withAuth) {
            const token = getToken();
            if (token) {
                finalHeaders["Authorization"] = `Bearer ${token}`;
            }
        }

        const response = await fetch(url, {
            method,
            headers: finalHeaders,
            signal: controller.signal,
            body: body
                ? (isFormData ? body : JSON.stringify(body))
                : undefined,
        });

        let data = null;
        try {
            data = await response.json();
        } catch (_) { }

        if (!response.ok) {
            throw {
                name: "APIError",
                success: false,
                status: response.status,
                message: data?.message || data?.detail || "Request failed",
                data,
            };
        }

        return data;

    } catch (err) {
        // Real API error (4xx/5xx) — already structured correctly above,
        // re-throw as-is. Without this check, the generic network-error
        // throw below would overwrite the real status/message every time.
        if (err.name === "APIError") {
            throw err;
        }

        if (err.name === "AbortError") {
            throw {
                name: "APIError",
                status: 0,
                message: "Request timeout",
            };
        }

        throw {
            name: "APIError",
            status: 0,
            message: "Network error - server unreachable",
            raw: err,
        };

    } finally {
        clearTimeout(timeout);
    }
}