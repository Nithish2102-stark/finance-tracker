/* ==========================================================================
   ACCOUNTS CONTROLLER (accounts.js)
   ========================================================================= */

let accountsDoughnutChartInstance = null;
let accountsHistoryChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeAccounts();

    window.addEventListener("financeDataChanged", () => {
        renderAccounts();
        updateAccountsStats();
        renderAccountsCharts();
        renderAccountsActivity();
    });
});

function initializeAccounts() {
    renderAccounts();
    updateAccountsStats();
    renderAccountsCharts();
    renderAccountsActivity();

    // Register Form Submissions
    const form = document.getElementById("accountForm");
    if (form) {
        form.addEventListener("submit", handleAccountSubmit);
    }

    const linkForm = document.getElementById("linkAccountForm");
    if (linkForm) {
        linkForm.addEventListener("submit", handleLinkAccountSubmit);
    }

    // Check URL parameters to automatically open Link Bank Account modal if redirected from other subpages
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("link") === "true") {
        openLinkAccountModal();
    }
}

/* ==========================================
   STATS CARDS & COUNTERS
   ========================================== */
function updateAccountsStats() {
    const accounts = window.DB.getAccounts();
    
    const bankAccounts = accounts.filter(acc => acc.type === "Bank");
    const cashAccounts = accounts.filter(acc => acc.type === "Cash");
    const creditAccounts = accounts.filter(acc => acc.type === "Credit");

    const totalBank = bankAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
    const totalCash = cashAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
    const totalCredit = creditAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
    const totalBalance = totalBank + totalCash + totalCredit;

    document.getElementById("totalBalanceVal").textContent = window.DB.formatCurrency(totalBalance);
    document.getElementById("totalAcrossText").textContent = `Across ${accounts.length} accounts`;

    document.getElementById("totalBankVal").textContent = window.DB.formatCurrency(totalBank);
    document.getElementById("bankAccountsText").textContent = `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''}`;

    document.getElementById("totalCashVal").textContent = window.DB.formatCurrency(totalCash);
    document.getElementById("cashAccountsText").textContent = `${cashAccounts.length} account${cashAccounts.length !== 1 ? 's' : ''}`;

    document.getElementById("totalCreditVal").textContent = window.DB.formatCurrency(totalCredit);
    document.getElementById("creditAccountsText").textContent = `${creditAccounts.length} account${creditAccounts.length !== 1 ? 's' : ''}`;
}

/* ==========================================
   ACCOUNTS TABLE
   ========================================== */
function renderAccounts() {
    const tbody = document.getElementById("accountsTableBody");
    if (!tbody) return;

    const accounts = window.DB.getAccounts();
    tbody.innerHTML = "";

    if (accounts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-light);">No accounts created yet.</td></tr>`;
        return;
    }

    const typeIcons = {
        "Bank": { icon: "fa-building-columns", color: "var(--primary)" },
        "Cash": { icon: "fa-money-bill-wave", color: "var(--warning)" },
        "Credit": { icon: "fa-credit-card", color: "var(--danger)" },
        "Investment": { icon: "fa-chart-line", color: "var(--purple)" }
    };

    // Bank provider custom visual icons fallback
    const providerLogos = {
        "bank of america": `<i class="fa-solid fa-flag-usa" style="color: #d1121d;"></i>`,
        "chase": `<i class="fa-solid fa-building-columns" style="color: #115ec3;"></i>`,
        "citibank": `<i class="fa-solid fa-compass" style="color: #002d62;"></i>`,
        "state bank of india": `<i class="fa-solid fa-circle-dot" style="color: #005a9c;"></i>`,
        "hdfc bank": `<i class="fa-solid fa-square-full" style="color: #1c3f94;"></i>`,
        "icici bank": `<i class="fa-solid fa-building-columns" style="color: #f37021;"></i>`,
        "karur vysya bank": `<i class="fa-solid fa-award" style="color: #b78a39;"></i>`,
        "bank of baroda": `<i class="fa-solid fa-sun" style="color: #f05a28;"></i>`,
        "indian overseas bank": `<i class="fa-solid fa-coins" style="color: #003366;"></i>`,
        "canara bank": `<i class="fa-solid fa-landmark" style="color: #0091ff;"></i>`,
        "axis bank": `<i class="fa-solid fa-landmark" style="color: #971b42;"></i>`,
        "—": "—"
    };

    accounts.forEach(acc => {
        const typeConfig = typeIcons[acc.type] || { icon: "fa-wallet", color: "var(--primary)" };
        const key = (acc.provider || "—").toLowerCase().trim();
        
        let logoMarkup = providerLogos[key] || `<i class="fas fa-building" style="color: var(--text-light)"></i>`;
        if (acc.type === "Cash") {
            logoMarkup = "—";
        }

        const isNegative = acc.balance < 0;
        const balanceClass = isNegative ? "negative" : "";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="table-item-profile">
                    <div class="icon-circle" style="background: ${typeConfig.color}15; color: ${typeConfig.color}">
                        <i class="fas ${typeConfig.icon}"></i>
                    </div>
                    <div>
                        <h5>${acc.name}</h5>
                        <p>${acc.number || "—"}${acc.ifsc ? ` • IFSC: ${acc.ifsc}` : ""}</p>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge badge-primary">${acc.type}</span>
            </td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${logoMarkup} <span>${acc.provider || "—"}</span>
                    </div>
                    ${acc.branch ? `<span style="font-size: 11px; color: var(--text-light); margin-left: 20px;">Branch: ${acc.branch}</span>` : ""}
                </div>
            </td>
            <td style="font-weight: 700;" class="${balanceClass}">
                ${window.DB.formatCurrency(acc.balance)}
            </td>
            <td>
                <span class="badge badge-success">${acc.status || "Active"}</span>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editAccount('${acc.id}')">
                        <i class="fas fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteAccount('${acc.id}')">
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
function renderAccountsCharts() {
    const isDark = document.body.classList.contains("dark-mode");
    const gridColor = isDark ? "#334155" : "#f1f5f9";
    const textLabelColor = isDark ? "#94a3b8" : "#64748b";

    const accounts = window.DB.getAccounts();
    const totalBank = accounts.filter(acc => acc.type === "Bank").reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
    const totalCash = accounts.filter(acc => acc.type === "Cash").reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
    const totalCredit = accounts.filter(acc => acc.type === "Credit").reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
    const totalBalance = totalBank + totalCash + totalCredit;

    // 1. Account Summary Doughnut
    const ctxDoughnut = document.getElementById("accountsDoughnutChart")?.getContext("2d");
    if (ctxDoughnut) {
        if (accountsDoughnutChartInstance) {
            accountsDoughnutChartInstance.destroy();
        }

        let labels, data, colors;
        if (totalBalance === 0) {
            labels = ["No Funds"];
            data = [1];
            colors = [isDark ? "#334155" : "#e2e8f0"];
        } else {
            labels = ["Bank Accounts", "Cash", "Credit"];
            data = [totalBank, totalCash, totalCredit];
            colors = ["#4f46e5", "#f59e0b", "#ef4444"];
        }

        accountsDoughnutChartInstance = new Chart(ctxDoughnut, {
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
                            font: { family: "Outfit", size: 12, weight: "500" },
                            boxWidth: 10,
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed || 0;
                                if (context.label === "No Funds") {
                                    return " No Funds Yet";
                                }
                                const pct = totalBalance > 0 ? ((val / totalBalance) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${window.DB.formatCurrency(val)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Balance History Chart (Sleek simple Area chart)
    const ctxLine = document.getElementById("accountsHistoryChart")?.getContext("2d");
    if (ctxLine) {
        if (accountsHistoryChartInstance) {
            accountsHistoryChartInstance.destroy();
        }

        const months = ["May 1", "May 8", "May 15", "May 22", "May 29"];
        let historicalBalance = [7800, 9100, 8400, 9900, 12450];
        if (window.DB.getUserEmail() !== "admin@example.com") {
            historicalBalance = Array(5).fill(totalBalance);
        }

        const gradient = ctxLine.createLinearGradient(0, 0, 0, 150);
        gradient.addColorStop(0, "rgba(79, 70, 229, 0.15)");
        gradient.addColorStop(1, "rgba(79, 70, 229, 0.0)");

        accountsHistoryChartInstance = new Chart(ctxLine, {
            type: "line",
            data: {
                labels: months,
                datasets: [{
                    label: "Balance",
                    data: historicalBalance,
                    borderColor: "#4f46e5",
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { intersect: false, mode: "index" }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textLabelColor, font: { family: "Outfit", size: 10 } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textLabelColor,
                            font: { family: "Outfit", size: 10 },
                            callback: function(val) {
                                const settings = window.DB.get("finance_settings") || { currency: "USD" };
                                const symbol = settings.currency === "INR" ? "₹" : "$";
                                return symbol + (val / 1000) + 'K';
                            }
                        }
                    }
                }
            }
        });
    }
}

/* ==========================================
   RECENT ACCOUNT ACTIVITY
   ========================================== */
function renderAccountsActivity() {
    const container = document.getElementById("accountActivityFeed");
    if (!container) return;

    container.innerHTML = "";

    let activity = [];
    if (window.DB.getUserEmail() === "admin@example.com") {
        activity = [
            { account: "Checking Account", action: "Deposit", date: "May 31, 2024", amount: 1200, type: "Income", color: "var(--success)", icon: "fa-building-columns" },
            { account: "Savings Account", action: "Transfer In", date: "May 30, 2024", amount: 800, type: "Income", color: "var(--success)", icon: "fa-circle-dollar-to-slot" },
            { account: "Credit Card", action: "Payment", date: "May 29, 2024", amount: -500, type: "Expense", color: "var(--danger)", icon: "fa-credit-card" }
        ];
    } else {
        const transactions = window.DB.getTransactions();
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
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

        activity = sorted.map(t => {
            const catConfig = categoryIcons[t.category] || { icon: "fa-wallet", color: "var(--primary)" };
            return {
                account: t.accountName,
                action: t.type === "Income" ? "Deposit" : "Payment",
                date: formatDate(t.date),
                amount: t.amount * (t.type === "Income" ? 1 : -1),
                type: t.type,
                color: catConfig.color,
                icon: catConfig.icon
            };
        });
    }

    if (activity.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-light)">No activity found</div>`;
        return;
    }

    activity.forEach(act => {
        const sign = act.type === "Income" ? "+" : "";
        const amountClass = act.type === "Income" ? "positive" : "negative";

        const div = document.createElement("div");
        div.className = "activity-feed-item";
        div.innerHTML = `
            <div class="activity-feed-left">
                <div class="activity-feed-icon" style="background: ${act.color}15; color: ${act.color}">
                    <i class="fas ${act.icon}"></i>
                </div>
                <div class="activity-feed-meta">
                    <h5>${act.account || "Transaction"}</h5>
                    <p>${act.action} • ${act.date}</p>
                </div>
            </div>
            <div class="activity-feed-amount ${amountClass}">
                ${sign}${window.DB.formatCurrency(act.amount)}
            </div>
        `;
        container.appendChild(div);
    });
}

/* ==========================================
   CRUD FORMS & TRIGGERS
   ========================================== */
function openAddAccountModal() {
    document.getElementById("accountModalTitle").textContent = "Add Account";
    document.getElementById("accountForm").reset();
    document.getElementById("editAccountId").value = "";
    document.getElementById("accBalance").disabled = false;
    openModal("accountModal");
}

function editAccount(id) {
    const accounts = window.DB.getAccounts();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById("accountModalTitle").textContent = "Edit Account";
    document.getElementById("editAccountId").value = acc.id;
    document.getElementById("accName").value = acc.name;
    document.getElementById("accHolderName").value = acc.fullName || "";
    document.getElementById("accType").value = acc.type;
    document.getElementById("accProvider").value = acc.provider || "";
    
    // Strip "•••• " when editing if it exists, or show full number
    let rawNumber = acc.number || "";
    if (rawNumber.startsWith("•••• ")) {
        rawNumber = rawNumber.replace("•••• ", "");
    }
    document.getElementById("accNumber").value = rawNumber;
    
    document.getElementById("accBalance").value = acc.balance;
    document.getElementById("accBalance").disabled = true; // Block opening balance edits to preserve transaction calculations
    document.getElementById("accIfsc").value = acc.ifsc || "";
    document.getElementById("accBranch").value = acc.branch || "";

    openModal("accountModal");
}

function handleAccountSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById("editAccountId").value;
    const name = document.getElementById("accName").value.trim();
    const holderName = document.getElementById("accHolderName").value.trim();
    const type = document.getElementById("accType").value;
    const provider = document.getElementById("accProvider").value.trim();
    const number = document.getElementById("accNumber").value.trim();
    const balance = Number(document.getElementById("accBalance").value);
    const ifsc = document.getElementById("accIfsc").value.trim();
    const branch = document.getElementById("accBranch").value.trim();

    let accounts = window.DB.getAccounts();

    if (editId) {
        // Edit existing
        const accIndex = accounts.findIndex(a => a.id === editId);
        if (accIndex !== -1) {
            accounts[accIndex].name = name;
            accounts[accIndex].fullName = holderName;
            accounts[accIndex].type = type;
            accounts[accIndex].provider = provider;
            accounts[accIndex].number = number.includes("••••") ? number : (number ? "•••• " + number : "—");
            accounts[accIndex].ifsc = ifsc;
            accounts[accIndex].branch = branch;
        }
    } else {
        // Create new
        const newAcc = {
            id: "acc-" + Date.now(),
            name,
            fullName: holderName,
            type,
            provider,
            openingBalance: balance,
            balance: balance,
            number: number ? "•••• " + number : "—",
            ifsc,
            branch,
            status: "Active"
        };
        accounts.push(newAcc);
    }

    window.DB.saveAccounts(accounts);
    closeModal("accountModal");
}

function deleteAccount(id) {
    const accounts = window.DB.getAccounts();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    const confirmDelete = confirm(`Are you sure you want to delete account "${acc.name}"? This will affect your total balances.`);
    if (!confirmDelete) return;

    const updated = accounts.filter(a => a.id !== id);
    window.DB.saveAccounts(updated);
}

/* ==========================================
   EXPORT CSV
   ========================================== */
function exportAccountsCSV() {
    const accounts = window.DB.getAccounts();
    let csv = "Account Name,Type,Bank/Provider,Balance,Status\n";

    accounts.forEach(acc => {
        csv += `"${acc.name}","${acc.type}","${acc.provider || '—'}",${acc.balance},"${acc.status || 'Active'}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial_accounts.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.openAddAccountModal = openAddAccountModal;
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;
window.exportAccountsCSV = exportAccountsCSV;

// Link Bank Account Helpers
function openLinkAccountModal() {
    document.getElementById("linkAccountForm").reset();
    document.getElementById("linkFormFields").style.display = "block";
    document.getElementById("bankSyncSpinner").style.display = "none";
    document.getElementById("linkModalFooter").style.display = "flex";
    openModal("linkAccountModal");
}

function handleLinkAccountSubmit(event) {
    event.preventDefault();

    const bankName = document.getElementById("linkBank").value;
    const holderName = document.getElementById("linkHolderName").value.trim();
    const accountNumber = document.getElementById("linkAccountNumber").value.trim();
    const balance = Number(document.getElementById("linkBalance").value);
    const ifscCode = document.getElementById("linkIfscCode").value.trim();
    const branchName = document.getElementById("linkBranch").value.trim();
    const pin = document.getElementById("linkPin").value;

    // Show visual syncing spinner
    document.getElementById("linkFormFields").style.display = "none";
    document.getElementById("bankSyncSpinner").style.display = "block";
    document.getElementById("linkModalFooter").style.display = "none";

    setTimeout(() => {
        const accounts = window.DB.getAccounts();
        const accId = "acc-sync-" + Date.now();
        
        const newAcc = {
            id: accId,
            name: `${bankName} Checking`,
            type: "Bank",
            provider: bankName,
            openingBalance: balance,
            balance: balance,
            number: `•••• ${accountNumber.slice(-4)}`,
            fullName: holderName,
            ifsc: ifscCode,
            branch: branchName,
            status: "Active"
        };
        
        accounts.push(newAcc);
        window.DB.saveAccounts(accounts);

        // Seed 3 realistic transactions directly matching Indian banks and standard configurations
        const transactions = window.DB.getTransactions();
        const currentDate = new Date().toISOString().split("T")[0];
        
        const seedTxs = [
            {
                id: "tx-sync-" + Date.now() + "-1",
                description: `${bankName} Direct Salary`,
                category: "Salary",
                type: "Income",
                amount: 45000.00,
                date: currentDate,
                accountName: newAcc.name,
                paymentMethod: "Direct Deposit"
            },
            {
                id: "tx-sync-" + Date.now() + "-2",
                description: "Indian Oil Fuel Synced",
                category: "Transport",
                type: "Expense",
                amount: 1200.00,
                date: currentDate,
                accountName: newAcc.name,
                paymentMethod: "Debit Card"
            },
            {
                id: "tx-sync-" + Date.now() + "-3",
                description: "Swiggy Food Delivery",
                category: "Food & Dining",
                type: "Expense",
                amount: 320.00,
                date: currentDate,
                accountName: newAcc.name,
                paymentMethod: "UPI"
            }
        ];

        transactions.push(...seedTxs);
        window.DB.saveTransactions(transactions);

        closeModal("linkAccountModal");
        
        if (window.showNotification) {
            window.showNotification(`Successfully linked ${bankName}! Synced 3 recent Indian transactions straight into your ledger.`, "success");
        } else {
            alert(`Successfully linked ${bankName}! Synced 3 recent Indian transactions straight into your ledger.`);
        }
    }, 1800);
}

window.openLinkAccountModal = openLinkAccountModal;
window.closeLinkAccountModal = () => closeModal("linkAccountModal");