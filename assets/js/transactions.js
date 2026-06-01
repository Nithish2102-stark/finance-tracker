/* ==========================================================================
   TRANSACTIONS CONTROLLER (transactions.js)
   ========================================================================== */

let currentPage = 1;
const itemsPerPage = 10;
let filteredTxList = [];

document.addEventListener("DOMContentLoaded", () => {
    initializeTransactions();

    window.addEventListener("financeDataChanged", () => {
        filterAndRenderTransactions();
        updateTransactionsStats();
    });
});

function initializeTransactions() {
    loadFilterCategoryDropdown();
    filterAndRenderTransactions();
    updateTransactionsStats();
    
    // Load inputs in form
    loadFormAccountDropdown();
    loadCategoryDropdown();

    // Register Form Handler
    const form = document.getElementById("addTransactionForm");
    if (form) {
        form.addEventListener("submit", handleTransactionSubmit);
    }
}

/* ==========================================
   STATS CARDS
   ========================================== */
function updateTransactionsStats() {
    const transactions = window.DB.getTransactions();
    
    const inflow = transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const outflow = transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const netflow = inflow - outflow;

    document.getElementById("totalTxCount").textContent = transactions.length;
    document.getElementById("totalInflowVal").textContent = window.DB.formatCurrency(inflow);
    document.getElementById("totalOutflowVal").textContent = window.DB.formatCurrency(outflow);
    document.getElementById("netFlowVal").textContent = window.DB.formatCurrency(netflow);
}

/* ==========================================
   TABLE LEDGER LIST (FILTERS & SEARCH)
   ========================================== */
function loadFilterCategoryDropdown() {
    const select = document.getElementById("txCategoryFilter");
    if (!select) return;

    const categories = window.DB.getCategories();
    select.innerHTML = `<option value="All">All Categories</option>`;
    
    // unique names
    const unique = [...new Set(categories.map(cat => cat.name))];
    unique.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function filterAndRenderTransactions() {
    const transactions = window.DB.getTransactions();
    const typeFilter = document.getElementById("txTypeFilter")?.value || "All";
    const categoryFilter = document.getElementById("txCategoryFilter")?.value || "All";
    const keyword = document.getElementById("txSearchInput")?.value.toLowerCase().trim() || "";

    filteredTxList = transactions.filter(t => {
        const matchType = typeFilter === "All" || t.type === typeFilter;
        const matchCat = categoryFilter === "All" || t.category === categoryFilter;
        const matchKeyword = !keyword || 
            t.description.toLowerCase().includes(keyword) || 
            t.category.toLowerCase().includes(keyword) ||
            t.paymentMethod.toLowerCase().includes(keyword) ||
            (t.accountName || "").toLowerCase().includes(keyword);
        
        return matchType && matchCat && matchKeyword;
    });

    // Sort descending by date
    filteredTxList.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderPage(currentPage);
}

function renderPage(page) {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredTxList.length);
    const paginatedItems = filteredTxList.slice(startIndex, endIndex);

    if (filteredTxList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-light);">No transaction records found matching filters.</td></tr>`;
        document.getElementById("paginationInfo").textContent = "Showing 0 to 0 of 0 transactions";
        document.getElementById("paginationControls").innerHTML = "";
        return;
    }

    document.getElementById("paginationInfo").textContent = `Showing ${startIndex + 1} to ${endIndex} of ${filteredTxList.length} transactions`;

    const categoryConfigs = {
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

    paginatedItems.forEach(t => {
        const catConfig = categoryConfigs[t.category] || { icon: "fa-wallet", color: "var(--primary)" };
        const isIncome = t.type === "Income";
        const sign = isIncome ? "+" : "-";
        const amountClass = isIncome ? "positive" : "negative";

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
            <td>
                <span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">${t.type}</span>
            </td>
            <td>
                <span style="font-size: 13px; font-weight: 500;">${t.accountName || "Checking Account"}</span>
            </td>
            <td class="${amountClass}" style="font-weight: 700;">
                ${sign}${window.DB.formatCurrency(t.amount)}
            </td>
            <td>
                <span class="badge badge-neutral">${t.paymentMethod || "Credit Card"}</span>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="editTransaction('${t.id}')">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteTransaction('${t.id}')">
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
    const totalPages = Math.ceil(filteredTxList.length / itemsPerPage);

    if (totalPages <= 1) return;

    const prev = document.createElement("div");
    prev.className = "pagination-page-btn";
    prev.innerHTML = `<i class="fas fa-chevron-left"></i>`;
    prev.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(currentPage); } };
    container.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("div");
        btn.className = `pagination-page-btn ${currentPage === i ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderPage(currentPage); };
        container.appendChild(btn);
    }

    const next = document.createElement("div");
    next.className = "pagination-page-btn";
    next.innerHTML = `<i class="fas fa-chevron-right"></i>`;
    next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderPage(currentPage); } };
    container.appendChild(next);
}

/* ==========================================
   CRUD TRIGGERS & FORM SAVING
   ========================================== */
function loadFormAccountDropdown() {
    const select = document.getElementById("txAccount");
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

function openAddTxModal() {
    document.getElementById("modalTitle").textContent = "Add Transaction";
    document.getElementById("addTransactionForm").reset();
    document.getElementById("editTxId").value = "";
    loadCategoryDropdown();
    openModal("addTxModal");
}

function editTransaction(id) {
    const transactions = window.DB.getTransactions();
    const t = transactions.find(item => item.id === id);
    if (!t) return;

    document.getElementById("modalTitle").textContent = "Edit Transaction";
    document.getElementById("editTxId").value = t.id;
    document.getElementById("txDescription").value = t.description;
    document.getElementById("txType").value = t.type;
    
    // Refresh category select first before selecting value
    loadCategoryDropdown();
    
    document.getElementById("txCategory").value = t.category;
    document.getElementById("txAmount").value = t.amount;
    document.getElementById("txDate").value = t.date;
    document.getElementById("txAccount").value = t.accountName || "";
    document.getElementById("txMethod").value = t.paymentMethod || "Credit Card";

    openModal("addTxModal");
}

function handleTransactionSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById("editTxId").value;
    const description = document.getElementById("txDescription").value.trim();
    const type = document.getElementById("txType").value;
    const category = document.getElementById("txCategory").value;
    const amount = Number(document.getElementById("txAmount").value);
    const date = document.getElementById("txDate").value;
    const accountName = document.getElementById("txAccount").value;
    const paymentMethod = document.getElementById("txMethod").value;

    let transactions = window.DB.getTransactions();

    if (editId) {
        // Edit existing
        const txIndex = transactions.findIndex(t => t.id === editId);
        if (txIndex !== -1) {
            transactions[txIndex].description = description;
            transactions[txIndex].type = type;
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
            type,
            category,
            amount,
            date,
            accountName,
            paymentMethod
        };
        transactions.push(newTx);
    }

    window.DB.saveTransactions(transactions);
    closeModal("addTxModal");
}

function deleteTransaction(id) {
    const confirmDelete = confirm(`Are you sure you want to delete this transaction record?`);
    if (!confirmDelete) return;

    let transactions = window.DB.getTransactions();
    const updated = transactions.filter(t => t.id !== id);
    window.DB.saveTransactions(updated);
}

/* ==========================================
   EXPORT CSV
   ========================================== */
function exportTransactionsCSV() {
    const transactions = window.DB.getTransactions();
    let csv = "Date,Description,Category,Type,Account,Amount,Method\n";

    transactions.forEach(t => {
        csv += `"${t.date}","${t.description}","${t.category}","${t.type}","${t.accountName}",${t.amount},"${t.paymentMethod}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial_ledger.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

window.openAddTxModal = openAddTxModal;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.filterAndRenderTransactions = filterAndRenderTransactions;
window.exportTransactionsCSV = exportTransactionsCSV;
window.loadCategoryDropdown = loadCategoryDropdown;