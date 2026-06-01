/* ==========================================================================
   FINANCE TRACKER DATABASE & SYNC LAYER (db.js) - MULTI-USER CAPABILITY
   ========================================================================== */

const DB = {
    // Retrieve logged-in user email to use as namespace prefix
    getUserEmail() {
        try {
            const session = JSON.parse(sessionStorage.getItem("financeSession")) || JSON.parse(localStorage.getItem("financeTrackerUser"));
            return session && session.email ? session.email.toLowerCase() : "guest";
        } catch (e) {
            return "guest";
        }
    },

    // Namespaced storage helpers
    get(key) {
        const email = this.getUserEmail();
        const namespacedKey = `${email}_${key}`;
        return JSON.parse(localStorage.getItem(namespacedKey));
    },

    set(key, data) {
        const email = this.getUserEmail();
        const namespacedKey = `${email}_${key}`;
        localStorage.setItem(namespacedKey, JSON.stringify(data));
    },

    // Getters for specific stores
    getAccounts() {
        return this.get("finance_accounts") || [];
    },

    getBudgets() {
        return this.get("finance_budgets") || [];
    },

    getGoals() {
        return this.get("finance_goals") || [];
    },

    getTransactions() {
        return this.get("finance_transactions") || [];
    },

    getCategories() {
        return this.get("finance_categories") || [];
    },

    getUser() {
        try {
            const session = JSON.parse(sessionStorage.getItem("financeSession")) || JSON.parse(localStorage.getItem("financeTrackerUser"));
            return session || { name: "Admin User", email: "admin@example.com" };
        } catch (e) {
            return { name: "Admin User", email: "admin@example.com" };
        }
    },

    // Setters / Savers
    saveAccounts(accounts) {
        this.set("finance_accounts", accounts);
        this.broadcastChange();
    },

    saveBudgets(budgets) {
        this.set("finance_budgets", budgets);
        this.broadcastChange();
    },

    saveGoals(goals) {
        this.set("finance_goals", goals);
        this.broadcastChange();
    },

    saveTransactions(transactions) {
        this.set("finance_transactions", transactions);
        this.recalculateAllBalances();
        this.broadcastChange();
    },

    saveCategories(categories) {
        this.set("finance_categories", categories);
        this.broadcastChange();
    },

    // Unified State Calculations
    recalculateAllBalances() {
        const transactions = this.getTransactions();
        const accounts = this.getAccounts();
        const budgets = this.getBudgets();

        // 1. Reset accounts to their opening balances
        accounts.forEach(acc => {
            acc.balance = acc.openingBalance || 0;
        });

        // 2. Reset budgets spent limits
        budgets.forEach(b => {
            b.spent = 0;
        });

        // 3. Apply transactions
        transactions.forEach(t => {
            const amount = Number(t.amount);
            
            // Adjust Account Balance
            const account = accounts.find(acc => acc.name === t.accountName || acc.id === t.accountId);
            if (account) {
                if (t.type === "Income") {
                    account.balance += amount;
                } else if (t.type === "Expense") {
                    account.balance -= amount;
                }
            }

            // Adjust Budget Spent
            if (t.type === "Expense") {
                const budget = budgets.find(b => b.category.toLowerCase() === t.category.toLowerCase());
                if (budget) {
                    budget.spent += amount;
                }
            }
        });

        // Save back
        this.set("finance_accounts", accounts);
        this.set("finance_budgets", budgets);
    },

    // Helper to broadcast changes for multi-page reactive components
    broadcastChange() {
        window.dispatchEvent(new Event("financeDataChanged"));
    },

    // Format Currency ($ USD style or ₹ INR style - matching the screenshots using $)
    formatCurrency(amount) {
        const settings = this.get("finance_settings") || { currency: "USD" };
        const currencySymbol = settings.currency === "INR" ? "₹" : "$";
        const sign = amount < 0 ? "-" : "";
        const absVal = Math.abs(amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `${sign}${currencySymbol}${absVal}`;
    },

    // Seed comprehensive mock data matching the exact screenshots
    seedData(force = false) {
        const email = this.getUserEmail();
        if (email === "guest") return; // Skip seeding if not logged in yet
        
        const seedKey = `${email}_seeded`;
        const alreadySeeded = localStorage.getItem(seedKey);

        // 1. DYNAMIC CATEGORY MIGRATION: Ensure standard categories are seeded and Others (Income) exists!
        let categories = this.get("finance_categories") || [];
        const initialCategories = [
            { name: "Salary", icon: "fa-briefcase", color: "#10b981", type: "Income" },
            { name: "Freelance", icon: "fa-laptop-code", color: "#3b82f6", type: "Income" },
            { name: "Investments", icon: "fa-chart-line", color: "#8b5cf6", type: "Income" },
            { name: "Others", icon: "fa-asterisk", color: "#6b7280", type: "Income" },
            { name: "Food & Dining", icon: "fa-utensils", color: "#10b981", type: "Expense" },
            { name: "Transport", icon: "fa-car", color: "#f59e0b", type: "Expense" },
            { name: "Housing", icon: "fa-house", color: "#ef4444", type: "Expense" },
            { name: "Utilities", icon: "fa-bolt", color: "#a855f7", type: "Expense" },
            { name: "Entertainment", icon: "fa-film", color: "#ec4899", type: "Expense" },
            { name: "Shopping", icon: "fa-bag-shopping", color: "#06b6d4", type: "Expense" },
            { name: "Others", icon: "fa-asterisk", color: "#6b7280", type: "Expense" }
        ];

        let categoriesChanged = false;
        initialCategories.forEach(ic => {
            const hasCat = categories.some(c => c.name === ic.name && c.type === ic.type);
            if (!hasCat) {
                categories.push(ic);
                categoriesChanged = true;
            }
        });
        if (categoriesChanged || categories.length === 0) {
            this.set("finance_categories", categories);
        }

        // 2. DYNAMIC ACCOUNT MIGRATION: Ensure default Cash Wallet exists if list is empty!
        let accounts = this.get("finance_accounts") || [];
        if (accounts.length === 0) {
            accounts = [
                { id: "acc-default", name: "Cash Wallet", type: "Cash", provider: "—", openingBalance: 0, balance: 0, number: "Cash", status: "Active" }
            ];
            this.set("finance_accounts", accounts);
        }

        // 3. SETTINGS DEFAULT
        if (!this.get("finance_settings")) {
            this.set("finance_settings", { currency: "USD", theme: "light", notifications: true });
        }

        if (alreadySeeded && !force) {
            this.recalculateAllBalances();
            return;
        }

        // pre-populate demo graphs only for default admin demo account
        if (email === "admin@example.com") {
            const initialAccounts = [
                { id: "acc-1", name: "Checking Account", type: "Bank", provider: "Bank of America", openingBalance: 4250, balance: 4250, number: "•••• 1234", status: "Active" },
                { id: "acc-2", name: "Savings Account", type: "Bank", provider: "Chase", openingBalance: 4950, balance: 4950, number: "•••• 5678", status: "Active" },
                { id: "acc-3", name: "Cash Wallet", type: "Cash", provider: "—", openingBalance: 1250, balance: 1250, number: "Cash", status: "Active" },
                { id: "acc-4", name: "Credit Card", type: "Credit", provider: "Citibank", openingBalance: -2000, balance: -2000, number: "•••• 9012", status: "Active" }
            ];

            const initialBudgets = [
                { category: "Food & Dining", limit: 500, spent: 362.50 },
                { category: "Transport", limit: 300, spent: 240.00 },
                { category: "Housing", limit: 600, spent: 600.00 },
                { category: "Utilities", limit: 150, spent: 98.40 },
                { category: "Entertainment", limit: 120, spent: 85.99 },
                { category: "Shopping", limit: 180, spent: 63.20 },
                { category: "Others", limit: 150, spent: 0.00 }
            ];

            const initialGoals = [
                { id: "goal-1", name: "Buy a New House", target: 10000, saved: 6000, category: "Real Estate", deadline: "2025-12-31", status: "Active" },
                { id: "goal-2", name: "Europe Trip", target: 5000, saved: 2000, category: "Travel", deadline: "2025-08-15", status: "Active" },
                { id: "goal-3", name: "Education Fund", target: 3000, saved: 2100, category: "Personal Development", deadline: "2026-05-31", status: "Active" },
                { id: "goal-4", name: "New Car", target: 4500, saved: 1125, category: "Vehicle", deadline: "2025-11-30", status: "Active" },
                { id: "goal-5", name: "Emergency Fund", target: 2000, saved: 1800, category: "Financial Security", deadline: "2024-06-30", status: "Active" },
                { id: "goal-6", name: "New Laptop", target: 1000, saved: 1000, category: "Electronics", deadline: "2024-04-10", status: "Completed" }
            ];

            const initialTransactions = [
                { id: "tx-1", description: "Salary", category: "Salary", type: "Income", amount: 3500, date: "2024-05-31", accountName: "Checking Account", paymentMethod: "Direct Deposit" },
                { id: "tx-2", description: "Freelance Work", category: "Freelance", type: "Income", amount: 420, date: "2024-05-28", accountName: "Checking Account", paymentMethod: "Bank Transfer" },
                { id: "tx-3", description: "Investment Dividends", category: "Investments", type: "Income", amount: 1500, date: "2024-05-15", accountName: "Savings Account", paymentMethod: "Direct Deposit" },
                
                { id: "tx-4", description: "Grocery Store", category: "Food & Dining", type: "Expense", amount: 120.50, date: "2024-05-30", accountName: "Checking Account", paymentMethod: "Credit Card" },
                { id: "tx-5", description: "Fuel", category: "Transport", type: "Expense", amount: 60, date: "2024-05-29", accountName: "Checking Account", paymentMethod: "Debit Card" },
                { id: "tx-6", description: "Restaurant", category: "Food & Dining", type: "Expense", amount: 45, date: "2024-05-27", accountName: "Checking Account", paymentMethod: "Credit Card" },
                { id: "tx-7", description: "Netflix", category: "Entertainment", type: "Expense", amount: 15.99, date: "2024-05-26", accountName: "Credit Card", paymentMethod: "Debit Card" },
                { id: "tx-8", description: "Electricity Bill", category: "Utilities", type: "Expense", amount: 75, date: "2024-05-24", accountName: "Checking Account", paymentMethod: "Bank Transfer" },
                { id: "tx-9", description: "Internet Bill", category: "Utilities", type: "Expense", amount: 50, date: "2024-05-22", accountName: "Checking Account", paymentMethod: "Bank Transfer" },
                { id: "tx-10", description: "Online Shopping", category: "Shopping", type: "Expense", amount: 80, date: "2024-05-20", accountName: "Checking Account", paymentMethod: "Credit Card" },
                { id: "tx-11", description: "Movie Tickets", category: "Entertainment", type: "Expense", amount: 30, date: "2024-05-18", accountName: "Credit Card", paymentMethod: "UPI" },
                { id: "tx-12", description: "Rent Payment", category: "Housing", type: "Expense", amount: 600, date: "2024-05-05", accountName: "Checking Account", paymentMethod: "Bank Transfer" },
                { id: "tx-13", description: "Gas Station", category: "Transport", type: "Expense", amount: 180, date: "2024-05-12", accountName: "Checking Account", paymentMethod: "Debit Card" },
                { id: "tx-14", description: "Lunch Meeting", category: "Food & Dining", type: "Expense", amount: 197, date: "2024-05-10", accountName: "Checking Account", paymentMethod: "Credit Card" },
                { id: "tx-15", description: "Spotify", category: "Entertainment", type: "Expense", amount: 40, date: "2024-05-08", accountName: "Credit Card", paymentMethod: "Debit Card" },
                { id: "tx-16", description: "Phone Bill", category: "Utilities", type: "Expense", amount: 125, date: "2024-05-06", accountName: "Checking Account", paymentMethod: "Bank Transfer" },
                { id: "tx-17", description: "Department Store", category: "Shopping", type: "Expense", amount: 150, date: "2024-05-04", accountName: "Checking Account", paymentMethod: "Credit Card" },
                { id: "tx-18", description: "Subway Ride", category: "Others", type: "Expense", amount: 56.51, date: "2024-05-02", accountName: "Checking Account", paymentMethod: "UPI" }
            ];

            this.set("finance_accounts", initialAccounts);
            this.set("finance_budgets", initialBudgets);
            this.set("finance_goals", initialGoals);
            this.set("finance_transactions", initialTransactions);
        } else {
            // New user account gets fresh empty state with a default Cash Wallet
            if (!alreadySeeded) {
                const defaultAccounts = [
                    { id: "acc-default", name: "Cash Wallet", type: "Cash", provider: "—", openingBalance: 0, balance: 0, number: "Cash", status: "Active" }
                ];
                this.set("finance_accounts", defaultAccounts);
                this.set("finance_budgets", []);
                this.set("finance_goals", []);
                this.set("finance_transactions", []);
            }
        }

        localStorage.setItem(seedKey, "true");
        this.recalculateAllBalances();
    }
};

// Seed on startup/page load
DB.seedData();
window.DB = DB;
