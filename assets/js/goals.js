/* ==========================================================================
   GOALS CONTROLLER (goals.js)
   ========================================================================== */

let activeFilterTab = "All";

document.addEventListener("DOMContentLoaded", () => {
    initializeGoals();

    window.addEventListener("financeDataChanged", () => {
        renderGoalsGrid();
        updateGoalsStats();
        renderGoalsActivity();
    });
});

function initializeGoals() {
    renderGoalsGrid();
    updateGoalsStats();
    renderGoalsActivity();

    // Register Form Submissions
    const form = document.getElementById("goalForm");
    if (form) {
        form.addEventListener("submit", handleGoalSubmit);
    }
}

/* ==========================================
   STATS, TALLIES & RADIAL SVG
   ========================================== */
function updateGoalsStats() {
    const goals = window.DB.getGoals();
    
    const totalGoalsCount = goals.length;
    const activeGoals = goals.filter(g => g.status === "Active");
    const completedGoals = goals.filter(g => g.status === "Completed");
    const pausedGoals = goals.filter(g => g.status === "Paused");

    const totalTarget = goals.reduce((sum, g) => sum + Number(g.target || 0), 0);
    const totalSaved = goals.reduce((sum, g) => sum + Number(g.saved || 0), 0);
    const overallPercentage = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0;

    // Card Stats
    document.getElementById("totalGoalsCount").textContent = activeGoals.length;
    document.getElementById("totalTargetVal").textContent = window.DB.formatCurrency(totalTarget);
    document.getElementById("totalSavedVal").textContent = window.DB.formatCurrency(totalSaved);
    document.getElementById("totalSavedPercentage").textContent = `${overallPercentage}% of total target`;
    document.getElementById("completedGoalsCount").textContent = completedGoals.length;
    
    const completedRatio = totalGoalsCount > 0 ? ((completedGoals.length / totalGoalsCount) * 100).toFixed(1) : 0;
    document.getElementById("completedPercentage").textContent = `${completedRatio}% of total goals`;

    // Goals By Status Tally
    const actRatio = totalGoalsCount > 0 ? ((activeGoals.length / totalGoalsCount) * 100).toFixed(1) : 0;
    const compRatio = totalGoalsCount > 0 ? ((completedGoals.length / totalGoalsCount) * 100).toFixed(1) : 0;
    const pauseRatio = totalGoalsCount > 0 ? ((pausedGoals.length / totalGoalsCount) * 100).toFixed(1) : 0;

    document.getElementById("statusActiveVal").textContent = `${activeGoals.length} (${actRatio}%)`;
    document.getElementById("statusCompletedVal").textContent = `${completedGoals.length} (${compRatio}%)`;
    document.getElementById("statusPausedVal").textContent = `${pausedGoals.length} (${pauseRatio}%)`;

    // Overall Radial Progress Ring SVG Dash offset
    // Radius = 76, Circumference = 2 * PI * r = 477.52 (approx 478)
    const strokeDash = 478;
    const offset = strokeDash - (strokeDash * (overallPercentage / 100));
    
    const fillCircle = document.getElementById("overallRadialFill");
    const radialText = document.getElementById("overallRadialPct");
    const radialDetails = document.getElementById("overallRadialDetails");

    if (fillCircle) fillCircle.style.strokeDashoffset = offset;
    if (radialText) radialText.textContent = overallPercentage + "%";
    if (radialDetails) radialDetails.textContent = `${window.DB.formatCurrency(totalSaved)} saved of ${window.DB.formatCurrency(totalTarget)} target`;
}

/* ==========================================
   GOALS GRID TABLE LIST
   ========================================== */
function renderGoalsGrid() {
    const tbody = document.getElementById("goalsTableBody");
    if (!tbody) return;

    const goals = window.DB.getGoals();
    const sortBy = document.getElementById("goalsSortSelect")?.value || "Progress";
    
    tbody.innerHTML = "";

    // Icons matching Goal categories
    const goalCategoryIcons = {
        "Real Estate": { icon: "fa-house-chimney", color: "var(--purple)" },
        "Travel": { icon: "fa-plane-departure", color: "var(--success)" },
        "Personal Development": { icon: "fa-graduation-cap", color: "var(--primary)" },
        "Vehicle": { icon: "fa-car-side", color: "var(--warning)" },
        "Financial Security": { icon: "fa-shield-halved", color: "var(--pink)" },
        "Electronics": { icon: "fa-laptop", color: "var(--cyan)" },
        "Others": { icon: "fa-bullseye", color: "var(--gray-neutral)" }
    };

    // Filter
    let filtered = [...goals];
    if (activeFilterTab !== "All") {
        filtered = filtered.filter(g => g.status === activeFilterTab);
    }

    // Sort
    filtered.sort((a, b) => {
        if (sortBy === "Name") {
            return a.name.localeCompare(b.name);
        } else if (sortBy === "Target") {
            return b.target - a.target;
        } else if (sortBy === "Deadline") {
            return new Date(a.deadline) - new Date(b.deadline);
        } else {
            // Sort by Progress percentage desc
            const progressA = a.target > 0 ? (a.saved / a.target) : 0;
            const progressB = b.target > 0 ? (b.saved / b.target) : 0;
            return progressB - progressA;
        }
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-light);">No goals found for "${activeFilterTab}"</td></tr>`;
        return;
    }

    filtered.forEach(g => {
        const catConfig = goalCategoryIcons[g.category] || { icon: "fa-bullseye", color: "var(--primary)" };
        const percentage = Math.min((g.saved / g.target) * 100, 100).toFixed(0);
        
        let statusBadge = "badge-primary";
        if (g.status === "Completed") statusBadge = "badge-success";
        else if (g.status === "Paused") statusBadge = "badge-warning";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="table-item-profile">
                    <div class="icon-circle" style="background: ${catConfig.color}15; color: ${catConfig.color}">
                        <i class="fas ${catConfig.icon}"></i>
                    </div>
                    <div>
                        <h5>${g.name}</h5>
                        <p>${g.category} • Target: ${formatDate(g.deadline)}</p>
                    </div>
                </div>
            </td>
            <td style="font-weight: 700; width: 140px;">
                ${window.DB.formatCurrency(g.target)}
            </td>
            <td>
                <span class="badge ${statusBadge}">${g.status}</span>
            </td>
            <td>
                <div class="progress-container" style="min-width: 160px; max-width: 240px;">
                    <div class="progress-bar-label">
                        <span style="font-size: 11px; font-weight: bold; color: ${catConfig.color}">${percentage}%</span>
                        <span style="font-size: 11px;">${window.DB.formatCurrency(g.saved)} saved</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${catConfig.color};"></div>
                    </div>
                </div>
            </td>
            <td style="text-align: right; width: 150px;">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editGoal('${g.id}')">
                        <i class="fas fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteGoal('${g.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/* ==========================================
   GOALS FEED ACTIVITY
   ========================================== */
function renderGoalsActivity() {
    const container = document.getElementById("goalsActivityFeed");
    if (!container) return;

    container.innerHTML = "";

    let activities = [];
    if (window.DB.getUserEmail() === "admin@example.com") {
        activities = [
            { title: "New Laptop", desc: "Goal completed", date: "Apr 10, 2024", amount: 1000, color: "var(--success)", icon: "fa-laptop" },
            { title: "Education Fund", desc: "Amount added", date: "May 15, 2024", amount: 300, color: "var(--primary)", icon: "fa-graduation-cap" },
            { title: "Buy a New House", desc: "Amount added", date: "May 10, 2024", amount: 500, color: "var(--purple)", icon: "fa-house-chimney" }
        ];
    } else {
        const goals = window.DB.getGoals();
        const goalCategoryIcons = {
            "Real Estate": { icon: "fa-house-chimney", color: "var(--purple)" },
            "Travel": { icon: "fa-plane-departure", color: "var(--success)" },
            "Personal Development": { icon: "fa-graduation-cap", color: "var(--primary)" },
            "Vehicle": { icon: "fa-car-side", color: "var(--warning)" },
            "Financial Security": { icon: "fa-shield-halved", color: "var(--pink)" },
            "Electronics": { icon: "fa-laptop", color: "var(--cyan)" },
            "Others": { icon: "fa-bullseye", color: "var(--gray-neutral)" }
        };

        goals.forEach(g => {
            const catConfig = goalCategoryIcons[g.category] || { icon: "fa-bullseye", color: "var(--primary)" };
            if (g.status === "Completed") {
                activities.push({
                    title: g.name,
                    desc: "Goal completed",
                    date: "Today",
                    amount: g.target,
                    color: "var(--success)",
                    icon: catConfig.icon
                });
            } else if (g.saved > 0) {
                activities.push({
                    title: g.name,
                    desc: "Amount added",
                    date: "Today",
                    amount: g.saved,
                    color: catConfig.color,
                    icon: catConfig.icon
                });
            }
        });
    }

    if (activities.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-light)">No goal activity found</div>`;
        return;
    }

    activities.forEach(act => {
        const div = document.createElement("div");
        div.className = "activity-feed-item";
        div.innerHTML = `
            <div class="activity-feed-left">
                <div class="activity-feed-icon" style="background: ${act.color}15; color: ${act.color}">
                    <i class="fas ${act.icon}"></i>
                </div>
                <div class="activity-feed-meta">
                    <h5>${act.title}</h5>
                    <p>${act.desc} • ${act.date}</p>
                </div>
            </div>
            <div class="activity-feed-amount positive">
                +${window.DB.formatCurrency(act.amount)}
            </div>
        `;
        container.appendChild(div);
    });
}

/* ==========================================
   CRUD TRIGGERS & FORM SAVING
   ========================================== */
function openAddGoalModal() {
    document.getElementById("goalModalTitle").textContent = "Create New Goal";
    document.getElementById("goalForm").reset();
    document.getElementById("editGoalId").value = "";
    openModal("goalModal");
}

function editGoal(id) {
    const goals = window.DB.getGoals();
    const g = goals.find(item => item.id === id);
    if (!g) return;

    document.getElementById("goalModalTitle").textContent = "Edit Goal";
    document.getElementById("editGoalId").value = g.id;
    document.getElementById("goalName").value = g.name;
    document.getElementById("goalCategory").value = g.category;
    document.getElementById("goalStatus").value = g.status;
    document.getElementById("goalTarget").value = g.target;
    document.getElementById("goalSaved").value = g.saved;
    document.getElementById("goalDeadline").value = g.deadline;

    openModal("goalModal");
}

function handleGoalSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById("editGoalId").value;
    const name = document.getElementById("goalName").value.trim();
    const category = document.getElementById("goalCategory").value;
    const status = document.getElementById("goalStatus").value;
    const target = Number(document.getElementById("goalTarget").value);
    const saved = Number(document.getElementById("goalSaved").value);
    const deadline = document.getElementById("goalDeadline").value;

    let goals = window.DB.getGoals();

    if (editId) {
        // Edit existing
        const goalIndex = goals.findIndex(item => item.id === editId);
        if (goalIndex !== -1) {
            goals[goalIndex].name = name;
            goals[goalIndex].category = category;
            goals[goalIndex].status = status;
            goals[goalIndex].target = target;
            goals[goalIndex].saved = saved;
            goals[goalIndex].deadline = deadline;
            
            // Auto complete if savings match target
            if (saved >= target) {
                goals[goalIndex].status = "Completed";
            }
        }
    } else {
        // Create new
        const newGoal = {
            id: "goal-" + Date.now(),
            name,
            category,
            status: saved >= target ? "Completed" : status,
            target,
            saved,
            deadline
        };
        goals.push(newGoal);
    }

    window.DB.saveGoals(goals);
    closeModal("goalModal");
}

function deleteGoal(id) {
    const goals = window.DB.getGoals();
    const g = goals.find(item => item.id === id);
    if (!g) return;

    const confirmDelete = confirm(`Are you sure you want to delete goal "${g.name}"?`);
    if (!confirmDelete) return;

    const updated = goals.filter(item => item.id !== id);
    window.DB.saveGoals(updated);
}

function filterGoals(statusTab) {
    activeFilterTab = statusTab;
    
    // Toggle active class inside button tabs
    const tabIds = { "All": "tab-all", "Active": "tab-active", "Completed": "tab-completed", "Paused": "tab-paused" };
    
    Object.keys(tabIds).forEach(key => {
        const btn = document.getElementById(tabIds[key]);
        if (btn) {
            if (key === statusTab) {
                btn.classList.add("active-tab", "btn-primary");
                btn.classList.remove("btn-secondary");
            } else {
                btn.classList.remove("active-tab", "btn-primary");
                btn.classList.add("btn-secondary");
            }
        }
    });

    renderGoalsGrid();
}

/* ==========================================
   EXPORT CSV
   ========================================== */
function exportGoalsCSV() {
    const goals = window.DB.getGoals();
    let csv = "Goal Name,Category,Target,Saved,Deadline,Status\n";

    goals.forEach(g => {
        csv += `"${g.name}","${g.category}",${g.target},${g.saved},"${g.deadline}","${g.status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial_goals.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

window.openAddGoalModal = openAddGoalModal;
window.editGoal = editGoal;
window.deleteGoal = deleteGoal;
window.filterGoals = filterGoals;
window.exportGoalsCSV = exportGoalsCSV;
window.renderGoalsGrid = renderGoalsGrid;