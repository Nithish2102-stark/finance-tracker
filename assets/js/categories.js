/* ==========================================================================
   CATEGORIES CONTROLLER (categories.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeCategories();

    window.addEventListener("financeDataChanged", () => {
        renderCategories();
        updateCategoryStats();
    });
});

function initializeCategories() {
    renderCategories();
    updateCategoryStats();

    // Register Form Handler
    const form = document.getElementById("categoryForm");
    if (form) {
        form.addEventListener("submit", handleCategorySubmit);
    }
}

/* ==========================================
   STATS COUNTERS
   ========================================== */
function updateCategoryStats() {
    const categories = window.DB.getCategories();
    
    const total = categories.length;
    const income = categories.filter(c => c.type === "Income").length;
    const expense = categories.filter(c => c.type === "Expense").length;

    document.getElementById("totalCategoriesCount").textContent = total;
    document.getElementById("incomeCategoriesCount").textContent = income;
    document.getElementById("expenseCategoriesCount").textContent = expense;
}

/* ==========================================
   RENDER LIST
   ========================================== */
function renderCategories() {
    const tbody = document.getElementById("categoriesTableBody");
    if (!tbody) return;

    const categories = window.DB.getCategories();
    const typeFilter = document.getElementById("catTypeFilter")?.value || "All";
    const keyword = document.getElementById("catSearchInput")?.value.toLowerCase().trim() || "";

    tbody.innerHTML = "";

    const filtered = categories.filter(c => {
        const matchType = typeFilter === "All" || c.type === typeFilter;
        const matchKeyword = !keyword || c.name.toLowerCase().includes(keyword);
        return matchType && matchKeyword;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-light);">No categories found matching filters.</td></tr>`;
        return;
    }

    filtered.forEach(c => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="table-item-profile">
                    <div class="icon-circle" style="background: ${c.color}15; color: ${c.color}">
                        <i class="fas ${c.icon || 'fa-tags'}"></i>
                    </div>
                    <div>
                        <h5>${c.name}</h5>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge ${c.type === 'Income' ? 'badge-success' : 'badge-danger'}">${c.type}</span>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 16px; height: 16px; border-radius: 4px; background: ${c.color}; border: 1px solid var(--border-hover);"></span>
                    <span style="font-family: monospace; font-size: 13px;">${c.color}</span>
                </div>
            </td>
            <td>
                <span style="font-family: monospace; font-size: 13px; color: var(--text-light);">${c.icon}</span>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editCategory('${c.name}')">
                        <i class="fas fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteCategory('${c.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/* ==========================================
   CRUD TRIGGERS & FORM SAVING
   ========================================== */
function openAddCategoryModal() {
    document.getElementById("categoryModalTitle").textContent = "Add Category";
    document.getElementById("categoryForm").reset();
    document.getElementById("editCategoryName").value = "";
    document.getElementById("catColor").value = "#4f46e5";
    openModal("categoryModal");
}

function editCategory(name) {
    const categories = window.DB.getCategories();
    const c = categories.find(cat => cat.name === name);
    if (!c) return;

    document.getElementById("categoryModalTitle").textContent = "Edit Category";
    document.getElementById("editCategoryName").value = c.name;
    document.getElementById("catName").value = c.name;
    document.getElementById("catType").value = c.type;
    document.getElementById("catIcon").value = c.icon || "fa-tags";
    document.getElementById("catColor").value = c.color || "#4f46e5";

    openModal("categoryModal");
}

function handleCategorySubmit(event) {
    event.preventDefault();

    const editName = document.getElementById("editCategoryName").value;
    const name = document.getElementById("catName").value.trim();
    const type = document.getElementById("catType").value;
    const icon = document.getElementById("catIcon").value;
    const color = document.getElementById("catColor").value;

    let categories = window.DB.getCategories();

    if (editName) {
        // Edit existing
        const index = categories.findIndex(c => c.name === editName);
        if (index !== -1) {
            categories[index].name = name;
            categories[index].type = type;
            categories[index].icon = icon;
            categories[index].color = color;
        }
    } else {
        // Create new
        const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            alert(`A category named "${name}" already exists.`);
            return;
        }
        categories.push({
            name,
            type,
            icon,
            color
        });
    }

    window.DB.saveCategories(categories);
    closeModal("categoryModal");
}

function deleteCategory(name) {
    const categories = window.DB.getCategories();
    const c = categories.find(cat => cat.name === name);
    if (!c) return;

    const confirmDelete = confirm(`Are you sure you want to delete category "${c.name}"?`);
    if (!confirmDelete) return;

    const updated = categories.filter(cat => cat.name !== name);
    window.DB.saveCategories(updated);
}

window.openAddCategoryModal = openAddCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.renderCategories = renderCategories;
