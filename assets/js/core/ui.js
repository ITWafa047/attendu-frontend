// =====================================================================
// core/ui.js
// Shared UI helpers: toasts, modals, loading overlay.
// No dependencies on api.js/auth.js — pure DOM manipulation.
//
// Expected HTML conventions (documented here since CSS comes later):
//
// TOASTS — no markup needed per page. showToast() creates its own
//   container (#toast-container) the first time it's called.
//
// MODALS — each modal in a page should look like:
//   <div id="student-modal" class="modal">
//     <div class="modal-overlay" data-modal-close></div>
//     <div class="modal-box"> ... content ... </div>
//   </div>
//   openModal("student-modal") adds class "modal-open" to #student-modal.
//   Any element inside the modal with [data-modal-close] closes it on click
//   (handled automatically below — covers the overlay and any "X"/cancel button).
//
// LOADER — showLoader()/hideLoader() create/reuse a single full-screen
//   overlay (#global-loader) — no markup needed per page.
// =====================================================================

// ---------------------------------------------------------------------
// TOASTS
// ---------------------------------------------------------------------

let toastContainer = null;

function ensureToastContainer() {
    if (toastContainer && document.body.contains(toastContainer)) {
        return toastContainer;
    }
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
    return toastContainer;
}

/**
 * Shows a toast notification.
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} [type="info"]
 * @param {number} [duration=4000] - ms before auto-dismiss
 */
function showToast(message, type = "info", duration = 4000) {
    const container = ensureToastContainer();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // allow CSS transition-in (class added after insertion so the
    // transition actually triggers, instead of starting in its end state)
    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    const remove = () => {
        toast.classList.remove("toast-visible");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
        // fallback in case there's no CSS transition defined yet
        setTimeout(() => toast.remove(), 400);
    };

    toast.addEventListener("click", remove);
    setTimeout(remove, duration);
}

// ---------------------------------------------------------------------
// MODALS
// ---------------------------------------------------------------------

/**
 * Opens a modal by id and locks page scroll.
 * @param {string} modalId
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`openModal: no element found with id "${modalId}"`);
        return;
    }
    modal.classList.add("modal-open");
    document.body.classList.add("modal-scroll-lock");
}

/**
 * Closes a modal by id and restores page scroll
 * (only if no other modal is still open).
 * @param {string} modalId
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`closeModal: no element found with id "${modalId}"`);
        return;
    }
    modal.classList.remove("modal-open");

    const anyOtherModalOpen = document.querySelector(".modal.modal-open");
    if (!anyOtherModalOpen) {
        document.body.classList.remove("modal-scroll-lock");
    }
}

// Auto-wire [data-modal-close] elements (overlay clicks, cancel/✕ buttons)
// and the Escape key, so each page doesn't need to repeat this logic.
document.addEventListener("click", (e) => {
    const closer = e.target.closest("[data-modal-close]");
    if (!closer) return;
    const modal = closer.closest(".modal");
    if (modal) closeModal(modal.id);
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openModalEl = document.querySelector(".modal.modal-open");
    if (openModalEl) closeModal(openModalEl.id);
});

// ---------------------------------------------------------------------
// LOADER
// ---------------------------------------------------------------------

let loaderEl = null;
let loaderRequestCount = 0; // supports overlapping calls (e.g. 2 parallel requests)

function ensureLoaderEl() {
    if (loaderEl && document.body.contains(loaderEl)) {
        return loaderEl;
    }
    loaderEl = document.createElement("div");
    loaderEl.id = "global-loader";
    loaderEl.innerHTML = `<div class="loader-spinner"></div>`;
    document.body.appendChild(loaderEl);
    return loaderEl;
}

/** Shows the global loading overlay. Safe to call multiple times in a row. */
function showLoader() {
    loaderRequestCount++;
    const el = ensureLoaderEl();
    el.classList.add("loader-visible");
}

/**
 * Hides the global loading overlay. If showLoader() was called multiple
 * times (e.g. two requests in flight), the overlay only hides once the
 * last one finishes.
 */
function hideLoader() {
    loaderRequestCount = Math.max(0, loaderRequestCount - 1);
    if (loaderRequestCount === 0 && loaderEl) {
        loaderEl.classList.remove("loader-visible");
    }
}