/* ==========================================================================
   FINANCE TRACKER MASTER APPLICATION CONTROLLER (app.js)
   ========================================================================== */

const FinanceTracker = {
    init() {
        this.initializeLoader();
        this.initializeSplash();
        this.initializeSidebarWidgets();
        this.initializeActivePage();
        this.initializeDarkMode();
        this.initializeUserProfile();
        this.initializeGlobalEvents();
        
        console.log("Finance Tracker System Initialized");
    },

    // Page Entrance Loader
    initializeLoader() {
        const loader = document.getElementById("loader");
        if (!loader) return;
        
        window.addEventListener("load", () => {
            setTimeout(() => {
                loader.style.opacity = "0";
                setTimeout(() => {
                    loader.style.display = "none";
                }, 500);
            }, 800);
        });
    },

    // Landing Splash Cover Dismissal
    initializeSplash() {
        const splash = document.getElementById("splash-screen");
        if (!splash) return;

        window.addEventListener("load", () => {
            setTimeout(() => {
                splash.classList.add("fade-out");
            }, 1200);
        });
    },

    // Handle Active Page Navigation Highlighting
    initializeActivePage() {
        const currentPage = window.location.pathname.split("/").pop();
        const links = document.querySelectorAll(".menu a");
        
        links.forEach(link => {
            const href = link.getAttribute("href");
            if (href && (href === currentPage || (currentPage === "" && href === "dashboard.html"))) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    },

    // Sync Sidebar metrics dynamically based on localStorage DB
    initializeSidebarWidgets() {
        const balanceWidget = document.getElementById("sidebarBalanceWidget");
        const premiumWidget = document.getElementById("sidebarPremiumWidget");
        
        if (!balanceWidget && !premiumWidget) return;

        const currentPage = window.location.pathname.split("/").pop();
        
        // Match Dashboard screenshot (Premium banner bottom left)
        if (currentPage === "dashboard.html" || currentPage === "") {
            if (premiumWidget) premiumWidget.style.display = "block";
            if (balanceWidget) balanceWidget.style.display = "none";
        } else {
            if (premiumWidget) premiumWidget.style.display = "none";
            if (balanceWidget) balanceWidget.style.display = "block";
            
            // Populate metrics dynamically
            this.updateSidebarMetrics();
        }
    },

    updateSidebarMetrics() {
        const balanceVal = document.getElementById("sidebarBalanceVal");
        const incomeVal = document.getElementById("sidebarIncomeVal");
        const expenseVal = document.getElementById("sidebarExpenseVal");

        if (!balanceVal) return;

        // Calculate actual stats from Database
        const transactions = window.DB.getTransactions();
        const accounts = window.DB.getAccounts();

        // Total Balance = sum of all account balances
        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

        // Inflow / Outflow totals for current month
        const totalIncome = transactions
            .filter(t => t.type === "Income")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const totalExpense = transactions
            .filter(t => t.type === "Expense")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        balanceVal.textContent = window.DB.formatCurrency(totalBalance);
        if (incomeVal) incomeVal.textContent = window.DB.formatCurrency(totalIncome);
        if (expenseVal) expenseVal.textContent = window.DB.formatCurrency(totalExpense);
    },

    // Dark Mode Switch handler
    initializeDarkMode() {
        const switchBtn = document.getElementById("darkModeSwitch");
        const body = document.body;
        
        const darkState = localStorage.getItem("darkMode");
        if (darkState === "enabled") {
            body.classList.add("dark-mode");
            if (switchBtn) switchBtn.checked = true;
        }

        if (!switchBtn) return;

        switchBtn.addEventListener("change", () => {
            if (switchBtn.checked) {
                body.classList.add("dark-mode");
                localStorage.setItem("darkMode", "enabled");
            } else {
                body.classList.remove("dark-mode");
                localStorage.setItem("darkMode", "disabled");
            }
        });
    },

    // User Profile Display & Auth Check
    initializeUserProfile() {
        const profileName = document.getElementById("sidebarProfileName");
        const profileEmail = document.getElementById("sidebarProfileEmail");
        const profileAvatar = document.getElementById("profileAvatar");

        // Auth Check
        const session = JSON.parse(sessionStorage.getItem("financeSession"));
        const storedUser = JSON.parse(localStorage.getItem("financeTrackerUser"));
        const activeUser = session || storedUser || { fullName: "Admin User", email: "admin@example.com" };

        if (profileName) profileName.textContent = activeUser.fullName || activeUser.name || "Admin User";
        if (profileEmail) profileEmail.textContent = activeUser.email || "admin@example.com";
        
        if (profileAvatar) {
            const nameParam = encodeURIComponent(activeUser.fullName || activeUser.name || "Admin User");
            profileAvatar.src = `https://ui-avatars.com/api/?name=${nameParam}&background=4f46e5&color=fff&bold=true`;
        }

        // If we are not on landing page/auth and no session exists, force login
        const currentPage = window.location.pathname.split("/").pop();
        if (currentPage !== "" && currentPage !== "index.html" && currentPage !== "login.html" && currentPage !== "signup.html") {
            const hasSession = sessionStorage.getItem("financeSession");
            if (!hasSession && !localStorage.getItem("financeTrackerUser")) {
                window.location.href = "../login.html";
            }
        }
    },

    initializeGlobalEvents() {
        // Reload widgets dynamically if data changes
        window.addEventListener("financeDataChanged", () => {
            this.initializeSidebarWidgets();
        });
    }
};

// Global Profile Menu Dropdown toggle
function toggleProfileMenu() {
    const menu = document.getElementById("profileDropdown");
    if (menu) menu.classList.toggle("show");
}

// Close Dropdowns on outside click
window.addEventListener("click", function (e) {
    const menu = document.getElementById("profileDropdown");
    const profileBtn = document.getElementById("profileButton");
    
    if (menu && profileBtn && !profileBtn.contains(e.target) && !e.target.closest(".profile-chevron")) {
        menu.classList.remove("show");
    }
});

// Global Logout User function
function logoutUser() {
    const confirmLogout = confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    sessionStorage.clear();
    localStorage.removeItem("rememberUser");
    localStorage.removeItem("financeTrackerUser");
    window.location.href = "../login.html";
}

// Global modal open/close helpers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("show");
}

// Close modal helper
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("show");
}

// Global premium modern toast notification system
function showNotification(message, type = "success") {
    // Inject notification style block if it doesn't exist
    if (!document.getElementById("premium-toast-style")) {
        const style = document.createElement("style");
        style.id = "premium-toast-style";
        style.textContent = `
            #toast-container {
                position: fixed;
                top: 24px;
                right: 24px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            }
            .premium-toast {
                pointer-events: auto;
                min-width: 320px;
                max-width: 450px;
                background: rgba(30, 41, 59, 0.9);
                color: #ffffff;
                padding: 14px 18px;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                backdrop-filter: blur(12px) saturate(180%);
                -webkit-backdrop-filter: blur(12px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                font-family: 'Outfit', -apple-system, sans-serif;
                font-size: 13px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 12px;
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .premium-toast.show {
                transform: translateX(0);
                opacity: 1;
            }
            .premium-toast.hide {
                transform: translateX(120%);
                opacity: 0;
            }
            .premium-toast-icon {
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .premium-toast-success {
                border-left: 4px solid #10b981;
            }
            .premium-toast-success .premium-toast-icon {
                color: #10b981;
            }
            .premium-toast-error {
                border-left: 4px solid #ef4444;
            }
            .premium-toast-error .premium-toast-icon {
                color: #ef4444;
            }
            .premium-toast-info {
                border-left: 4px solid #3b82f6;
            }
            .premium-toast-info .premium-toast-icon {
                color: #3b82f6;
            }
        `;
        document.head.appendChild(style);
    }

    // Get or create toast container
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `premium-toast premium-toast-${type}`;

    // Icon markup
    let iconClass = "fa-circle-check";
    if (type === "error") iconClass = "fa-circle-exclamation";
    if (type === "info") iconClass = "fa-circle-info";

    toast.innerHTML = `
        <div class="premium-toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div style="flex-grow: 1; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger entrance transition
    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    // Dismiss after 4 seconds
    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hide");
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4000);
}

// Bind globally
window.showNotification = showNotification;

// Initialize when DOM loaded
document.addEventListener("DOMContentLoaded", () => {
    FinanceTracker.init();
});