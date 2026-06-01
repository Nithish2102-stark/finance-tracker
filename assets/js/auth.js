/* ===========================
   LOADER
=========================== */

window.addEventListener("load", () => {

    const loader = document.getElementById("loader");

    if(loader){

        setTimeout(() => {

            loader.style.opacity = "0";

            setTimeout(() => {

                loader.style.display = "none";

            }, 500);

        }, 1800);

    }

});

/* ===========================
   PASSWORD TOGGLE
=========================== */

function initializePasswordToggle() {

    const toggleButtons =
        document.querySelectorAll(".toggle-password");

    toggleButtons.forEach(toggle => {

        toggle.addEventListener("click", () => {

            const input =
                toggle.parentElement.querySelector("input");

            if (!input) return;

            if (input.type === "password") {

                input.type = "text";

                toggle.classList.remove("fa-eye");
                toggle.classList.add("fa-eye-slash");

            } else {

                input.type = "password";

                toggle.classList.remove("fa-eye-slash");
                toggle.classList.add("fa-eye");

            }

        });

    });

}

/* ===========================
   PASSWORD STRENGTH
=========================== */

function initializePasswordStrength() {

    const passwordInput =
        document.getElementById("password");

    const strengthFill =
        document.getElementById("strengthFill");

    const strengthText =
        document.getElementById("strengthText");

    if (
        !passwordInput ||
        !strengthFill ||
        !strengthText
    ) {
        return;
    }

    passwordInput.addEventListener("input", () => {

        const password = passwordInput.value;

        let strength = 0;

        if (password.length >= 8)
            strength++;

        if (/[A-Z]/.test(password))
            strength++;

        if (/[0-9]/.test(password))
            strength++;

        if (/[^A-Za-z0-9]/.test(password))
            strength++;

        switch (strength) {

            case 0:
            case 1:

                strengthFill.style.width = "25%";
                strengthFill.style.background =
                    "#ef4444";

                strengthText.textContent =
                    "Weak Password";

                break;

            case 2:

                strengthFill.style.width = "50%";
                strengthFill.style.background =
                    "#f59e0b";

                strengthText.textContent =
                    "Medium Password";

                break;

            case 3:

                strengthFill.style.width = "75%";
                strengthFill.style.background =
                    "#3b82f6";

                strengthText.textContent =
                    "Good Password";

                break;

            case 4:

                strengthFill.style.width = "100%";
                strengthFill.style.background =
                    "#22c55e";

                strengthText.textContent =
                    "Strong Password";

                break;

        }

    });

}

/* ===========================
   SAVE USER
=========================== */

function saveUser(userData) {

    localStorage.setItem(
        "financeTrackerUser",
        JSON.stringify(userData)
    );

}

/* ===========================
   GET USER
=========================== */

function getUser() {

    const user =
        localStorage.getItem(
            "financeTrackerUser"
        );

    return user
        ? JSON.parse(user)
        : null;

}

/* ===========================
   SIGNUP
=========================== */

function initializeSignup() {

    const signupForm =
        document.getElementById("signupForm");

    if (!signupForm) return;

    signupForm.addEventListener(
        "submit",
        (e) => {

            e.preventDefault();

            const fullName =
                document.getElementById("name").value.trim();

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                ).value;

            if (
                !fullName ||
                !email ||
                !password
            ) {

                alert(
                    "Please fill all fields."
                );

                return;

            }

            if (
                password !==
                confirmPassword
            ) {

                alert(
                    "Passwords do not match."
                );

                return;

            }

            const userData = {

                fullName,
                email,
                password,
                createdAt:
                    new Date().toISOString()

            };

            saveUser(userData);

            alert(
                "Account created successfully!"
            );

            window.location.href =
                "login.html";

        }
    );

}

/* ===========================
   LOGIN
=========================== */

function initializeLogin() {

    const loginForm =
        document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener(
        "submit",
        (e) => {

            e.preventDefault();

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            const rememberMe =
                document.querySelector(
                    'input[type="checkbox"]'
                )?.checked;

            const storedUser =
                getUser();

            if (!storedUser) {

                alert(
                    "No account found. Please sign up first."
                );

                return;

            }

            if (
                email === storedUser.email &&
                password === storedUser.password
            ) {

                const session = {

                    loggedIn: true,
                    email:
                        storedUser.email,
                    fullName:
                        storedUser.fullName

                };

                sessionStorage.setItem(
                    "financeSession",
                    JSON.stringify(session)
                );

                if (rememberMe) {

                    localStorage.setItem(
                        "rememberUser",
                        email
                    );

                }

                alert(
                    "Login Successful!"
                );

                window.location.href =
                    "pages/dashboard.html";

            } else {

                alert(
                    "Invalid Email or Password."
                );

            }

        }
    );

}

/* ===========================
   AUTO FILL REMEMBER USER
=========================== */

function autoFillRememberUser() {

    const emailInput =
        document.getElementById("email");

    if (!emailInput) return;

    const remembered =
        localStorage.getItem(
            "rememberUser"
        );

    if (remembered) {

        emailInput.value =
            remembered;

    }

}

/* ===========================
   CHECK AUTH
=========================== */

function checkAuthentication() {

    const currentPage =
        window.location.pathname;

    if (
        currentPage.includes(
            "dashboard.html"
        ) ||
        currentPage.includes(
            "transactions.html"
        ) ||
        currentPage.includes(
            "income.html"
        ) ||
        currentPage.includes(
            "expenses.html"
        ) ||
        currentPage.includes(
            "budget.html"
        ) ||
        currentPage.includes(
            "accounts.html"
        ) ||
        currentPage.includes(
            "reports.html"
        ) ||
        currentPage.includes(
            "goals.html"
        ) ||
        currentPage.includes(
            "settings.html"
        )
    ) {

        const session =
            sessionStorage.getItem(
                "financeSession"
            );

        if (!session) {

            window.location.href =
                "../login.html";

        }

    }

}

/* ===========================
   LOGOUT
=========================== */

function logout() {

    sessionStorage.removeItem(
        "financeSession"
    );

    window.location.href =
        "../login.html";

}

/* ===========================
   GET CURRENT USER
=========================== */

function getCurrentUser() {

    const session =
        sessionStorage.getItem(
            "financeSession"
        );

    return session
        ? JSON.parse(session)
        : null;

}

/* ===========================
   INIT
=========================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializePasswordToggle();

        initializePasswordStrength();

        initializeSignup();

        initializeLogin();

        autoFillRememberUser();

        checkAuthentication();

    }
);