document.addEventListener('DOMContentLoaded', () => {
    const pageContainer = document.getElementById('page-container');
    const pageTitle = document.getElementById('page-title');
    const navLinks = document.querySelectorAll('.nav-links a');
    const modalContainer = document.getElementById('modal-container');

    // Routing
    function navigate(page) {
        if (!app.currentUser) return;
        const role = app.currentUser.role;
        if (role === 'user' && !['dashboard', 'sales', 'settings'].includes(page)) {
            page = 'dashboard';
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) link.classList.add('active');
        });
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');

        const titles = {
            'dashboard': 'Dashboard',
            'inventory': 'Inventory Management',
            'products': 'Dessert Products',
            'sales': 'Sales & POS',
            'reports': 'Reports & Analytics',
            'settings': 'System Settings'
        };
        pageTitle.textContent = titles[page] || 'Dashboard';

        pageContainer.innerHTML = ''; // clear

        switch(page) {
            case 'dashboard': renderDashboard(); break;
            case 'inventory': renderInventory(); break;
            case 'products': renderProducts(); break;
            case 'sales': renderSales(); break;
            case 'reports': renderReports(); break;
            case 'settings': renderSettings(); break;
            default: renderDashboard();
        }
    }

    // Attach click events
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(e.target.dataset.page);
        });
    });

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // Helper: format currency
    const formatMoney = (amount) => {
        const currency = window.store.getSettings().currency;
        if (currency === 'IDR') {
            return `Rp ${amount.toLocaleString('id-ID')}`;
        }
        return `$${amount.toFixed(2)}`;
    };
    
    // --- Renderers ---
    
    function renderDashboard() {
        const ingredients = window.store.getIngredients();
        const sales = window.store.getSales();
        
        // Calculate today's revenue
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.date.startsWith(todayStr));
        const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

        // Low stock calculation
        const lowStock = ingredients.filter(i => i.quantity <= i.minQuantity && i.quantity > 0);
        const outOfStock = ingredients.filter(i => i.quantity === 0);

        const html = `
            <div class="dashboard-grid">
                <div class="card stat-card">
                    <span class="stat-title">Today's Revenue</span>
                    <span class="stat-value text-success">${formatMoney(todayRevenue)}</span>
                    <span class="stat-icon">💰</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-title">Low Stock Items</span>
                    <span class="stat-value text-warning">${lowStock.length}</span>
                    <span class="stat-icon">⚠️</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-title">Out of Stock</span>
                    <span class="stat-value text-danger">${outOfStock.length}</span>
                    <span class="stat-icon">🛑</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-title">Total Products</span>
                    <span class="stat-value">${window.store.getProducts().length}</span>
                    <span class="stat-icon">🍰</span>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <h3 class="mb-4">Action Needed (Inventory)</h3>
                    ${outOfStock.length === 0 && lowStock.length === 0 ? '<p class="text-muted">All stock levels look good!</p>' : ''}
                    <div class="table-container">
                        <table>
                            <tbody>
                                ${outOfStock.map(i => `
                                    <tr>
                                        <td><strong>${i.name}</strong> ${i.isCritical ? '<span class="badge badge-info" style="margin-left: 5px;">CRITICAL</span>' : ''}</td>
                                        <td style="text-align:right"><span class="badge badge-danger">OUT OF STOCK</span></td>
                                    </tr>
                                `).join('')}
                                ${lowStock.map(i => `
                                    <tr>
                                        <td><strong>${i.name}</strong></td>
                                        <td style="text-align:right">
                                            <span style="font-size: 0.9rem; color: var(--text-muted); margin-right: 0.5rem;">${parseFloat(i.quantity.toFixed(2))} ${i.unit} left</span>
                                            <span class="badge badge-warning">LOW</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <h3 class="mb-4">Recent Sales</h3>
                    ${sales.length === 0 ? '<p class="text-muted">No recent sales.</p>' : ''}
                    <div class="table-container">
                        <table>
                            ${sales.slice().reverse().slice(0, 5).map(s => {
                                const p = window.store.getProducts().find(x => x.id === s.productId);
                                return `<tr>
                                    <td>${p ? p.name : 'Unknown'}</td>
                                    <td>x${s.quantity}</td>
                                    <td style="text-align:right">${formatMoney(s.total)}</td>
                                </tr>`;
                            }).join('')}
                        </table>
                    </div>
                </div>
            </div>
        `;
        pageContainer.innerHTML = html;
    }

    function renderInventory() {
        const ingredients = window.store.getIngredients();
        
        let rows = ingredients.map(i => {
            let statusBadge = '<span class="badge badge-success">OK</span>';
            if (i.quantity === 0) statusBadge = '<span class="badge badge-danger">OUT OF STOCK</span>';
            else if (i.quantity <= i.minQuantity) statusBadge = '<span class="badge badge-warning">LOW</span>';

            let criticalBadge = i.isCritical ? '<span class="badge badge-info" style="margin-left:5px">CRITICAL</span>' : '';
            
            let stockDisplay = `<strong>${parseFloat(i.quantity.toFixed(2))}</strong> ${i.unit}`;
            let adjustBtn = `<button class="btn btn-outline btn-sm" style="margin-right: 5px;" onclick="app.showAdjustStock(${i.id})">Adjust</button>`;
            
            if (i.isSubRecipe) {
                stockDisplay += `<br><span style="font-size: 0.8rem; color: var(--text-muted);">(Auto-synced)</span>`;
                adjustBtn = ''; // Sub-recipes cannot be manually adjusted
                if (i.quantity === 0) {
                    statusBadge = '<span class="badge badge-danger">INSUFFICIENT INGREDIENTS</span>';
                } else {
                    statusBadge = '<span class="badge badge-info">AUTO-SYNCED</span>';
                }
            }

            return `
            <tr>
                <td>${i.name} ${criticalBadge}</td>
                <td>${stockDisplay}</td>
                <td class="text-muted">Min: ${i.minQuantity}</td>
                <td>${statusBadge}</td>
                <td style="text-align:right">
                    ${adjustBtn}
                    <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="app.deleteIngredient(${i.id})">Delete</button>
                </td>
            </tr>`;
        }).join('');

        const html = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Manage raw ingredients and check stock levels.</p>
                <button class="btn btn-primary" onclick="app.showAddIngredient()">+ New Ingredient</button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ingredient</th>
                            <th>Current Stock</th>
                            <th>Threshold</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        pageContainer.innerHTML = html;
    }

    function renderProducts() {
        const products = window.store.getProducts();
        
        let rows = products.map(p => {
            let possible = 0;
            if (p.recipe && p.recipe.length > 0) {
                possible = window.store.calculatePossibleYield(p.recipe);
            }
            let stockDisplay = possible > 0 ? `<span class="badge badge-success">${possible} buildable</span>` : `<span class="badge badge-danger">0 buildable</span>`;
            if (!p.recipe || p.recipe.length === 0) stockDisplay = `<span class="text-muted">No recipe</span>`;
            
            return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${formatMoney(p.price)}</td>
                <td>${stockDisplay}</td>
                <td>${p.recipe.length} ingredients</td>
                <td style="text-align:right">
                    <button class="btn btn-outline btn-sm" style="margin-right: 5px;" onclick="app.showProductForm(${p.id})">Edit</button>
                    <button class="btn btn-outline btn-sm" style="margin-right: 5px;" onclick="app.showRecipe(${p.id})">View</button>
                    <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="app.deleteProduct(${p.id})">Delete</button>
                </td>
            </tr>`;
        }).join('');

        const html = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Manage desserts and their Bill of Materials (Recipes).</p>
                <button class="btn btn-primary" onclick="app.showProductForm()">+ New Product</button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Price</th>
                            <th>Stock (Buildable)</th>
                            <th>Recipe Complexity</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        pageContainer.innerHTML = html;
    }

    function renderSales() {
        const products = window.store.getProducts();
        
        const html = `
            <div class="grid-2">
                <div class="card" id="pos-card">
                    <h3 class="mb-4">New Sale (POS Lite)</h3>
                    <p class="text-muted mb-4">Tap a product to add it to the cart.</p>
                    <div class="pos-products mb-4">
                        ${products.map(p => `
                            <div class="pos-product-card" onclick="app.addToCart(${p.id})">
                                <div class="pos-product-name">${p.name}</div>
                                <div class="pos-product-price">${formatMoney(p.price)}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div id="pos-cart-section" style="display: none; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.1);">
                        <h4 class="mb-3">Current Cart</h4>
                        <ul id="pos-cart-list" style="list-style: none; padding: 0; margin-bottom: 1rem;"></ul>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem; margin-bottom: 1rem;">
                            <span>Total:</span>
                            <span id="pos-cart-total">$0.00</span>
                        </div>
                        <button class="btn btn-primary" style="width:100%; justify-content:center; padding: 1rem; font-size: 1.1rem;" onclick="app.submitCartSale()">Complete Sale</button>
                    </div>
                </div>
                <div class="card">
                    <h3 class="mb-4">Today's Sales</h3>
                    <div class="table-container" id="today-sales-list">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>
        `;
        pageContainer.innerHTML = html;
        updateTodaySalesList();
    }
    
    function updateTodaySalesList() {
        const list = document.getElementById('today-sales-list');
        if (!list) return;
        const sales = window.store.getSales();
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.date.startsWith(todayStr)).reverse();
        
        if (todaySales.length === 0) {
            list.innerHTML = '<div style="padding: 1.5rem">No sales today yet.</div>';
            return;
        }
        
        let rows = todaySales.map(s => {
            const p = window.store.getProducts().find(x => x.id === s.productId);
            return `<tr>
                <td>${p ? p.name : 'Unknown'}</td>
                <td>x${s.quantity}</td>
                <td style="text-align:right"><strong>${formatMoney(s.total)}</strong></td>
            </tr>`;
        }).join('');
        list.innerHTML = `<table>${rows}</table>`;
    }

    function renderReports() {
        const html = `
            <div class="card">
                <h3 class="mb-4">Data Management</h3>
                <p class="text-muted mb-4">Export your data to keep a backup, or import a previous backup.</p>
                <div class="flex gap-4">
                    <button class="btn btn-primary" onclick="window.store.exportData()">Export Backup (JSON)</button>
                    <label class="btn btn-secondary" style="cursor:pointer">
                        Import Backup
                        <input type="file" class="hidden" id="import-file" accept=".json" onchange="app.handleImport(event)">
                    </label>
                </div>
            </div>
        `;
        pageContainer.innerHTML = html;
    }
    
    function renderSettings() {
        const settings = window.store.getSettings();
        const isAdmin = app.currentUser && app.currentUser.role === 'admin';
        const users = window.store.getUsers();

        let usersHtml = '';
        if (isAdmin) {
            usersHtml = `
                <div class="card mt-4">
                    <h3 class="mb-4">User Management (Admin Only)</h3>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Username</th><th>Role</th><th></th></tr></thead>
                            <tbody>
                                ${users.map(u => `
                                <tr>
                                    <td>${u.username}</td>
                                    <td>${u.role}</td>
                                    <td style="text-align:right">
                                        ${u.id !== 1 ? `<button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="app.deleteUser(${u.id})">Delete</button>` : ''}
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="mt-4 flex gap-4">
                        <input type="text" id="new-username" class="form-control" placeholder="New Username">
                        <input type="password" id="new-password" class="form-control" placeholder="New Password">
                        <select id="new-role" class="form-control" style="width: auto;">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button class="btn btn-primary" onclick="app.createUser()">Add User</button>
                    </div>
                </div>
            `;
        }

        pageContainer.innerHTML = `
            <div class="card">
                <h3 class="mb-4">General Settings</h3>
                <div class="form-group" style="max-width: 300px;">
                    <label>Currency</label>
                    <select id="setting-currency" class="form-control" onchange="app.saveCurrency(this.value)" ${isAdmin ? '' : 'disabled'}>
                        <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                        <option value="IDR" ${settings.currency === 'IDR' ? 'selected' : ''}>IDR (Rp)</option>
                    </select>
                </div>
                
                <h4 class="mt-4 mb-4" style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 1.5rem;">Account Settings</h4>
                <div class="form-group" style="max-width: 300px;">
                    <label>Change Password</label>
                    <input type="password" id="change-password-input" class="form-control" placeholder="New Password">
                    <button class="btn btn-secondary mt-4" onclick="app.changePassword()">Update Password</button>
                </div>
            </div>
            ${usersHtml}
        `;
    }

    // --- Modal System ---
    
    function showModal(title, content) {
        modalContainer.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">${title}</div>
                    <button class="modal-close" onclick="app.closeModal()">&times;</button>
                </div>
                ${content}
            </div>
        `;
        modalContainer.classList.remove('hidden');
    }
    
    function closeModal() {
        modalContainer.classList.add('hidden');
    }

    // --- Global App Actions ---
    
    window.app = {
        currentUser: null,

        login: function() {
            const userInp = document.getElementById('login-username').value.trim();
            const passInp = document.getElementById('login-password').value.trim();
            const errEl = document.getElementById('login-error');
            
            const users = window.store.getUsers();
            const user = users.find(u => u.username === userInp && u.password === btoa(passInp));
            
            if (user) {
                errEl.style.display = 'none';
                localStorage.setItem('currentUser', JSON.stringify({ id: user.id, username: user.username, role: user.role }));
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';
                initApp();
            } else {
                errEl.style.display = 'block';
            }
        },

        logout: function() {
            localStorage.removeItem('currentUser');
            app.currentUser = null;
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('app').classList.add('hidden');
        },

        saveCurrency: function(val) {
            window.store.updateSettings({ currency: val });
            navigate('settings'); // re-render
        },

        changePassword: function() {
            const newPass = document.getElementById('change-password-input').value.trim();
            if (!newPass) return alert("Enter a new password");
            if (app.currentUser) {
                window.store.updateUser(app.currentUser.id, { password: newPass });
                alert("Password updated!");
                document.getElementById('change-password-input').value = '';
            }
        },

        createUser: function() {
            const u = document.getElementById('new-username').value.trim();
            const p = document.getElementById('new-password').value.trim();
            const r = document.getElementById('new-role').value;
            if (!u || !p) return alert("Fill all fields");
            
            const users = window.store.getUsers();
            if (users.find(x => x.username === u)) return alert("Username exists");
            
            window.store.addUser({ username: u, password: p, role: r });
            navigate('settings');
        },

        deleteUser: function(id) {
            if (confirm("Are you sure you want to delete this user?")) {
                if(window.store.deleteUser(id)) {
                    navigate('settings');
                } else {
                    alert("Cannot delete main admin");
                }
            }
        },

        showAddIngredient: function() {
            const content = `
                <div class="modal-body">
                    <p class="mb-4">Enter details for the new ingredient.</p>
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="new-ing-name" class="form-control" placeholder="e.g. Vanilla Extract">
                    </div>
                    <div class="form-group">
                        <label>Unit</label>
                        <select id="new-ing-unit" class="form-control">
                            <option value="kg">kg (Kilograms)</option>
                            <option value="g">g (Grams)</option>
                            <option value="L">L (Liters)</option>
                            <option value="ml">ml (Milliliters)</option>
                            <option value="pcs">pcs (Pieces)</option>
                            <option value="box">box (Boxes)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Initial Quantity</label>
                        <input type="number" id="new-ing-qty" class="form-control" value="" placeholder="0" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Minimum Threshold (Alert Level)</label>
                        <input type="number" id="new-ing-min" class="form-control" value="" placeholder="5" min="0" step="0.01">
                    </div>
                    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="new-ing-critical">
                        <label style="margin-bottom: 0;">Is this a critical ingredient?</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="app.submitNewIngredient()">Save Ingredient</button>
                </div>
            `;
            showModal('Add New Ingredient', content);
        },
        
        submitNewIngredient: function() {
            const name = document.getElementById('new-ing-name').value.trim();
            const unit = document.getElementById('new-ing-unit').value.trim();
            const qty = parseFloat(document.getElementById('new-ing-qty').value || "0");
            const minQty = parseFloat(document.getElementById('new-ing-min').value || "5");
            const isCritical = document.getElementById('new-ing-critical').checked;
            
            if (!name || !unit || isNaN(qty) || isNaN(minQty) || qty < 0 || minQty < 0) {
                alert("Please fill out all fields correctly.");
                return;
            }
            
            window.store.addIngredient({
                name: name,
                unit: unit,
                quantity: qty,
                minQuantity: minQty,
                isCritical: isCritical
            });
            
            closeModal();
            navigate('inventory'); // refresh view
        },
        
        showAdjustStock: function(id) {
            const ing = window.store.getIngredients().find(i => i.id === id);
            if (!ing) return;
            
            const content = `
                <div class="modal-body">
                    <p class="mb-4">Adjusting stock for <strong>${ing.name}</strong>. Current: ${parseFloat(ing.quantity.toFixed(2))} ${ing.unit}</p>
                    <div class="form-group">
                        <label>Adjustment Type</label>
                        <select id="adj-type" class="form-control">
                            <option value="add">Add Stock (Restock)</option>
                            <option value="reduce">Reduce Stock (Waste/Usage)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Amount (${ing.unit})</label>
                        <input type="number" id="adj-amount" class="form-control" value="" placeholder="0" min="0.01" step="0.01">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="app.submitAdjustment(${id})">Save Adjustment</button>
                </div>
            `;
            showModal('Adjust Stock', content);
        },
        
        submitAdjustment: function(id) {
            const type = document.getElementById('adj-type').value;
            const amount = parseFloat(document.getElementById('adj-amount').value);
            
            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }
            
            window.store.adjustStock(id, type, amount);
            closeModal();
            navigate('inventory'); // refresh view
        },
        
        showProductForm: function(id = null) {
            let product = null;
            if (id) {
                product = window.store.getProducts().find(p => p.id === id);
            }
            
            window.app.tempRecipe = product ? JSON.parse(JSON.stringify(product.recipe)) : [];
            const ingredients = window.store.getIngredients();
            const ingOptions = ingredients
                .filter(i => !product || i.id !== product.linkedIngredientId)
                .map(i => `<option value="${i.id}" data-unit="${i.unit}">${i.name} (${i.unit})</option>`)
                .join('');
            
            const content = `
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <p class="mb-4">${id ? 'Edit product details and Recipe.' : 'Enter new product details and build its Recipe (Bill of Materials).'}</p>
                    <input type="hidden" id="edit-prod-id" value="${id || ''}">
                    <div class="form-group">
                        <label>Product Name</label>
                        <input type="text" id="new-prod-name" class="form-control" placeholder="e.g. Strawberry Shortcake" value="${product ? product.name : ''}">
                    </div>
                    <div class="form-group">
                        <label>Price</label>
                        <input type="number" id="new-prod-price" class="form-control" value="${product ? product.price : ''}" placeholder="0" min="0" step="0.01">
                    </div>
                    
                    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                        <input type="checkbox" id="new-prod-as-ingredient" ${product && product.linkedIngredientId ? 'checked' : ''}>
                        <label style="margin-bottom: 0;">Make this product available as an ingredient (Sub-recipe)</label>
                    </div>
                    
                    <h4 class="mt-4 mb-4" style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 1.5rem;">Recipe (Bill of Materials)</h4>
                    
                    <div class="form-group" style="display: flex; gap: 0.5rem; align-items: flex-end;">
                        <div style="flex: 2;">
                            <label>Ingredient</label>
                            <select id="recipe-ing-select" class="form-control" onchange="app.updateRecipeUnitOptions()">
                                ${ingOptions}
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label>Amount</label>
                            <input type="number" id="recipe-ing-amount" class="form-control" value="" placeholder="1" min="0.01" step="0.01">
                        </div>
                        <div style="flex: 1;">
                            <label>Unit</label>
                            <select id="recipe-ing-unit" class="form-control">
                            </select>
                        </div>
                        <button class="btn btn-secondary" onclick="app.addTempRecipeItem()" style="padding: 0.75rem;">Add</button>
                    </div>
                    
                    <ul id="temp-recipe-list" style="list-style: none; padding: 0; margin-top: 1rem; background: rgba(0,0,0,0.02); border-radius: 8px;">
                    </ul>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="app.submitNewProduct()">${id ? 'Update Product' : 'Save Product'}</button>
                </div>
            `;
            showModal(id ? 'Edit Product' : 'Add New Product', content);
            window.app.renderTempRecipeList(); // Render immediately for edit mode
            window.app.updateRecipeUnitOptions(); // Initialize unit options
        },
        
        updateRecipeUnitOptions: function() {
            const select = document.getElementById('recipe-ing-select');
            const unitSelect = document.getElementById('recipe-ing-unit');
            if (!select || !unitSelect) return;
            const selectedOption = select.options[select.selectedIndex];
            if (!selectedOption) return;
            
            const baseUnit = selectedOption.getAttribute('data-unit');
            let optionsHtml = `<option value="${baseUnit}">${baseUnit}</option>`;
            
            if (baseUnit === 'kg') {
                optionsHtml += `<option value="g">g</option>`;
            } else if (baseUnit === 'g') {
                optionsHtml += `<option value="kg">kg</option>`;
            } else if (baseUnit === 'L') {
                optionsHtml += `<option value="ml">ml</option>`;
            } else if (baseUnit === 'ml') {
                optionsHtml += `<option value="L">L</option>`;
            }
            
            unitSelect.innerHTML = optionsHtml;
        },

        addTempRecipeItem: function() {
            const select = document.getElementById('recipe-ing-select');
            const ingId = parseInt(select.value);
            let amount = parseFloat(document.getElementById('recipe-ing-amount').value || "1");
            const unitSelect = document.getElementById('recipe-ing-unit');
            const selectedUnit = unitSelect ? unitSelect.value : null;
            
            if (isNaN(ingId) || isNaN(amount) || amount <= 0) return;
            
            const selectedOption = select.options[select.selectedIndex];
            const baseUnit = selectedOption ? selectedOption.getAttribute('data-unit') : null;
            
            // Convert to base unit if necessary
            if (selectedUnit && baseUnit && selectedUnit !== baseUnit) {
                if (baseUnit === 'kg' && selectedUnit === 'g') {
                    amount = amount / 1000;
                } else if (baseUnit === 'g' && selectedUnit === 'kg') {
                    amount = amount * 1000;
                } else if (baseUnit === 'L' && selectedUnit === 'ml') {
                    amount = amount / 1000;
                } else if (baseUnit === 'ml' && selectedUnit === 'L') {
                    amount = amount * 1000;
                }
            }
            
            const existing = window.app.tempRecipe.find(r => r.ingredientId === ingId);
            if (existing) {
                existing.amount += amount;
            } else {
                window.app.tempRecipe.push({ ingredientId: ingId, amount: amount });
            }
            
            window.app.renderTempRecipeList();
        },
        
        removeTempRecipeItem: function(ingId) {
            window.app.tempRecipe = window.app.tempRecipe.filter(r => r.ingredientId !== ingId);
            window.app.renderTempRecipeList();
        },
        
        renderTempRecipeList: function() {
            const list = document.getElementById('temp-recipe-list');
            if (!list) return; // Modal might be closed
            if (!window.app.tempRecipe || window.app.tempRecipe.length === 0) {
                list.innerHTML = '<li style="padding: 1rem; color: var(--text-muted); text-align: center;">No ingredients added yet.</li>';
                return;
            }
            
            const ingredients = window.store.getIngredients();
            
            list.innerHTML = window.app.tempRecipe.map(item => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                return `
                <li style="padding: 0.75rem 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${parseFloat(item.amount.toFixed(3))} ${ing ? ing.unit : '?'}</strong> of ${ing ? ing.name : 'Unknown'}</span>
                    <button style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.25rem;" onclick="app.removeTempRecipeItem(${item.ingredientId})">&times;</button>
                </li>`;
            }).join('');
        },
        
        submitNewProduct: function() {
            const idVal = document.getElementById('edit-prod-id').value;
            const name = document.getElementById('new-prod-name').value.trim();
            const price = parseFloat(document.getElementById('new-prod-price').value);
            const asIngredient = document.getElementById('new-prod-as-ingredient').checked;
            
            if (!name || isNaN(price) || price < 0) {
                alert("Please fill out all product details correctly.");
                return;
            }
            
            if (!window.app.tempRecipe || window.app.tempRecipe.length === 0) {
                if(!confirm("Are you sure you want to save a product with NO ingredients in its recipe?")) {
                    return;
                }
            }
            
            if (idVal) {
                // Update existing
                const existingProd = window.store.getProducts().find(p => p.id === parseInt(idVal));
                let linkedIngredientId = existingProd.linkedIngredientId;
                
                if (asIngredient && !linkedIngredientId) {
                    const ing = window.store.addIngredient({
                        name: name,
                        unit: 'pcs',
                        quantity: 0,
                        minQuantity: 0,
                        isCritical: false
                    });
                    linkedIngredientId = ing.id;
                } else if (!asIngredient && linkedIngredientId) {
                    window.store.deleteIngredient(linkedIngredientId);
                    linkedIngredientId = null;
                } else if (asIngredient && linkedIngredientId) {
                    window.store.updateIngredient(linkedIngredientId, { name: name });
                }
                
                window.store.updateProduct(parseInt(idVal), {
                    name: name,
                    price: price,
                    recipe: window.app.tempRecipe || [],
                    linkedIngredientId: linkedIngredientId
                });
            } else {
                // Add new
                let linkedIngredientId = null;
                if (asIngredient) {
                    const ing = window.store.addIngredient({
                        name: name,
                        unit: 'pcs',
                        quantity: 0,
                        minQuantity: 0,
                        isCritical: false
                    });
                    linkedIngredientId = ing.id;
                }
                
                window.store.addProduct({
                    name: name,
                    price: price,
                    recipe: window.app.tempRecipe || [],
                    linkedIngredientId: linkedIngredientId
                });
            }
            
            closeModal();
            navigate('products');
        },
        
        showRecipe: function(id) {
            const product = window.store.getProducts().find(p => p.id === id);
            if (!product) return;
            
            const ingredients = window.store.getIngredients();
            let recipeHtml = '<p class="text-muted">No recipe defined yet.</p>';
            
            if (product.recipe && product.recipe.length > 0) {
                recipeHtml = product.recipe.map(item => {
                    const ing = ingredients.find(i => i.id === item.ingredientId);
                    return `<li style="padding: 0.5rem 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                        <strong>${item.amount} ${ing ? ing.unit : '?'}</strong> of ${ing ? ing.name : 'Unknown Ingredient'}
                    </li>`;
                }).join('');
                recipeHtml = `<ul style="list-style: none; margin-top: 1rem;">${recipeHtml}</ul>`;
            }
            
            const content = `
                <div class="modal-body">
                    <h4 style="margin-bottom: 0.5rem;">Bill of Materials</h4>
                    ${recipeHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="app.closeModal()">Close</button>
                </div>
            `;
            showModal(`Recipe: ${product.name}`, content);
        },
        
        deleteIngredient: function(id) {
            if(confirm("Are you sure you want to delete this ingredient? This may affect products that use it in their recipe.")) {
                window.store.deleteIngredient(id);
                navigate('inventory');
            }
        },
        
        deleteProduct: function(id) {
            if(confirm("Are you sure you want to delete this product?")) {
                window.store.deleteProduct(id);
                navigate('products');
            }
        },

        addToCart: function(id) {
            if (!window.app.cart) window.app.cart = {};
            if (window.app.cart[id]) {
                window.app.cart[id]++;
            } else {
                window.app.cart[id] = 1;
            }
            window.app.renderCart();
            if (window.innerWidth <= 768) {
                document.getElementById('pos-cart-section').scrollIntoView({behavior: 'smooth', block: 'end'});
            }
        },
        
        changeCartQty: function(id, delta) {
            if (!window.app.cart[id]) return;
            window.app.cart[id] += delta;
            if (window.app.cart[id] <= 0) {
                delete window.app.cart[id];
            }
            window.app.renderCart();
        },
        
        renderCart: function() {
            const section = document.getElementById('pos-cart-section');
            const list = document.getElementById('pos-cart-list');
            const totalEl = document.getElementById('pos-cart-total');
            
            if (!window.app.cart || Object.keys(window.app.cart).length === 0) {
                section.style.display = 'none';
                return;
            }
            
            section.style.display = 'block';
            const products = window.store.getProducts();
            let total = 0;
            
            list.innerHTML = Object.keys(window.app.cart).map(idStr => {
                const id = parseInt(idStr);
                const qty = window.app.cart[id];
                const product = products.find(p => p.id === id);
                if (!product) return '';
                
                total += product.price * qty;
                
                return `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${product.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">${formatMoney(product.price)}</div>
                    </div>
                    <div class="qty-control" style="margin: 0; padding: 0;">
                        <button class="qty-btn" style="width: 30px; height: 30px; padding: 0;" onclick="app.changeCartQty(${id}, -1)">-</button>
                        <span class="qty-display" style="width: 30px; font-size: 1rem;">${qty}</span>
                        <button class="qty-btn" style="width: 30px; height: 30px; padding: 0;" onclick="app.changeCartQty(${id}, 1)">+</button>
                    </div>
                    <div style="width: 80px; text-align: right; font-weight: bold;">
                        ${formatMoney(product.price * qty)}
                    </div>
                </li>
                `;
            }).join('');
            
            totalEl.textContent = formatMoney(total);
        },
        
        submitCartSale: function() {
            if (!window.app.cart || Object.keys(window.app.cart).length === 0) return;
            
            let successCount = 0;
            for (const [idStr, qty] of Object.entries(window.app.cart)) {
                const id = parseInt(idStr);
                if (window.store.addSale(id, qty)) {
                    successCount++;
                } else {
                    const prod = window.store.getProducts().find(p => p.id === id);
                    alert("Failed to process sale for " + (prod ? prod.name : "a product") + ". Please check inventory stock.");
                }
            }
            
            if (successCount > 0) {
                alert("Sale Complete!");
                window.app.cart = {}; // Clear cart
                navigate('sales'); // refresh view
            }
        },
        
        handleImport: function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const contents = e.target.result;
                if(window.store.importData(contents)) {
                    alert("Import successful!");
                    navigate('dashboard');
                } else {
                    alert("Import failed. Invalid file format.");
                }
            };
            reader.readAsText(file);
        },
        
        closeModal: closeModal
    };

    // Initialize
    function initApp() {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            app.currentUser = JSON.parse(userStr);
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            
            document.getElementById('header-avatar').textContent = app.currentUser.username.charAt(0).toUpperCase();
            document.getElementById('header-role').textContent = app.currentUser.role.charAt(0).toUpperCase() + app.currentUser.role.slice(1);
            
            // Show/hide nav links based on role
            navLinks.forEach(link => {
                const page = link.dataset.page;
                if (app.currentUser.role === 'user' && !['dashboard', 'sales', 'settings'].includes(page)) {
                    link.style.display = 'none';
                } else {
                    link.style.display = 'flex';
                }
            });
            
            navigate('dashboard');
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('app').classList.add('hidden');
        }
    }
    
    initApp();
});
