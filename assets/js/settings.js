/* ==========================================================================
   SETTINGS CONTROLLER (settings.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeSettings();

    window.addEventListener("financeDataChanged", () => {
        loadSettingsMetrics();
        populateUserProfileInputs();
    });
});

function initializeSettings() {
    loadSettingsMetrics();
    populateUserProfileInputs();
    loadPreferencesInputs();

    // Bind Forms
    const profileForm = document.getElementById("profileForm");
    const passwordForm = document.getElementById("passwordForm");
    
    if (profileForm) profileForm.addEventListener("submit", handleProfileSave);
    if (passwordForm) passwordForm.addEventListener("submit", handlePasswordChange);

    // Bind Preferences change
    const themeSelect = document.getElementById("themeSelect");
    const notifyCheck = document.getElementById("notificationsCheckbox");

    if (themeSelect) themeSelect.addEventListener("change", handleThemeChange);
    if (notifyCheck) notifyCheck.addEventListener("change", handlePreferencesSave);

    // Bind Data Actions
    const exportBtn = document.getElementById("exportData");
    const importInput = document.getElementById("importData");
    const resetBtn = document.getElementById("resetData");

    if (exportBtn) exportBtn.addEventListener("click", exportJSONBackup);
    if (importInput) importInput.addEventListener("change", handleImportBackup);
    if (resetBtn) resetBtn.addEventListener("click", resetAllData);
}

/* ==========================================
   METRICS & PROFILE LOADING
   ========================================== */
function loadSettingsMetrics() {
    const transactions = window.DB.getTransactions();
    const inflow = transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const outflow = transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + Number(t.amount || 0), 0);

    document.getElementById("settingsIncomeVal").textContent = window.DB.formatCurrency(inflow);
    document.getElementById("settingsExpenseVal").textContent = window.DB.formatCurrency(outflow);
}

function populateUserProfileInputs() {
    const session = JSON.parse(sessionStorage.getItem("financeSession")) || {};
    const activeEmail = session.email || "admin@example.com";
    
    const users = JSON.parse(localStorage.getItem("finance_users")) || [];
    const activeUser = users.find(u => u.email === activeEmail) || session || { fullName: "Admin User", email: "admin@example.com" };
    
    const activeName = activeUser.fullName || activeUser.name || "Admin User";
    const activePhone = activeUser.phone || "";
    
    const settings = window.DB.get("finance_settings") || { currency: "USD" };

    if (document.getElementById("fullName")) document.getElementById("fullName").value = activeName;
    if (document.getElementById("profileEmail")) document.getElementById("profileEmail").value = activeEmail;
    if (document.getElementById("profilePhone")) document.getElementById("profilePhone").value = activePhone;
    if (document.getElementById("profileCurrency")) document.getElementById("profileCurrency").value = settings.currency || "USD";
}

function loadPreferencesInputs() {
    const settings = window.DB.get("finance_settings") || { currency: "USD", theme: "light", notifications: true };
    
    if (document.getElementById("themeSelect")) {
        document.getElementById("themeSelect").value = settings.theme || "light";
    }
    if (document.getElementById("notificationsCheckbox")) {
        document.getElementById("notificationsCheckbox").checked = settings.notifications !== false;
    }
}

/* ==========================================
   FORM HANDLERS
   ========================================== */
function handleProfileSave(event) {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();
    const phone = document.getElementById("profilePhone").value.trim();
    const currency = document.getElementById("profileCurrency").value;

    const session = JSON.parse(sessionStorage.getItem("financeSession")) || {};
    const oldEmail = session.email || "admin@example.com";

    // Update Session
    session.fullName = fullName;
    session.email = email;
    sessionStorage.setItem("financeSession", JSON.stringify(session));

    // Update inside list of users
    const users = JSON.parse(localStorage.getItem("finance_users")) || [];
    const userIndex = users.findIndex(u => u.email === oldEmail);
    if (userIndex !== -1) {
        users[userIndex].fullName = fullName;
        users[userIndex].name = fullName;
        users[userIndex].email = email;
        users[userIndex].phone = phone;
    } else {
        users.push({
            fullName,
            name: fullName,
            email,
            phone
        });
    }
    localStorage.setItem("finance_users", JSON.stringify(users));

    // Update Settings Currency
    const settings = window.DB.get("finance_settings") || {};
    settings.currency = currency;
    window.DB.set("finance_settings", settings);

    // Sync metrics and sidebar profile details immediately
    window.DB.recalculateAllBalances();
    alert("Profile settings saved successfully!");
}

function handlePasswordChange(event) {
    event.preventDefault();

    const currentPwd = document.getElementById("currentPassword").value;
    const newPwd = document.getElementById("newPassword").value;
    const confirmPwd = document.getElementById("confirmPassword").value;

    const session = JSON.parse(sessionStorage.getItem("financeSession")) || {};
    const email = session.email || "admin@example.com";

    const users = JSON.parse(localStorage.getItem("finance_users")) || [];
    const userIndex = users.findIndex(u => u.email === email);
    const userObj = userIndex !== -1 ? users[userIndex] : { password: "admin" };
    const actualPwd = userObj.password || "admin";

    if (currentPwd !== actualPwd) {
        alert("The current password entered is incorrect.");
        return;
    }

    if (newPwd !== confirmPwd) {
        alert("Confirm password does not match the new password.");
        return;
    }

    if (newPwd.length < 4) {
        alert("The new password must be at least 4 characters.");
        return;
    }

    if (userIndex !== -1) {
        users[userIndex].password = newPwd;
        localStorage.setItem("finance_users", JSON.stringify(users));
    }
    
    document.getElementById("passwordForm").reset();
    alert("Password updated successfully!");
}

function handleThemeChange() {
    const theme = document.getElementById("themeSelect").value;
    const settings = window.DB.get("finance_settings") || {};
    settings.theme = theme;
    window.DB.set("finance_settings", settings);

    const switchBtn = document.getElementById("darkModeSwitch");

    if (theme === "dark") {
        document.body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "enabled");
        if (switchBtn) switchBtn.checked = true;
    } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("darkMode", "disabled");
        if (switchBtn) switchBtn.checked = false;
    }
}

function handlePreferencesSave() {
    const notifyCheck = document.getElementById("notificationsCheckbox").checked;
    const settings = window.DB.get("finance_settings") || {};
    settings.notifications = notifyCheck;
    window.DB.set("finance_settings", settings);
}

/* ==========================================
   DATA BACKUPS MANAGEMENT
   ========================================== */
function exportJSONBackup() {
    const accounts = window.DB.getAccounts();
    const budgets = window.DB.getBudgets();
    const goals = window.DB.getGoals();
    const transactions = window.DB.getTransactions();
    const categories = window.DB.getCategories();
    
    const backupObj = {
        accounts,
        budgets,
        goals,
        transactions,
        categories,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "finance_tracker_backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleImportBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.accounts && data.transactions && data.budgets) {
                window.DB.set("finance_accounts", data.accounts);
                window.DB.set("finance_budgets", data.budgets);
                window.DB.set("finance_goals", data.goals || []);
                window.DB.set("finance_transactions", data.transactions);
                window.DB.set("finance_categories", data.categories || []);
                
                window.DB.recalculateAllBalances();
                alert("Backup data restored successfully!");
                location.reload();
            } else {
                alert("Invalid backup file format. Essential tables missing.");
            }
        } catch (err) {
            alert("Error parsing backup file. Please select a valid JSON file.");
        }
    };
    reader.readAsText(file);
}

function resetAllData() {
    const confirmReset = confirm("WARNING: This will completely wipe all transactions, accounts, budgets, and goals, and restore default seed values. Are you sure?");
    if (!confirmReset) return;

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "../login.html";
}