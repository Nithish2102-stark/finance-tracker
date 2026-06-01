/* ==========================================================================
   BUDGETS CONTROLLER (budget.js)
   ========================================================================== */

let budgetBreakdownChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeBudgets();

    window.addEventListener("financeDataChanged", () => {
        renderBudgetsList();
        updateBudgetsStats();
        renderBudgetsChart();
    });
});

function initializeBudgets() {
    renderBudgetsList();
    updateBudgetsStats();
    renderBudgetsChart();

    // Register Form Handler
    const form = document.getElementById("budgetForm");
    if (form) {
        form.addEventListener("submit", handleBudgetSubmit);
    }
}

/* ==========================================
   STATS & SUMMARY
   ========================================== */
function updateBudgetsStats() {
    const budgets = window.DB.getBudgets();
    
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.limit || 0), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent || 0), 0);
    const remaining = totalBudget - totalSpent;
    const usedPercentage = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

    // Card Stats
    document.getElementById("totalBudgetVal").textContent = window.DB.formatCurrency(totalBudget);
    document.getElementById("totalSpentVal").textContent = window.DB.formatCurrency(totalSpent);
    document.getElementById("totalRemainingVal").textContent = window.DB.formatCurrency(remaining);
    document.getElementById("budgetUsedVal").textContent = usedPercentage + "%";

    // Summary Box Panel (Right Side)
    document.getElementById("summaryTotalBudget").textContent = window.DB.formatCurrency(totalBudget);
    document.getElementById("summaryTotalSpent").textContent = window.DB.formatCurrency(totalSpent);
    document.getElementById("summaryTotalRemaining").textContent = window.DB.formatCurrency(remaining);
    document.getElementById("summaryBudgetUsed").textContent = usedPercentage + "%";
}

/* ==========================================
   BUDGET TABLE LIST
   ========================================== */
function renderBudgetsList() {
    const tbody = document.getElementById("budgetsTableBody");
    if (!tbody) return;

    const budgets = window.DB.getBudgets();
    const filter = document.getElementById("budgetCategoryFilter")?.value || "All";
    
    tbody.innerHTML = "";

    const categoryConfigs = {
        "Food & Dining": { icon: "fa-utensils", color: "var(--success)" },
        "Transport": { icon: "fa-car", color: "var(--warning)" },
        "Housing": { icon: "fa-house", color: "var(--danger)" },
        "Utilities": { icon: "fa-bolt", color: "var(--purple)" },
        "Entertainment": { icon: "fa-film", color: "var(--pink)" },
        "Shopping": { icon: "fa-bag-shopping", color: "var(--cyan)" },
        "Others": { icon: "fa-asterisk", color: "var(--gray-neutral)" }
    };

    const filtered = filter === "All" ? budgets : budgets.filter(b => b.category === filter);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-light);">No budgets found.</td></tr>`;
        return;
    }

    filtered.forEach(b => {
        const catConfig = categoryConfigs[b.category] || { icon: "fa-wallet", color: "var(--primary)" };
        const remaining = b.limit - b.spent;
        const percentage = Math.min((b.spent / b.limit) * 100, 100).toFixed(1);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="table-item-profile">
                    <div class="icon-circle" style="background: ${catConfig.color}15; color: ${catConfig.color}">
                        <i class="fas ${catConfig.icon}"></i>
                    </div>
                    <div>
                        <h5>${b.category}</h5>
                    </div>
                </div>
            </td>
            <td style="font-weight: 600;">
                ${window.DB.formatCurrency(b.limit)}
            </td>
            <td class="negative" style="font-weight: 600;">
                ${window.DB.formatCurrency(b.spent)}
            </td>
            <td class="${remaining < 0 ? 'negative' : 'positive'}" style="font-weight: 600;">
                ${window.DB.formatCurrency(remaining)}
            </td>
            <td>
                <div class="progress-container" style="min-width: 150px;">
                    <div class="progress-bar-label">
                        <span style="font-size: 11px;">${percentage}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${catConfig.color};"></div>
                    </div>
                </div>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editBudgetLimit('${b.category}', ${b.limit})">
                        <i class="fas fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteBudgetLimit('${b.category}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/* ==========================================
   ANALYTICS & CHARTS
   ========================================== */
function renderBudgetsChart() {
    const isDark = document.body.classList.contains("dark-mode");
    const textLabelColor = isDark ? "#94a3b8" : "#64748b";

    const budgets = window.DB.getBudgets();
    const ctx = document.getElementById("budgetBreakdownChart")?.getContext("2d");
    
    if (ctx) {
        if (budgetBreakdownChartInstance) {
            budgetBreakdownChartInstance.destroy();
        }

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

        const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent || 0), 0);

        if (budgets.length === 0 || totalSpent === 0) {
            labels = ["No Budgets Spent"];
            data = [1];
            colors = [isDark ? "#334155" : "#e2e8f0"];
        } else {
            budgets.forEach(b => {
                labels.push(b.category);
                data.push(b.spent);
                colors.push(categoryColors[b.category] || "#6b7280");
            });
        }

        budgetBreakdownChartInstance = new Chart(ctx, {
            type: "doughnut",
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
                cutout: "70%",
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            color: textLabelColor,
                            font: { family: "Outfit", size: 11, weight: "500" },
                            boxWidth: 8,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                if (label === "No Budgets Spent") {
                                    return " No Spending Yet";
                                }
                                const value = context.parsed || 0;
                                return ` Spent in ${label}: ${window.DB.formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

/* ==========================================
   CRUD METHODS
   ========================================== */
function openAddBudgetModal() {
    document.getElementById("budgetModalTitle").textContent = "Create Budget Limit";
    document.getElementById("budgetCategory").value = "";
    document.getElementById("budgetCategory").disabled = false;
    document.getElementById("budgetAmount").value = "";
    openModal("budgetModal");
}

function editBudgetLimit(category, limit) {
    document.getElementById("budgetModalTitle").textContent = "Edit Budget Limit";
    document.getElementById("budgetCategory").value = category;
    document.getElementById("budgetCategory").disabled = true; // category lock
    document.getElementById("budgetAmount").value = limit;
    openModal("budgetModal");
}

function handleBudgetSubmit(event) {
    event.preventDefault();

    // Enable temporarily to capture value in submit if disabled
    document.getElementById("budgetCategory").disabled = false;
    const category = document.getElementById("budgetCategory").value;
    const amount = Number(document.getElementById("budgetAmount").value);

    let budgets = window.DB.getBudgets();
    const existing = budgets.find(b => b.category === category);

    if (existing) {
        existing.limit = amount;
    } else {
        budgets.push({
            category,
            limit: amount,
            spent: 0
        });
    }

    window.DB.saveBudgets(budgets);
    window.DB.recalculateAllBalances(); // sync spent variables
    closeModal("budgetModal");
}

function deleteBudgetLimit(category) {
    const confirmDelete = confirm(`Are you sure you want to delete the budget limit for category "${category}"?`);
    if (!confirmDelete) return;

    let budgets = window.DB.getBudgets();
    // Keep category but set limit to 0
    const b = budgets.find(b => b.category === category);
    if (b) {
        b.limit = 0;
    }
    
    window.DB.saveBudgets(budgets);
    window.DB.recalculateAllBalances();
}

/* ==========================================
   EXPORT CSV
   ========================================== */
function exportBudgetsCSV() {
    const budgets = window.DB.getBudgets();
    let csv = "Category,Limit,Spent,Remaining,Progress\n";

    budgets.forEach(b => {
        const remaining = b.limit - b.spent;
        const progress = b.limit > 0 ? ((b.spent / b.limit) * 100).toFixed(1) : 0;
        csv += `"${b.category}",${b.limit},${b.spent},${remaining},${progress}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial_budgets.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.openAddBudgetModal = openAddBudgetModal;
window.editBudgetLimit = editBudgetLimit;
window.deleteBudgetLimit = deleteBudgetLimit;
window.exportBudgetsCSV = exportBudgetsCSV;
window.renderBudgetsList = renderBudgetsList;