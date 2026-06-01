/* ==========================================================================
   REPORTS CONTROLLER (reports.js)
   ========================================================================== */

let comparisonChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeReports();

    window.addEventListener("financeDataChanged", () => {
        calculateAndRenderReports();
    });
});

function initializeReports() {
    calculateAndRenderReports();

    // Bind filters
    const filterBtn = document.getElementById("applyReportFilter");
    const resetBtn = document.getElementById("resetReportFilter");
    
    if (filterBtn) filterBtn.addEventListener("click", applyDateFilter);
    if (resetBtn) resetBtn.addEventListener("click", resetDateFilter);

    // Bind exports
    const csvBtn = document.getElementById("exportCSVBtn");
    const jsonBtn = document.getElementById("exportJSONBtn");

    if (csvBtn) csvBtn.addEventListener("click", exportCSVStatement);
    if (jsonBtn) jsonBtn.addEventListener("click", exportJSONBackup);
}

/* ==========================================
   REPORT COMPILER
   ========================================== */
function calculateAndRenderReports(startDate = null, endDate = null) {
    let transactions = window.DB.getTransactions();

    // Filter by dates if selected
    if (startDate && endDate) {
        transactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    }

    const totalIncome = transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpense = transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const netProfit = totalIncome - totalExpense;

    // 1. Populate Metrics
    document.getElementById("reportIncomeVal").textContent = window.DB.formatCurrency(totalIncome);
    document.getElementById("reportExpenseVal").textContent = window.DB.formatCurrency(totalExpense);
    document.getElementById("reportProfitVal").textContent = window.DB.formatCurrency(netProfit);

    // 2. Populate Category Breakdown Table (Right Column)
    renderCategoryReport(transactions);

    // 3. Draw Comparison Chart
    renderComparisonChart(totalIncome, totalExpense);

    // 4. Populate Monthly Financial Summaries
    renderMonthlyReportTable(transactions);
}

function renderCategoryReport(transactions) {
    const tbody = document.getElementById("categoryReportBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const expenseTx = transactions.filter(t => t.type === "Expense");
    const categoryTotals = {};

    expenseTx.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    const categories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-light);">No category data found.</td></tr>`;
        return;
    }

    categories.forEach(cat => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="font-weight: 600;">${cat}</td>
            <td style="text-align: right; font-weight: 700; color: var(--danger)">
                ${window.DB.formatCurrency(categoryTotals[cat])}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderComparisonChart(income, expense) {
    const ctx = document.getElementById("reportChart")?.getContext("2d");
    if (!ctx) return;

    if (comparisonChartInstance) {
        comparisonChartInstance.destroy();
    }

    const isDark = document.body.classList.contains("dark-mode");
    const textLabelColor = isDark ? "#94a3b8" : "#64748b";

    comparisonChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Inflow / Income", "Outflow / Expenses"],
            datasets: [{
                data: [income, expense],
                backgroundColor: ["#10b981", "#ef4444"],
                borderWidth: 0,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Total: ${window.DB.formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textLabelColor, font: { family: "Outfit", size: 13, weight: "600" } }
                },
                y: {
                    grid: { color: isDark ? "#334155" : "#f1f5f9" },
                    ticks: { color: textLabelColor, font: { family: "Outfit" } }
                }
            }
        }
    });
}

function renderMonthlyReportTable(transactions) {
    const tbody = document.getElementById("monthlyReportBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const monthlySummary = {};
    transactions.forEach(t => {
        // format Date as "YYYY-MM"
        const dateObj = new Date(t.date);
        if (isNaN(dateObj)) return;
        
        const monthKey = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });
        if (!monthlySummary[monthKey]) {
            monthlySummary[monthKey] = { income: 0, expense: 0 };
        }

        if (t.type === "Income") {
            monthlySummary[monthKey].income += Number(t.amount);
        } else {
            monthlySummary[monthKey].expense += Number(t.amount);
        }
    });

    const months = Object.keys(monthlySummary);

    if (months.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-light);">No monthly records compiled yet.</td></tr>`;
        return;
    }

    months.forEach(m => {
        const data = monthlySummary[m];
        const net = data.income - data.expense;
        const sign = net > 0 ? "+" : "";
        const statusBadge = net >= 0 ? "badge-success" : "badge-danger";
        const statusText = net >= 0 ? "Surplus" : "Deficit";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="font-weight: 600;">${m}</td>
            <td class="positive" style="font-weight: 600;">${window.DB.formatCurrency(data.income)}</td>
            <td class="negative" style="font-weight: 600;">-${window.DB.formatCurrency(data.expense)}</td>
            <td style="font-weight: 700;" class="${net >= 0 ? 'positive' : 'negative'}">
                ${sign}${window.DB.formatCurrency(net)}
            </td>
            <td>
                <span class="badge ${statusBadge}">${statusText}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/* ==========================================
   DATE FILTERS
   ========================================== */
function applyDateFilter() {
    const start = document.getElementById("reportStartDate").value;
    const end = document.getElementById("reportEndDate").value;

    if (!start || !end) {
        alert("Please enter both start date and end date.");
        return;
    }

    calculateAndRenderReports(start, end);
}

function resetDateFilter() {
    document.getElementById("reportStartDate").value = "";
    document.getElementById("reportEndDate").value = "";
    calculateAndRenderReports();
}

/* ==========================================
   EXPORTS
   ========================================== */
function exportCSVStatement() {
    const transactions = window.DB.getTransactions();
    let csv = "Date,Description,Category,Type,Amount,Account,Method\n";

    transactions.forEach(t => {
        csv += `"${t.date}","${t.description}","${t.category}","${t.type}",${t.amount},"${t.accountName}","${t.paymentMethod}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial_statement.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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
    link.download = "finance_backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}