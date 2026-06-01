/* ==========================================================================
   INCOME CONTROLLER (income.js)
   ========================================================================== */

let incomeDoughnutChartInstance = null;
let currentPage = 1;
const itemsPerPage = 8;
let filteredIncomeList = [];

document.addEventListener("DOMContentLoaded", () => {
    initializeIncome();

    window.addEventListener("financeDataChanged", () => {
        filterAndRenderIncome();
        updateIncomeStats();
        renderIncomeChart();
    });
});

function initializeIncome() {
    filterAndRenderIncome();
    updateIncomeStats();
    renderIncomeChart();
    loadAccountDropdown();

    // Register Form Handler
    const form = document.getElementById("incomeForm");
    if (form) {
        form.addEventListener("submit", handleIncomeSubmit);
    }
}

/* ==========================================
   STATS CARDS & METRIC HIGHLIGHTS
   ========================================== */
function updateIncomeStats() {
    const transactions = window.DB.getTransactions().filter(t => t.type === "Income");
    
    // Calculate This Month vs Last Month (Assume May is current, April is last month)
    const thisMonthIncome = transactions
        .filter(t => t.date.startsWith("2024-05"))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const lastMonthIncome = (window.DB.getUserEmail() === "admin@example.com") ? 4800.00 : 0.00; // Mocked baseline from screenshot

    const changePercent = lastMonthIncome > 0 ? (((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100).toFixed(1) : 0;
    const sign = changePercent > 0 ? "+" : "";

    // Stats Cards
    const totalAllTime = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    document.getElementById("totalIncomeVal").textContent = window.DB.formatCurrency(totalAllTime);
    document.getElementById("averageIncomeVal").textContent = window.DB.formatCurrency(totalAllTime); // mock average
    document.getElementById("thisMonthIncomeVal").textContent = window.DB.formatCurrency(thisMonthIncome);
    document.getElementById("incomeTxCount").textContent = transactions.length;

    // Summary panel widget (Right)
    document.getElementById("summaryThisMonthIncome").textContent = window.DB.formatCurrency(thisMonthIncome);
    document.getElementById("summaryLastMonthIncome").textContent = window.DB.formatCurrency(lastMonthIncome);
    document.getElementById("summaryIncomeChange").textContent = `${sign}${changePercent}%`;

    // Compute Top Source
    const categoryTotals = {};
    transactions.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    let topCategory = "None";
    let maxSpent = 0;
    Object.keys(categoryTotals).forEach(cat => {
        if (categoryTotals[cat] > maxSpent) {
            maxSpent = categoryTotals[cat];
            topCategory = cat;
        }
    });

    const categoryIcons = {
        "Salary": "fa-briefcase",
        "Freelance": "fa-laptop-code",
        "Investments": "fa-chart-line"
    };

    if (topCategory !== "None" && totalAllTime > 0) {
        const topRatio = ((maxSpent / totalAllTime) * 100).toFixed(0);
        document.getElementById("topCatName").textContent = topCategory;
        document.getElementById("topCatDetails").textContent = `${window.DB.formatCurrency(maxSpent)} (${topRatio}% of total inflow)`;
        
        const iconElement = document.getElementById("topCatIcon");
        if (iconElement) {
            iconElement.innerHTML = `<i class="fas ${categoryIcons[topCategory] || 'fa-briefcase'}"></i>`;
        }
    }
}

/* ==========================================
   PAGINATED INCOME TABLE
   ========================================== */
function filterAndRenderIncome() {
    const transactions = window.DB.getTransactions().filter(t => t.type === "Income");
    const categoryFilter = document.getElementById("incomeCategoryFilter")?.value || "All";
    const keyword = document.getElementById("incomeSearchInput")?.value.toLowerCase().trim() || "";

    // Apply Filter
    filteredIncomeList = transactions.filter(t => {
        const matchCat = categoryFilter === "All" || t.category === categoryFilter;
        const matchKeyword = !keyword || 
            t.description.toLowerCase().includes(keyword) || 
            t.category.toLowerCase().includes(keyword) ||
            t.paymentMethod.toLowerCase().includes(keyword);
        return matchCat && matchKeyword;
    });

    // Sort descending by date
    filteredIncomeList.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Render Table Page
    renderPage(currentPage);
}

function renderPage(page) {
    const tbody = document.getElementById("incomeTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredIncomeList.length);
    const paginatedItems = filteredIncomeList.slice(startIndex, endIndex);

    if (filteredIncomeList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-light);">No income records found matching filters.</td></tr>`;
        document.getElementById("paginationInfo").textContent = "Showing 0 to 0 of 0 income";
        document.getElementById("paginationControls").innerHTML = "";
        return;
    }

    // Update Foot Info text
    document.getElementById("paginationInfo").textContent = `Showing ${startIndex + 1} to ${endIndex} of ${filteredIncomeList.length} income`;

    const categoryConfigs = {
        "Salary": { icon: "fa-briefcase", color: "var(--success)" },
        "Freelance": { icon: "fa-laptop-code", color: "var(--primary)" },
        "Investments": { icon: "fa-chart-line", color: "var(--purple)" }
    };

    paginatedItems.forEach(t => {
        const catConfig = categoryConfigs[t.category] || { icon: "fa-wallet", color: "var(--primary)" };
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td>
                <div class="table-item-profile">
                    <div class="icon-circle" style="background: ${catConfig.color}15; color: ${catConfig.color}; width: 32px; height: 32px; font-size: 13px;">
                        <i class="fas ${catConfig.icon}"></i>
                    </div>
                    <div>
                        <h5 style="font-size: 13px;">${t.description}</h5>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge" style="background: ${catConfig.color}15; color: ${catConfig.color}">${t.category}</span>
            </td>
            <td class="positive" style="font-weight: 700;">
                +${window.DB.formatCurrency(t.amount)}
            </td>
            <td>
                <span class="badge badge-neutral">${t.paymentMethod || "Direct Deposit"}</span>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="editIncome('${t.id}')">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteIncome('${t.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    renderPaginationControls();
}

function renderPaginationControls() {
    const container = document.getElementById("paginationControls");
    if (!container) return;

    container.innerHTML = "";
    const totalPages = Math.ceil(filteredIncomeList.length / itemsPerPage);

    if (totalPages <= 1) return;

    // Previous Arrow
    const prev = document.createElement("div");
    prev.className = "pagination-page-btn";
    prev.innerHTML = `<i class="fas fa-chevron-left"></i>`;
    prev.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(currentPage); } };
    container.appendChild(prev);

    // Numeric Pages
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("div");
        btn.className = `pagination-page-btn ${currentPage === i ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderPage(currentPage); };
        container.appendChild(btn);
    }

    // Next Arrow
    const next = document.createElement("div");
    next.className = "pagination-page-btn";
    next.innerHTML = `<i class="fas fa-chevron-right"></i>`;
    next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderPage(currentPage); } };
    container.appendChild(next);
}

/* ==========================================
   ANALYTICS & CHARTS
   ========================================== */
function renderIncomeChart() {
    const isDark = document.body.classList.contains("dark-mode");
    const textLabelColor = isDark ? "#94a3b8" : "#64748b";

    const transactions = window.DB.getTransactions().filter(t => t.type === "Income");
    const ctx = document.getElementById("incomeDoughnutChart")?.getContext("2d");

    if (ctx) {
        if (incomeDoughnutChartInstance) {
            incomeDoughnutChartInstance.destroy();
        }

        const categoryTotals = {};
        let totalIncome = 0;
        transactions.forEach(t => {
            const amt = Number(t.amount || 0);
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
            totalIncome += amt;
        });

        let labels = [];
        let data = [];
        let colors = [];

        const categoryColors = {
            "Salary": "#10b981",
            "Freelance": "#3b82f6",
            "Investments": "#8b5cf6",
            "Others": "#6b7280"
        };

        if (totalIncome === 0) {
            labels = ["No Income"];
            data = [1];
            colors = [isDark ? "#334155" : "#e2e8f0"];
        } else {
            Object.keys(categoryTotals).forEach(cat => {
                if (categoryTotals[cat] > 0) {
                    labels.push(cat);
                    data.push(categoryTotals[cat]);
                    colors.push(categoryColors[cat] || "#6b7280");
                }
            });
        }

        incomeDoughnutChartInstance = new Chart(ctx, {
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
                                if (label === "No Income") {
                                    return " No Income Yet";
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
   CRUD METHODS & TRIGGERS
   ========================================== */
function loadAccountDropdown() {
    const select = document.getElementById("incAccount");
    if (!select) return;

    const accounts = window.DB.getAccounts();
    select.innerHTML = "";
    accounts.forEach(acc => {
        const option = document.createElement("option");
        option.value = acc.name;
        option.textContent = acc.name;
        select.appendChild(option);
    });
}

function openAddIncomeModal() {
    document.getElementById("incomeModalTitle").textContent = "Add Income";
    document.getElementById("incomeForm").reset();
    document.getElementById("editIncomeId").value = "";
    openModal("incomeModal");
}

function editIncome(id) {
    const transactions = window.DB.getTransactions();
    const t = transactions.find(item => item.id === id);
    if (!t) return;

    document.getElementById("incomeModalTitle").textContent = "Edit Income";
    document.getElementById("editIncomeId").value = t.id;
    document.getElementById("incDescription").value = t.description;
    document.getElementById("incCategory").value = t.category;
    document.getElementById("incAmount").value = t.amount;
    document.getElementById("incDate").value = t.date;
    document.getElementById("incAccount").value = t.accountName || "";
    document.getElementById("incMethod").value = t.paymentMethod || "Direct Deposit";

    openModal("incomeModal");
}

function handleIncomeSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById("editIncomeId").value;
    const description = document.getElementById("incDescription").value.trim();
    const category = document.getElementById("incCategory").value;
    const amount = Number(document.getElementById("incAmount").value);
    const date = document.getElementById("incDate").value;
    const accountName = document.getElementById("incAccount").value;
    const paymentMethod = document.getElementById("incMethod").value;

    let transactions = window.DB.getTransactions();

    if (editId) {
        // Edit existing
        const txIndex = transactions.findIndex(t => t.id === editId);
        if (txIndex !== -1) {
            transactions[txIndex].description = description;
            transactions[txIndex].category = category;
            transactions[txIndex].amount = amount;
            transactions[txIndex].date = date;
            transactions[txIndex].accountName = accountName;
            transactions[txIndex].paymentMethod = paymentMethod;
        }
    } else {
        // Create new
        const newTx = {
            id: "tx-" + Date.now(),
            description,
            type: "Income",
            category,
            amount,
            date,
            accountName,
            paymentMethod
        };
        transactions.push(newTx);
    }

    window.DB.saveTransactions(transactions);
    closeModal("incomeModal");
}

function deleteIncome(id) {
    const confirmDelete = confirm(`Are you sure you want to delete this income record?`);
    if (!confirmDelete) return;

    let transactions = window.DB.getTransactions();
    const updated = transactions.filter(t => t.id !== id);
    window.DB.saveTransactions(updated);
}

/* ==========================================
   EXPORT CSV
   ========================================== */
function exportIncomeCSV() {
    const transactions = window.DB.getTransactions().filter(t => t.type === "Income");
    let csv = "Date,Description,Category,Amount,Payment Method,Account\n";

    transactions.forEach(t => {
        csv += `"${t.date}","${t.description}","${t.category}",${t.amount},"${t.paymentMethod}","${t.accountName}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial_income.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

window.openAddIncomeModal = openAddIncomeModal;
window.editIncome = editIncome;
window.deleteIncome = deleteIncome;
window.filterAndRenderIncome = filterAndRenderIncome;
window.exportIncomeCSV = exportIncomeCSV;