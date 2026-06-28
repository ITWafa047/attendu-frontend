// =====================================================================
// core/validators.js
// Form validation helpers: required fields, email, password, and the
// face-image checks needed for student uploads (jpg/png, max 10MB,
// min 500x650px — per the AttendU spec).
// =====================================================================

// ---------------------------------------------------------------------
// BASIC FIELD VALIDATORS
// Each returns true/false. Pair with validateForm() below for full forms.
// ---------------------------------------------------------------------

/** True if value is not empty/null/whitespace-only. */
function isRequired(value) {
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
}

/** Basic email format check (good enough for client-side; server still validates). */
function isValidEmail(value) {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Matches Laravel's LoginRequest rule: password minLength 6. */
function isValidPassword(value, minLength = 6) {
    return isRequired(value) && String(value).length >= minLength;
}

/** True if value contains only digits (e.g. student code, phone). */
function isNumeric(value) {
    return /^\d+$/.test(String(value ?? ""));
}

function minLength(value, min) {
    return String(value ?? "").trim().length >= min;
}

function maxLength(value, max) {
    return String(value ?? "").trim().length <= max;
}

// ---------------------------------------------------------------------
// GENERIC FORM VALIDATOR
// Usage:
//   const { valid, errors } = validateForm(
//     { email: emailInput.value, password: passwordInput.value },
//     {
//       email:    [[isRequired, "Email is required"], [isValidEmail, "Invalid email"]],
//       password: [[isRequired, "Password is required"], [(v) => isValidPassword(v), "Min 6 characters"]],
//     }
//   );
//   if (!valid) showToast(Object.values(errors)[0], "error");
// ---------------------------------------------------------------------

/**
 * @param {object} values - field name -> current value
 * @param {object} rules  - field name -> array of [validatorFn, errorMessage] pairs
 * @returns {{ valid: boolean, errors: object }}
 */
function validateForm(values, rules) {
    const errors = {};

    for (const field in rules) {
        const value = values[field];
        for (const [validatorFn, errorMessage] of rules[field]) {
            if (!validatorFn(value)) {
                errors[field] = errorMessage;
                break; // stop at first failing rule for this field
            }
        }
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------
// FACE IMAGE VALIDATION
// Spec: jpg/jpeg/png only, max 10MB, min 500x650px.
// ---------------------------------------------------------------------

const FACE_IMAGE_RULES = {
    allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
    maxSizeMB: 10,
    minWidth: 500,
    minHeight: 650,
};

/**
 * Synchronous checks only (type + file size) — no image decoding needed.
 * @param {File} file
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateImageFileBasics(file) {
    const errors = [];

    if (!file) {
        return { valid: false, errors: ["No file selected"] };
    }

    if (!FACE_IMAGE_RULES.allowedTypes.includes(file.type)) {
        errors.push("Only JPG or PNG images are allowed");
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > FACE_IMAGE_RULES.maxSizeMB) {
        errors.push(`Image must be smaller than ${FACE_IMAGE_RULES.maxSizeMB}MB`);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Reads an image file's pixel dimensions in the browser.
 * @param {File} file
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read image dimensions"));
        };

        img.src = url;
    });
}

/**
 * Full face-image validation: type + size (sync) + minimum dimensions (async).
 * Use this before uploading a student's face photo.
 *
 * @param {File} file
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
async function validateFaceImage(file) {
    const basics = validateImageFileBasics(file);
    if (!basics.valid) return basics;

    try {
        const { width, height } = await getImageDimensions(file);
        const errors = [];
        if (width < FACE_IMAGE_RULES.minWidth || height < FACE_IMAGE_RULES.minHeight) {
            errors.push(
                `Image must be at least ${FACE_IMAGE_RULES.minWidth}x${FACE_IMAGE_RULES.minHeight}px (got ${width}x${height}px)`
            );
        }
        return { valid: errors.length === 0, errors };
    } catch (err) {
        return { valid: false, errors: ["Could not process the selected image"] };
    }
}