const DEFAULT_DATA = {
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
        } else {
            this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
            this.save();
        }
    }

    save() {
        localStorage.setItem('sweetStockData', JSON.stringify(this.data));
    }

    getIngredients() { return this.data.ingredients; }
    getProducts() { return this.data.products; }
    getSales() { return this.data.sales; }

    addIngredient(ingredient) {
        // Find max ID
        const maxId = this.data.ingredients.reduce((max, i) => i.id > max ? i.id : max, 0);
        ingredient.id = maxId + 1;
        this.data.ingredients.push(ingredient);
        this.save();
        return ingredient;
    }

    addProduct(product) {
        const maxId = this.data.products.reduce((max, p) => p.id > max ? p.id : max, 0);
        product.id = maxId + 1;
        this.data.products.push(product);
        this.save();
        return product;
    }

    addSale(productId, quantity) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) return false;

        // Deduct inventory
        for (let item of product.recipe) {
            const ing = this.data.ingredients.find(i => i.id === item.ingredientId);
            if (ing) {
                ing.quantity -= (item.amount * quantity);
                if (ing.quantity < 0) ing.quantity = 0;
            }
        }

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
