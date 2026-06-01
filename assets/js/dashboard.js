/* ==========================================================================
   DASHBOARD CONTROLLER (dashboard.js)
   ========================================================================== */

let cashFlowChartInstance = null;
let spendingChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
    
    // Listen for global data changes to re-render
    window.addEventListener("financeDataChanged", () => {
        updateDashboardCards();
        renderRecentTransactions();
        renderBudgets();
        renderGoalsList();
        renderCharts();
    });
});

function initializeDashboard() {
    // Basic seeds & statistics
    updateDashboardCards();
    renderRecentTransactions();
    renderBudgets();
    renderGoalsList();
    renderCharts();

    // Load drop-downs inside forms
    loadAccountDropdown();
    loadCategoryDropdown();

    // Register form handler
    const form = document.getElementById("addTransactionForm");
    if (form) {
        form.addEventListener("submit", handleTransactionSubmit);
    }
}

/* ==========================================
   CARDS & METRICS
   ========================================== */
function updateDashboardCards() {
    const transactions = window.DB.getTransactions();
    const accounts = window.DB.getAccounts();

    // 1. Total Balance
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    document.getElementById("dashboardBalanceVal").textContent = window.DB.formatCurrency(totalBalance);

    // 2. Inflow / Outflow totals
    const totalIncome = transactions
        .filter(t => t.type === "Income")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const totalExpense = transactions
        .filter(t => t.type === "Expense")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const netSavings = totalIncome - totalExpense;

    document.getElementById("dashboardIncomeVal").textContent = window.DB.formatCurrency(totalIncome);
    document.getElementById("dashboardExpenseVal").textContent = window.DB.formatCurrency(totalExpense);
    document.getElementById("dashboardSavingsVal").textContent = window.DB.formatCurrency(netSavings);
}

/* ==========================================
   LIST RENDERING (Transactions, Budgets, Goals)
   ========================================== */
function renderRecentTransactions() {
    const listContainer = document.getElementById("recentTransactionsList");
    if (!listContainer) return;

    const transactions = window.DB.getTransactions();
    // Sort descending by date
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    listContainer.innerHTML = "";

    if (sorted.length === 0) {
        listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-light);">No recent transactions found</td></tr>`;
        return;
    }

    const categoryIcons = {
        "Salary": { icon: "fa-briefcase", color: "var(--success)" },
        "Freelance": { icon: "fa-laptop-code", color: "var(--primary)" },
        "Investments": { icon: "fa-chart-line", color: "var(--purple)" },
        "Food & Dining": { icon: "fa-utensils", color: "var(--success)" },
        "Transport": { icon: "fa-car", color: "var(--warning)" },
        "Housing": { icon: "fa-house", color: "var(--danger)" },
        "Utilities": { icon: "fa-bolt", color: "var(--purple)" },
        "Entertainment": { icon: "fa-film", color: "var(--pink)" },
        "Shopping": { icon: "fa-bag-shopping", color: "var(--cyan)" },
        "Others": { icon: "fa-asterisk", color: "var(--gray-neutral)" }
    };

    sorted.forEach(t => {
        const catConfig = categoryIcons[t.category] || { icon: "fa-dollar-sign", color: "var(--primary)" };
        const isIncome = t.type === "Income";
        const sign = isIncome ? "+" : "-";
        const amountClass = isIncome ? "positive" : "negative";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="table-item-profile">
                    <div class="icon-circle" style="background: ${catConfig.color}15; color: ${catConfig.color}">
                        <i class="fas ${catConfig.icon}"></i>
                    </div>
                    <div>
                        <h5>${t.description}</h5>
                        <p>${formatDate(t.date)} • ${t.category}</p>
                    </div>
                </div>
            </td>
            <td style="text-align: right; font-weight: 700;" class="${amountClass}">
                ${sign}${window.DB.formatCurrency(t.amount)}
            </td>
        `;
        listContainer.appendChild(row);
    });
}

function renderBudgets() {
    const container = document.getElementById("budgetListOverview");
    if (!container) return;

    const budgets = window.DB.getBudgets();
    container.innerHTML = "";

    const activeBudgets = budgets.slice(0, 5); // display 5 in dashboard

    const categoryColors = {
        "Food & Dining": "var(--success)",
        "Transport": "var(--warning)",
        "Housing": "var(--danger)",
        "Utilities": "var(--purple)",
        "Entertainment": "var(--pink)",
        "Shopping": "var(--cyan)",
        "Others": "var(--gray-neutral)"
    };

    activeBudgets.forEach(b => {
        const percentage = Math.min((b.spent / b.limit) * 100, 100);
        const color = categoryColors[b.category] || "var(--primary)";

        const item = document.createElement("div");
        item.className = "progress-container";
        item.innerHTML = `
            <div class="progress-bar-label">
                <span>${b.category}</span>
                <span>${window.DB.formatCurrency(b.spent)} of ${window.DB.formatCurrency(b.limit)}</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderGoalsList() {
    const container = document.getElementById("goalsListOverview");
    if (!container) return;

    const goals = window.DB.getGoals();
    container.innerHTML = "";

    const dashboardGoals = goals.filter(g => g.status === "Active").slice(0, 3); // show 3

    dashboardGoals.forEach(g => {
        const percentage = Math.min((g.saved / g.target) * 100, 100);

        const item = document.createElement("div");
        item.className = "progress-container";
        item.innerHTML = `
            <div class="progress-bar-label">
                <span>${g.name}</span>
                <span>${window.DB.formatCurrency(g.saved)} of ${window.DB.formatCurrency(g.target)}</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percentage}%; background-color: var(--primary);"></div>
            </div>
        `;
        container.appendChild(item);
    });
}

/* ==========================================
   CHARTS & GRAPHS
   ========================================== */
function renderCharts() {
    const transactions = window.DB.getTransactions();
    const isDark = document.body.classList.contains("dark-mode");
    const gridColor = isDark ? "#334155" : "#f1f5f9";
    const textLabelColor = isDark ? "#94a3b8" : "#64748b";

    // 1. CASH FLOW OVERVIEW CHART (Line Graph)
    const ctxLine = document.getElementById("cashFlowChart")?.getContext("2d");
    if (ctxLine) {
        if (cashFlowChartInstance) {
            cashFlowChartInstance.destroy();
        }

        // Determine selected month parameters
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth(); // 0-indexed
        
        // If it's the admin demo account, default to May 2024 to preserve the demo datasets
        if (window.DB.getUserEmail() === "admin@example.com") {
            year = 2024;
            month = 4; // May
        }
        
        const numDays = new Date(year, month + 1, 0).getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonthName = monthNames[month];
        
        const days = Array.from({ length: numDays }, (_, i) => `${currentMonthName} ${i + 1}`);
        const incomesData = Array(numDays).fill(0);
        const expensesData = Array(numDays).fill(0);
        const savingsData = Array(numDays).fill(0);

        // Populate mock progressive values styled like the screenshot
        let progressiveIncome = (window.DB.getUserEmail() === "admin@example.com") ? 1800 : 0;
        let progressiveExpense = (window.DB.getUserEmail() === "admin@example.com") ? 800 : 0;

        for (let i = 0; i < numDays; i++) {
            // Find transactions on this specific day
            const dayNum = i + 1;
            const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const matches = transactions.filter(t => t.date === formattedDate);
            
            matches.forEach(t => {
                if (t.type === "Income") {
                    progressiveIncome += Number(t.amount || 0);
                } else {
                    progressiveExpense += Number(t.amount || 0);
                }
            });

            incomesData[i] = progressiveIncome;
            expensesData[i] = progressiveExpense;
            savingsData[i] = progressiveIncome - progressiveExpense;
        }

        const maxVal = Math.max(...incomesData, ...expensesData, ...savingsData);
        const hasNoData = maxVal === 0;
        
        const settings = window.DB.get("finance_settings") || { currency: "USD" };
        const symbol = settings.currency === "INR" ? "₹" : "$";

        const gradientIncome = ctxLine.createLinearGradient(0, 0, 0, 300);
        gradientIncome.addColorStop(0, "rgba(16, 185, 129, 0.15)");
        gradientIncome.addColorStop(1, "rgba(16, 185, 129, 0.0)");

        const gradientExpense = ctxLine.createLinearGradient(0, 0, 0, 300);
        gradientExpense.addColorStop(0, "rgba(239, 68, 68, 0.15)");
        gradientExpense.addColorStop(1, "rgba(239, 68, 68, 0.0)");

        const gradientSavings = ctxLine.createLinearGradient(0, 0, 0, 300);
        gradientSavings.addColorStop(0, "rgba(79, 70, 229, 0.15)");
        gradientSavings.addColorStop(1, "rgba(79, 70, 229, 0.0)");

        const yScale = {
            grid: { color: gridColor },
            ticks: {
                color: textLabelColor,
                font: { family: 'Outfit' },
                callback: function(value) {
                    if (value === 0) return symbol + '0';
                    return symbol + (value / 1000) + 'K';
                }
            }
        };

        if (hasNoData) {
            yScale.min = 0;
            yScale.max = 5000;
        }

        cashFlowChartInstance = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Income',
                        data: incomesData,
                        borderColor: '#10b981',
                        borderWidth: 3,
                        backgroundColor: gradientIncome,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Expenses',
                        data: expensesData,
                        borderColor: '#ef4444',
                        borderWidth: 3,
                        backgroundColor: gradientExpense,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Savings',
                        data: savingsData,
                        borderColor: '#4f46e5',
                        borderWidth: 3,
                        backgroundColor: gradientSavings,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textLabelColor,
                            font: { family: 'Outfit', size: 13, weight: '500' }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
                        bodyFont: { family: 'Outfit', size: 13 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textLabelColor,
                            font: { family: 'Outfit' },
                            maxTicksLimit: 6
                        }
                    },
                    y: yScale
                }
            }
        });
    }

    // 2. SPENDING BREAKDOWN CHART (Doughnut)
    const ctxDoughnut = document.getElementById("spendingDoughnutChart")?.getContext("2d");
    if (ctxDoughnut) {
        if (spendingChartInstance) {
            spendingChartInstance.destroy();
        }

        const expenses = transactions.filter(t => t.type === "Expense");
        
        const categoryMap = {
            "Food & Dining": 0,
            "Transport": 0,
            "Housing": 0,
            "Utilities": 0,
            "Entertainment": 0,
            "Shopping": 0,
            "Others": 0
        };
        
        let totalExpenses = 0;
        expenses.forEach(t => {
            const amt = Number(t.amount || 0);
            if (categoryMap[t.category] !== undefined) {
                categoryMap[t.category] += amt;
            } else {
                categoryMap["Others"] += amt;
            }
            totalExpenses += amt;
        });

        let labels = [];
        let data = [];
        let colors = [];

        const categoryColors = {
            "Food & Dining": "#10b981",
            "Transport": "#f59e0b",
            "Housing": "#ef4444",
            "Utilities": "#8b5cf6",
            "Entertainment": "#ec4899",
            "Shopping": "#06b6d4",
            "Others": "#6b7280"
        };

        if (totalExpenses === 0) {
            labels = ["No Expenses"];
            data = [1];
            colors = [isDark ? "#334155" : "#e2e8f0"];
        } else {
            Object.keys(categoryMap).forEach(cat => {
                if (categoryMap[cat] > 0) {
                    labels.push(cat);
                    data.push(categoryMap[cat]);
                    colors.push(categoryColors[cat] || "#6b7280");
                }
            });
        }

        spendingChartInstance = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: isDark ? 3 : 1,
                    borderColor: isDark ? "#1e293b" : "#ffffff",
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textLabelColor,
                            font: { family: 'Outfit', size: 12, weight: '500' },
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                if (label === "No Expenses") {
                                    return " No Expenses Yet";
                                }
                                const value = context.parsed || 0;
                                return ` ${label}: ${window.DB.formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

/* ==========================================
   MODAL POPULATING & SUBMISSION
   ========================================== */
function loadAccountDropdown() {
    const select = document.getElementById("txAccount");
    if (!select) return;

    const accounts = window.DB.getAccounts();
    select.innerHTML = "";
    accounts.forEach(acc => {
        const option = document.createElement("option");
        option.value = acc.name;
        option.textContent = `${acc.name} (${window.DB.formatCurrency(acc.balance)})`;
        select.appendChild(option);
    });
}

function loadCategoryDropdown() {
    const typeSelect = document.getElementById("txType");
    const catSelect = document.getElementById("txCategory");
    if (!typeSelect || !catSelect) return;

    const type = typeSelect.value;
    const categories = window.DB.getCategories().filter(cat => cat.type === type);

    catSelect.innerHTML = "";
    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.name;
        option.textContent = cat.name;
        catSelect.appendChild(option);
    });
}

function openExpenseModal() {
    const typeSelect = document.getElementById("txType");
    if (typeSelect) {
        typeSelect.value = "Expense";
        loadCategoryDropdown();
    }
    document.getElementById("modalTitle").textContent = "Add Expense";
    openModal("addTxModal");
}

function handleTransactionSubmit(event) {
    event.preventDefault();

    const description = document.getElementById("txDescription").value.trim();
    const type = document.getElementById("txType").value;
    const category = document.getElementById("txCategory").value;
    const amount = Number(document.getElementById("txAmount").value);
    const date = document.getElementById("txDate").value;
    const accountName = document.getElementById("txAccount").value;
    const paymentMethod = document.getElementById("txMethod").value;

    if (!description || isNaN(amount) || amount <= 0 || !date) {
        showNotification("Please fill all required inputs correctly.", "error");
        return;
    }

    const newTx = {
        id: "tx-" + Date.now(),
        description,
        type,
        category,
        amount,
        date,
        accountName,
        paymentMethod
    };

    const transactions = window.DB.getTransactions();
    transactions.push(newTx);
    window.DB.saveTransactions(transactions);

    document.getElementById("addTransactionForm").reset();
    closeModal("addTxModal");
    showNotification(`Added ${type} transaction: ${description} successfully!`);
}

/* ==========================================
   HELPERS
   ========================================== */
function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

function showNotification(message, type = "success") {
    // Call globally defined notification or alert fallback
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}
window.loadCategoryDropdown = loadCategoryDropdown;
window.openExpenseModal = openExpenseModal;