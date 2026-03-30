// ==========================================
// 1. INITIALISATION ET VARIABLES GLOBALES
// ==========================================
const STORAGE_KEY = 'clyd_transactions';
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let budgetChart = null;

// Éléments du DOM
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const fullListEl = document.getElementById('full-history-list');
const modal = document.getElementById('add-modal');
const form = document.getElementById('transaction-form');

// ==========================================
// 2. LOGIQUE D'AFFICHAGE (UI)
// ==========================================

function updateUI() {
    // Calculs
    const amounts = transactions.map(t => t.type === 'depense' ? -t.amount : t.amount);
    const total = amounts.reduce((acc, item) => acc + item, 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
    const expense = Math.abs(amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0));

    // Affichage des chiffres avec formatage
    if(balanceEl) balanceEl.innerText = `${formatNumber(total)} CFA`;
    if(incomeEl) incomeEl.innerText = `${formatNumber(income)} CFA`;
    if(expenseEl) expenseEl.innerText = `${formatNumber(expense)} CFA`;

    renderRecentList();
    updateChart();
}

// Liste courte pour l'accueil (5 dernières)
function renderRecentList() {
    if (!listEl) return;
    listEl.innerHTML = '';
    
    if (transactions.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#8A8D9F; padding: 20px;">Aucune transaction.</p>';
        return;
    }

    transactions.slice().reverse().slice(0, 5).forEach(t => {
        listEl.insertAdjacentHTML('beforeend', createTransactionHTML(t, false));
    });
}

// Liste complète pour la page historique (avec boutons actions)
function renderFullHistory() {
    if (!fullListEl) return;
    fullListEl.innerHTML = '';
    
    if (transactions.length === 0) {
        fullListEl.innerHTML = '<p style="text-align:center; padding:20px;">Historique vide.</p>';
        return;
    }

    transactions.slice().reverse().forEach(t => {
        fullListEl.insertAdjacentHTML('beforeend', createTransactionHTML(t, true));
    });
}

// Générateur de code HTML pour une ligne de transaction
function createTransactionHTML(t, isHistoryPage = false) {
    const isExpense = t.type === 'depense';
    const cssClass = isExpense ? 'expense' : 'income';
    const sign = isExpense ? '-' : '+';
    let icon = isExpense ? 'fa-wallet' : 'fa-money-bill-trend-up';
    
    if (t.category === 'Nourriture') icon = 'fa-burger';
    if (t.category === 'Transport') icon = 'fa-car';
    if (t.category === 'Loisirs') icon = 'fa-gamepad';

    // Ajout des boutons Modifier/Supprimer uniquement sur la page historique
    const actions = isHistoryPage ? `
        <div class="t-actions">
            <button onclick="editTransaction(${t.id})" class="btn-edit"><i class="fa-solid fa-pen"></i></button>
            <button onclick="deleteTransaction(${t.id})" class="btn-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
    ` : '';

    return `
        <div class="transaction-item">
            <div class="t-icon"><i class="fa-solid ${icon}"></i></div>
            <div class="t-info">
                <h4>${t.description}</h4>
                <p>${t.category} • ${t.date}</p>
            </div>
            <div class="t-amount-group" style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                <div class="t-amount ${cssClass}" style="font-weight:700;">${sign} ${formatNumber(t.amount)}</div>
                ${actions}
            </div>
        </div>`;
}

// ==========================================
// 3. NAVIGATION ET MODALE
// ==========================================

function showPage(pageId) {
    document.querySelectorAll('.app-page').forEach(p => p.style.display = 'none');
    const targetPage = document.getElementById(`page-${pageId}`);
    if(targetPage) targetPage.style.display = 'block';
    
    if (pageId === 'history') renderFullHistory();
    window.scrollTo(0, 0);
}

function closeModal() {
    modal.style.display = 'none';
    form.reset();
}

// Fermer la modale si on clique à côté
window.onclick = function(event) {
    if (event.target == modal) closeModal();
}

// ==========================================
// 4. GESTION DES DONNÉES (CRUD)
// ==========================================

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('t-amount').value);
    const transaction = {
        id: Date.now(),
        type: document.getElementById('t-type').value,
        amount: amount,
        category: document.getElementById('t-category').value,
        description: document.getElementById('t-desc').value,
        date: new Date().toLocaleDateString('fr-FR')
    };

    transactions.push(transaction);
    saveData();
    closeModal();
    updateUI();
});

function deleteTransaction(id) {
    if (confirm("Supprimer cette transaction ?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
        renderFullHistory();
    }
}

function editTransaction(id) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;

    // Remplir la modale
    document.getElementById('t-type').value = t.type;
    document.getElementById('t-amount').value = t.amount;
    document.getElementById('t-category').value = t.category;
    document.getElementById('t-desc').value = t.description;

    // Supprimer l'ancienne version (sera remplacée à la validation)
    transactions = transactions.filter(item => item.id !== id);
    modal.style.display = 'flex';
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function clearAllData() {
    if (confirm("Voulez-vous vraiment supprimer toutes les données ?")) {
        localStorage.removeItem(STORAGE_KEY);
        transactions = [];
        updateUI();
        showPage('home');
    }
}

// ==========================================
// 5. GRAPHIQUE ET UTILITAIRES
// ==========================================

function updateChart() {
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;

    const expenses = transactions.filter(t => t.type === 'depense');
    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (budgetChart) budgetChart.destroy();

    budgetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Aucune dépense'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: ['#FF7B5F', '#2F58E8', '#21C063', '#FFC107', '#8A8D9F'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
            }
        }
    });
}

function formatNumber(num) {
    return num.toLocaleString('fr-FR');
}

// ==========================================
// INITIALISATION
// ==========================================
updateUI();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Error:', err));
}