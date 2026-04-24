document.addEventListener('DOMContentLoaded', () => {
    const pageContainer = document.getElementById('page-container');
    const pageTitle = document.getElementById('page-title');
    const navLinks = document.querySelectorAll('.nav-links a');
    const modalContainer = document.getElementById('modal-container');

    // Routing
    function navigate(page) {
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
    const formatMoney = (amount) => `$${amount.toFixed(2)}`;
    
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

            return `
            <tr>
                <td>${i.name} ${criticalBadge}</td>
                <td><strong>${parseFloat(i.quantity.toFixed(2))}</strong> ${i.unit}</td>
                <td class="text-muted">Min: ${i.minQuantity}</td>
                <td>${statusBadge}</td>
                <td style="text-align:right">
                    <button class="btn btn-outline btn-sm" onclick="app.showAdjustStock(${i.id})">Adjust</button>
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
            return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${formatMoney(p.price)}</td>
                <td>${p.recipe.length} ingredients</td>
                <td style="text-align:right">
                    <button class="btn btn-outline btn-sm" onclick="app.showRecipe(${p.id})">View Recipe</button>
                </td>
            </tr>`;
        }).join('');

        const html = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Manage desserts and their Bill of Materials (Recipes).</p>
                <button class="btn btn-primary" onclick="app.showAddProduct()">+ New Product</button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Price</th>
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
                    <p class="text-muted mb-4">Tap a product to select it.</p>
                    <div class="pos-products mb-4">
                        ${products.map(p => `
                            <div class="pos-product-card" onclick="app.selectProduct(${p.id}, event)">
                                <div class="pos-product-name">${p.name}</div>
                                <div class="pos-product-price">${formatMoney(p.price)}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <input type="hidden" id="pos-product" value="">
                    
                    <div id="pos-qty-section" style="display: none;">
                        <h4 id="pos-selected-name" class="mb-4" style="text-align: center; color: var(--primary); font-size: 1.25rem;"></h4>
                        <div class="qty-control">
                            <button class="qty-btn" onclick="app.changeQty(-1)">-</button>
                            <span class="qty-display" id="pos-qty-display">1</span>
                            <button class="qty-btn" onclick="app.changeQty(1)">+</button>
                        </div>
                        <input type="hidden" id="pos-qty" value="1">
                        <button class="btn btn-primary" style="width:100%; justify-content:center; padding: 1rem; font-size: 1.1rem; margin-top: 1rem;" onclick="app.submitSale()">Complete Sale</button>
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
        pageContainer.innerHTML = `
            <div class="card">
                <h3 class="mb-4">Settings</h3>
                <p>System settings goes here (e.g. currency symbol, store name).</p>
            </div>
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
                        <input type="number" id="new-ing-qty" class="form-control" value="0" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Minimum Threshold (Alert Level)</label>
                        <input type="number" id="new-ing-min" class="form-control" value="5" min="0" step="0.01">
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
            const qty = parseFloat(document.getElementById('new-ing-qty').value);
            const minQty = parseFloat(document.getElementById('new-ing-min').value);
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
                        <input type="number" id="adj-amount" class="form-control" value="0" min="0.01" step="0.01">
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
        
        showAddProduct: function() {
            const content = `
                <div class="modal-body">
                    <p class="mb-4">Enter new product details. (Recipe editing coming soon)</p>
                    <div class="form-group">
                        <label>Product Name</label>
                        <input type="text" id="new-prod-name" class="form-control" placeholder="e.g. Strawberry Shortcake">
                    </div>
                    <div class="form-group">
                        <label>Price</label>
                        <input type="number" id="new-prod-price" class="form-control" value="0" min="0" step="0.01">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="app.submitNewProduct()">Save Product</button>
                </div>
            `;
            showModal('Add New Product', content);
        },
        
        submitNewProduct: function() {
            const name = document.getElementById('new-prod-name').value.trim();
            const price = parseFloat(document.getElementById('new-prod-price').value);
            
            if (!name || isNaN(price) || price < 0) {
                alert("Please fill out all fields correctly.");
                return;
            }
            
            window.store.addProduct({
                name: name,
                price: price,
                recipe: [] // Empty recipe for now
            });
            
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
        
        selectProduct: function(id, event) {
            document.getElementById('pos-product').value = id;
            document.querySelectorAll('.pos-product-card').forEach(el => el.classList.remove('selected'));
            if (event) event.currentTarget.classList.add('selected');
            
            const product = window.store.getProducts().find(p => p.id === id);
            document.getElementById('pos-selected-name').textContent = product.name;
            document.getElementById('pos-qty-section').style.display = 'block';
            document.getElementById('pos-qty').value = 1;
            document.getElementById('pos-qty-display').textContent = '1';
            
            if (window.innerWidth <= 768) {
                document.getElementById('pos-qty-section').scrollIntoView({behavior: 'smooth', block: 'end'});
            }
        },
        
        changeQty: function(delta) {
            const input = document.getElementById('pos-qty');
            const display = document.getElementById('pos-qty-display');
            let val = parseInt(input.value) + delta;
            if (val < 1) val = 1;
            input.value = val;
            display.textContent = val;
        },
        
        submitSale: function() {
            const productIdStr = document.getElementById('pos-product').value;
            if (!productIdStr) {
                alert("Please select a product first");
                return;
            }
            const productId = parseInt(productIdStr);
            const qty = parseInt(document.getElementById('pos-qty').value);
            
            if (isNaN(qty) || qty <= 0) {
                alert("Please enter a valid quantity");
                return;
            }
            
            if (window.store.addSale(productId, qty)) {
                // Clear and refresh
                document.getElementById('pos-qty-section').style.display = 'none';
                document.getElementById('pos-product').value = '';
                document.querySelectorAll('.pos-product-card').forEach(el => el.classList.remove('selected'));
                updateTodaySalesList();
            } else {
                alert("Failed to process sale.");
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
    navigate('dashboard');
});
