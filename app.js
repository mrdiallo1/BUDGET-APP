// --- CONFIGURATION DES UTILISATEURS (4 Personnes) ---
// Vous pouvez modifier les noms ici. L'ID doit être unique.
const USERS = [
    { id: 'u1', name: 'Mustaf', role: 'Admin' },
    { id: 'u2', name: 'Utilisateur 2', role: 'Gérant' },
    { id: 'u3', name: 'Utilisateur 3', role: 'Employé' },
    { id: 'u4', name: 'Utilisateur 4', role: 'Employé' }
];

// Récupérer l'utilisateur actuel du localStorage, ou défaut au premier
let currentUserId = localStorage.getItem('clyd_current_user') || USERS[0].id;

// --- GESTION DES DONNÉES (Structure prête pour Firebase) ---
const DB_KEYS = {
    products: 'clyd_products',
    debts: 'clyd_debts',
    assets: 'clyd_assets',
    transactions: 'clyd_transactions'
};

let data = {
    products: JSON.parse(localStorage.getItem(DB_KEYS.products)) || [],
    debts: JSON.parse(localStorage.getItem(DB_KEYS.debts)) || [],
    assets: JSON.parse(localStorage.getItem(DB_KEYS.assets)) || [],
    transactions: JSON.parse(localStorage.getItem(DB_KEYS.transactions)) || []
};

function saveData() {
    localStorage.setItem(DB_KEYS.products, JSON.stringify(data.products));
    localStorage.setItem(DB_KEYS.debts, JSON.stringify(data.debts));
    localStorage.setItem(DB_KEYS.assets, JSON.stringify(data.assets));
    localStorage.setItem(DB_KEYS.transactions, JSON.stringify(data.transactions));
    updateUI();
}

// --- GESTION DES UTILISATEURS ---
function updateUserInfo() {
    const user = USERS.find(u => u.id === currentUserId);
    document.getElementById('current-user-name').textContent = user.name;
}

function cycleUser() {
    // Trouve l'index actuel et passe au suivant (boucle)
    const currentIndex = USERS.findIndex(u => u.id === currentUserId);
    const nextIndex = (currentIndex + 1) % USERS.length;
    currentUserId = USERS[nextIndex].id;
    localStorage.setItem('clyd_current_user', currentUserId);
    updateUserInfo();
    updateUI(); // Rafraîchit l'interface
}

// --- NAVIGATION ---
function navigate(pageId, navElement) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    if (navElement) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        navElement.classList.add('active');
    }
}

// --- MISE À JOUR DE L'INTERFACE ---
function updateUI() {
    updateUserInfo();
    calculateTotals();
    renderProducts();
    renderDebts();
    renderAssets();
    renderRecentActivities();
}

function formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' CFA';
}

function calculateTotals() {
    const revenue = data.transactions.filter(t => t.type === 'revenu').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = data.transactions.filter(t => t.type === 'depense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const assetsValue = data.assets.reduce((sum, a) => sum + parseFloat(a.value), 0);
    const netWorth = (revenue - expense) + assetsValue;

    document.getElementById('net-worth').textContent = formatMoney(netWorth);
    document.getElementById('total-revenue').textContent = formatMoney(revenue);
    document.getElementById('total-expense').textContent = formatMoney(expense);
    document.getElementById('total-assets-value').textContent = formatMoney(assetsValue);
}

// --- RENDUS DES LISTES (Avec traçabilité "Qui a fait quoi") ---
function renderRecentActivities() {
    const container = document.getElementById('recent-activities');
    const recent = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    
    if (recent.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px; font-size:13px;">Aucune activité.</p>';
        return;
    }
    
    container.innerHTML = recent.map(t => {
        const actor = USERS.find(u => u.id === t.createdBy)?.name || 'Inconnu';
        return `
        <div class="list-item">
            <div class="item-left">
                <div class="item-icon" style="color:${t.type === 'revenu' ? 'var(--success)' : 'var(--danger)'}">
                    <i class="fa-solid ${t.type === 'revenu' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                </div>
                <div class="item-info">
                    <h4>${t.description}</h4>
                    <p>${new Date(t.date).toLocaleDateString()}</p>
                    <p class="actor"><i class="fa-solid fa-user-pen"></i> Par : ${actor}</p>
                </div>
            </div>
            <div class="item-right">
                <div class="amount" style="color:${t.type === 'revenu' ? 'var(--success)' : 'var(--danger)'}">
                    ${t.type === 'revenu' ? '+' : '-'} ${formatMoney(t.amount)}
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderProducts() {
    const container = document.getElementById('products-list');
    container.innerHTML = data.products.map(p => `
        <div class="list-item">
            <div class="item-left">
                <div class="item-icon"><i class="fa-solid fa-box"></i></div>
                <div class="item-info">
                    <h4>${p.name}</h4>
                    <p>Stock: ${p.stock} | Vente: ${formatMoney(p.sellPrice)}</p>
                </div>
            </div>
            <div class="item-right">
                <i class="fa-solid fa-trash" style="color:var(--danger); opacity:0.5; cursor:pointer;" onclick="deleteItem('products', '${p.id}')"></i>
            </div>
        </div>
    `).join('') || '<p style="text-align:center; color:var(--text-muted); padding:20px;">Aucun produit.</p>';
}

function renderDebts() {
    const container = document.getElementById('debts-list');
    container.innerHTML = data.debts.map(d => {
        const actor = USERS.find(u => u.id === d.createdBy)?.name || 'Inconnu';
        return `
        <div class="list-item">
            <div class="item-left">
                <div class="item-icon" style="color:${d.type === 'active' ? 'var(--success)' : 'var(--danger)'}">
                    <i class="fa-solid ${d.type === 'active' ? 'fa-hand-holding-dollar' : 'fa-file-invoice-dollar'}"></i>
                </div>
                <div class="item-info">
                    <h4>${d.person}</h4>
                    <p>${d.type === 'active' ? 'On nous doit' : 'Nous devons'} • ${formatMoney(d.amount)}</p>
                    <p class="actor"><i class="fa-solid fa-user-pen"></i> Enregistré par : ${actor}</p>
                </div>
            </div>
            <div class="item-right">
                ${d.status === 'pending' ? `<i class="fa-solid fa-check" style="color:var(--success); margin-right:10px; cursor:pointer;" onclick="markDebtPaid('${d.id}')"></i>` : '<span style="font-size:10px; color:var(--text-muted);">Réglée</span>'}
                <i class="fa-solid fa-trash" style="color:var(--danger); opacity:0.5; cursor:pointer;" onclick="deleteItem('debts', '${d.id}')"></i>
            </div>
        </div>`;
    }).join('') || '<p style="text-align:center; color:var(--text-muted); padding:20px;">Aucune dette.</p>';
}

function renderAssets() {
    const container = document.getElementById('assets-list');
    container.innerHTML = data.assets.map(a => `
        <div class="list-item">
            <div class="item-left">
                <div class="item-icon"><i class="fa-solid fa-building"></i></div>
                <div class="item-info">
                    <h4>${a.name}</h4>
                    <p>${a.category} • ${formatMoney(a.value)}</p>
                </div>
            </div>
            <div class="item-right">
                <i class="fa-solid fa-trash" style="color:var(--danger); opacity:0.5; cursor:pointer;" onclick="deleteItem('assets', '${a.id}')"></i>
            </div>
        </div>
    `).join('') || '<p style="text-align:center; color:var(--text-muted); padding:20px;">Aucun actif.</p>';
}

// --- FORMULAIRES DYNAMIQUES ---
function openModal() {
    document.getElementById('add-modal').classList.add('active');
    const form = document.getElementById('dynamic-form');
    form.innerHTML = `
        <div class="form-group">
            <label>Type d'ajout</label>
            <select id="add-type" onchange="updateFormFields()">
                <option value="transaction">Transaction (Revenu/Dépense)</option>
                <option value="product">Nouveau Produit</option>
                <option value="debt">Nouvelle Dette</option>
                <option value="asset">Nouvel Actif / Bien</option>
            </select>
        </div>
        <div id="dynamic-fields"></div>
        <button type="submit" class="btn-submit">Enregistrer</button>
    `;
    updateFormFields();
}

function closeModal() {
    document.getElementById('add-modal').classList.remove('active');
}

function updateFormFields() {
    const type = document.getElementById('add-type').value;
    const container = document.getElementById('dynamic-fields');
    let html = '';

    if (type === 'transaction') {
        html = `
            <div class="form-group"><label>Type</label><select name="t_type"><option value="revenu">Revenu</option><option value="depense">Dépense</option></select></div>
            <div class="form-group"><label>Montant (CFA)</label><input type="number" name="amount" required></div>
            <div class="form-group"><label>Description</label><input type="text" name="description" required placeholder="Ex: Vente marchandises"></div>
        `;
    } else if (type === 'product') {
        html = `
            <div class="form-group"><label>Nom du produit</label><input type="text" name="name" required></div>
            <div class="form-group"><label>Prix de vente (CFA)</label><input type="number" name="sellPrice" required></div>
            <div class="form-group"><label>Stock initial</label><input type="number" name="stock" required></div>
        `;
    } else if (type === 'debt') {
        html = `
            <div class="form-group"><label>Type de dette</label><select name="d_type"><option value="active">Active (On nous doit)</option><option value="passive">Passive (Nous devons)</option></select></div>
            <div class="form-group"><label>Personne / Entité</label><input type="text" name="person" required></div>
            <div class="form-group"><label>Montant (CFA)</label><input type="number" name="amount" required></div>
        `;
    } else if (type === 'asset') {
        html = `
            <div class="form-group"><label>Nom du bien</label><input type="text" name="name" required placeholder="Ex: Camion, Ordinateur"></div>
            <div class="form-group"><label>Catégorie</label><select name="category"><option>Véhicule</option><option>Équipement</option><option>Mobilier</option><option>Autre</option></select></div>
            <div class="form-group"><label>Valeur estimée (CFA)</label><input type="number" name="value" required></div>
        `;
    }
    container.innerHTML = html;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const type = document.getElementById('add-type').value;
    const id = Date.now().toString();
    
    // Récupération de l'utilisateur actuel pour la traçabilité
    const currentUser = USERS.find(u => u.id === currentUserId);

    if (type === 'transaction') {
        data.transactions.push({
            id, type: formData.get('t_type'), amount: formData.get('amount'),
            description: formData.get('description'), 
            createdBy: currentUserId, // TRAÇABILITÉ
            date: new Date().toISOString()
        });
    } else if (type === 'product') {
        data.products.push({
            id, name: formData.get('name'), sellPrice: formData.get('sellPrice'),
            stock: parseInt(formData.get('stock')),
            createdBy: currentUserId // TRAÇABILITÉ
        });
    } else if (type === 'debt') {
        data.debts.push({
            id, type: formData.get('d_type'), person: formData.get('person'),
            amount: formData.get('amount'), status: 'pending',
            createdBy: currentUserId, // TRAÇABILITÉ
            date: new Date().toISOString()
        });
    } else if (type === 'asset') {
        data.assets.push({
            id, name: formData.get('name'), category: formData.get('category'),
            value: formData.get('value'),
            createdBy: currentUserId // TRAÇABILITÉ
        });
    }

    saveData();
    closeModal();
}

function deleteItem(collection, id) {
    if (confirm('Supprimer cet élément ?')) {
        data[collection] = data[collection].filter(item => item.id !== id);
        saveData();
    }
}

function markDebtPaid(id) {
    const debt = data.debts.find(d => d.id === id);
    if (debt) {
        debt.status = 'paid';
        if (debt.type === 'active') {
            data.transactions.push({
                id: Date.now().toString(), type: 'revenu', amount: debt.amount,
                description: `Règlement dette par ${debt.person}`,
                createdBy: currentUserId,
                date: new Date().toISOString()
            });
        }
        saveData();
    }
}

// Initialisation
updateUI();
