// =====================================================================
// pages/login.js
// =====================================================================

(function () {
    // Already logged in? Skip the login screen entirely.
    if (isLoggedIn()) {
        window.location.href = "dashboard.html";
        return;
    }

    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("login-submit");
    const togglePasswordBtn = document.getElementById("toggle-password");
    const formErrorBox = document.getElementById("login-error");
    const formErrorText = document.getElementById("login-error-text");
    const emailErrorEl = document.getElementById("email-error");
    const passwordErrorEl = document.getElementById("password-error");

    // ---- Show/hide password ----
    togglePasswordBtn.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";
        togglePasswordBtn.textContent = isHidden ? "Hide" : "Show";
    });

    // ---- Helpers ----
    function clearErrors() {
        formErrorBox.classList.remove("visible");
        formErrorText.textContent = "";
        emailErrorEl.textContent = "";
        passwordErrorEl.textContent = "";
        emailInput.classList.remove("has-error");
        passwordInput.classList.remove("has-error");
    }

    function showFieldErrors(errors) {
        if (errors.email) {
            emailErrorEl.textContent = errors.email;
            emailInput.classList.add("has-error");
        }
        if (errors.password) {
            passwordErrorEl.textContent = errors.password;
            passwordInput.classList.add("has-error");
        }
    }

    function showFormError(message) {
        formErrorText.textContent = message;
        formErrorBox.classList.add("visible");
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.classList.toggle("btn-loading", isLoading);
    }

    // ---- Submit ----
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const { valid, errors } = validateForm(
            { email, password },
            {
                email: [
                    [isRequired, "Email is required"],
                    [isValidEmail, "Enter a valid email address"],
                ],
                password: [
                    [isRequired, "Password is required"],
                ],
            }
        );

        if (!valid) {
            showFieldErrors(errors);
            return;
        }

        setLoading(true);

        try {
            await login(email, password);
            showToast("Signed in successfully", "success");
            window.location.href = "dashboard.html";
        } catch (err) {
            setLoading(false);
            const message = err?.message || "Something went wrong. Please try again.";
            showFormError(message);
            showToast(message, "error");
        }
    });
})();