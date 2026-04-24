const DEFAULT_DATA = {
    users: [
        { id: 1, username: 'admin', password: btoa('admin123'), role: 'admin' },
        { id: 2, username: 'user', password: btoa('user123'), role: 'user' }
    ],
    settings: {
        currency: 'IDR'
    },
    ingredients: [
        { id: 1, name: "Flour", unit: "kg", quantity: 50, minQuantity: 10, isCritical: false },
        { id: 2, name: "Sugar", unit: "kg", quantity: 30, minQuantity: 10, isCritical: false },
        { id: 3, name: "Milk", unit: "L", quantity: 2, minQuantity: 10, isCritical: true }, // Low stock
        { id: 4, name: "Heavy Cream", unit: "L", quantity: 0, minQuantity: 5, isCritical: true }, // Out of stock
        { id: 5, name: "Dark Chocolate", unit: "kg", quantity: 15, minQuantity: 5, isCritical: false },
        { id: 6, name: "Eggs", unit: "pcs", quantity: 200, minQuantity: 50, isCritical: true },
        { id: 7, name: "Butter", unit: "kg", quantity: 8, minQuantity: 10, isCritical: true } // Low stock
    ],
    products: [
        { 
            id: 1, 
            name: "Classic Chocolate Cake", 
            price: 35.00,
            recipe: [
                { ingredientId: 1, amount: 0.5 },
                { ingredientId: 2, amount: 0.3 },
                { ingredientId: 3, amount: 0.2 },
                { ingredientId: 5, amount: 0.4 },
                { ingredientId: 6, amount: 3 },
                { ingredientId: 7, amount: 0.2 }
            ]
        },
        {
            id: 2,
            name: "Vanilla Pastry",
            price: 15.00,
            recipe: [
                { ingredientId: 1, amount: 0.2 },
                { ingredientId: 2, amount: 0.1 },
                { ingredientId: 4, amount: 0.1 },
                { ingredientId: 6, amount: 1 },
                { ingredientId: 7, amount: 0.1 }
            ]
        }
    ],
    sales: [
        { id: 1, date: new Date(Date.now() - 86400000).toISOString(), productId: 1, quantity: 2, total: 70 },
        { id: 2, date: new Date().toISOString(), productId: 2, quantity: 5, total: 75 }
    ],
    adjustments: [] 
};

class DataStore {
    constructor() {
        this.load();
    }

    load() {
        const stored = localStorage.getItem('sweetStockData');
        if (stored) {
            this.data = JSON.parse(stored);
            let modified = false;
            if (!this.data.users) {
                this.data.users = JSON.parse(JSON.stringify(DEFAULT_DATA.users));
                modified = true;
            }
            if (!this.data.settings) {
                this.data.settings = JSON.parse(JSON.stringify(DEFAULT_DATA.settings));
                modified = true;
            }
            if (modified) {
                this.save();
            }
        } else {
            this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
            this.save();
        }
    }

    save() {
        localStorage.setItem('sweetStockData', JSON.stringify(this.data));
    }

    getIngredients() {
        // Return a mapped array where sub-recipes have their quantity computed dynamically
        return this.data.ingredients.map(i => {
            const subProduct = this.data.products.find(p => p.linkedIngredientId === i.id);
            if (subProduct) {
                return { ...i, quantity: this.calculatePossibleYield(subProduct.recipe), isSubRecipe: true };
            }
            return { ...i, isSubRecipe: false };
        });
    }
    
    getProducts() { return this.data.products; }
    getSales() { return this.data.sales; }
    getUsers() { return this.data.users || []; }
    getSettings() { return this.data.settings || { currency: 'IDR' }; }

    updateSettings(newSettings) {
        this.data.settings = { ...(this.data.settings || {}), ...newSettings };
        this.save();
    }

    addUser(user) {
        const users = this.data.users || [];
        const maxId = users.reduce((max, u) => u.id > max ? u.id : max, 0);
        user.id = maxId + 1;
        if (user.password) user.password = btoa(user.password);
        users.push(user);
        this.data.users = users;
        this.save();
        return user;
    }

    updateUser(id, updatedData) {
        const users = this.data.users || [];
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            if (updatedData.password) {
                updatedData.password = btoa(updatedData.password);
            }
            users[index] = { ...users[index], ...updatedData };
            this.data.users = users;
            this.save();
            return true;
        }
        return false;
    }

    deleteUser(id) {
        if (id === 1) return false; // Prevent deleting main admin
        this.data.users = (this.data.users || []).filter(u => u.id !== id);
        this.save();
        return true;
    }

    calculatePossibleYield(recipe) {
        if (!recipe || recipe.length === 0) return 0;
        
        let maxPossible = Infinity;
        
        for (let item of recipe) {
            const ing = this.data.ingredients.find(i => i.id === item.ingredientId);
            if (!ing) return 0;
            
            let available = ing.quantity;
            const subProduct = this.data.products.find(p => p.linkedIngredientId === ing.id);
            if (subProduct) {
                available = this.calculatePossibleYield(subProduct.recipe);
            }
            
            if (item.amount <= 0) continue;
            const possibleFromThis = Math.floor(available / item.amount);
            if (possibleFromThis < maxPossible) {
                maxPossible = possibleFromThis;
            }
        }
        
        return maxPossible === Infinity ? 0 : maxPossible;
    }

    addIngredient(ingredient) {
        const maxId = this.data.ingredients.reduce((max, i) => i.id > max ? i.id : max, 0);
        ingredient.id = maxId + 1;
        this.data.ingredients.push(ingredient);
        this.save();
        return ingredient;
    }

    deleteIngredient(id) {
        this.data.ingredients = this.data.ingredients.filter(i => i.id !== id);
        this.save();
        return true;
    }

    updateIngredient(id, updatedData) {
        const index = this.data.ingredients.findIndex(i => i.id === id);
        if (index !== -1) {
            this.data.ingredients[index] = { ...this.data.ingredients[index], ...updatedData };
            this.save();
            return true;
        }
        return false;
    }

    addProduct(product) {
        const maxId = this.data.products.reduce((max, p) => p.id > max ? p.id : max, 0);
        product.id = maxId + 1;
        this.data.products.push(product);
        this.save();
        return product;
    }

    updateProduct(id, updatedData) {
        const index = this.data.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.products[index] = { ...this.data.products[index], ...updatedData };
            this.save();
            return true;
        }
        return false;
    }

    deleteProduct(id) {
        this.data.products = this.data.products.filter(p => p.id !== id);
        this.save();
        return true;
    }

    deductRecipe(recipe, quantityToDeduct) {
        for (let item of recipe) {
            const ing = this.data.ingredients.find(i => i.id === item.ingredientId);
            if (!ing) continue;

            const subProduct = this.data.products.find(p => p.linkedIngredientId === ing.id);
            
            if (subProduct) {
                // Sub-recipes are purely virtual, recursively deduct raw materials
                this.deductRecipe(subProduct.recipe, quantityToDeduct * item.amount);
            } else {
                // Normal ingredient deduction
                ing.quantity -= (item.amount * quantityToDeduct);
                if (ing.quantity < 0) ing.quantity = 0;
            }
        }
    }

    accumulateRequiredIngredients(recipe, multiplier, requiredMap) {
        if (!recipe || recipe.length === 0) return true;
        for (let item of recipe) {
            const ing = this.data.ingredients.find(i => i.id === item.ingredientId);
            if (!ing) return false; // Ingredient deleted

            const subProduct = this.data.products.find(p => p.linkedIngredientId === ing.id);
            if (subProduct) {
                if (!this.accumulateRequiredIngredients(subProduct.recipe, multiplier * item.amount, requiredMap)) {
                    return false;
                }
            } else {
                requiredMap[ing.id] = (requiredMap[ing.id] || 0) + (item.amount * multiplier);
            }
        }
        return true;
    }

    addSale(productId, quantity) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) return false;

        // Check if we have enough ingredients
        if (product.recipe && product.recipe.length > 0) {
            let requiredMap = {};
            if (!this.accumulateRequiredIngredients(product.recipe, quantity, requiredMap)) {
                return false; // A required ingredient was deleted
            }

            for (let ingId in requiredMap) {
                const ing = this.data.ingredients.find(i => i.id === parseInt(ingId));
                if (!ing || ing.quantity < requiredMap[ingId]) {
                    return false; // Not enough stock
                }
            }
        }

        // Deduct from the product's recipe
        this.deductRecipe(product.recipe, quantity);

        const sale = {
            id: Date.now(),
            date: new Date().toISOString(),
            productId: product.id,
            quantity: quantity,
            total: product.price * quantity
        };
        this.data.sales.push(sale);
        this.save();
        return true;
    }

    adjustStock(ingredientId, type, amount) {
        const ing = this.data.ingredients.find(i => i.id === ingredientId);
        if (!ing) return false;

        if (type === 'add') {
            ing.quantity += amount;
        } else if (type === 'reduce') {
            ing.quantity -= amount;
            if (ing.quantity < 0) ing.quantity = 0;
        }
        
        this.data.adjustments.push({
            id: Date.now(),
            date: new Date().toISOString(),
            ingredientId,
            type,
            amount
        });
        this.save();
        return true;
    }
    
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sweetstock_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Backup exported successfully!');
    }
    
    importData(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed.ingredients && parsed.products) {
                this.data = parsed;
                this.save();
                return true;
            }
        } catch (e) {
            console.error("Import failed", e);
        }
        return false;
    }
}

window.store = new DataStore();
