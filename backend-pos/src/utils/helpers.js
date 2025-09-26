// Utilidades generales para la aplicación
const helpers = {
    // Formatear fechas
    formatDate: (date) => {
        return new Date(date).toISOString().split('T')[0];
    },
    
    // Formatear moneda
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    },
    
    // Validar email
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Generar código de barras simple
    generateBarcode: () => {
        return 'BC' + Date.now() + Math.floor(Math.random() * 1000);
    },
    
    // Calcular total con IVA
    calcularTotalConIVA: (subtotal, ivaPorcentaje = 0.16) => {
        const iva = subtotal * ivaPorcentaje;
        return {
            subtotal: Math.round(subtotal * 100) / 100,
            iva: Math.round(iva * 100) / 100,
            total: Math.round((subtotal + iva) * 100) / 100
        };
    },
    
    // Paginación
    getPaginationParams: (query) => {
        const page = Math.max(parseInt(query.page) || 1, 1);
        const limit = Math.min(parseInt(query.limit) || 50, 100);
        const offset = (page - 1) * limit;
        
        return { page, limit, offset };
    },
    
    // Sanitizar entrada de texto
    sanitizeInput: (text) => {
        if (typeof text !== 'string') return text;
        return text.trim().replace(/[<>]/g, '');
    },
    
    // Generar número de ticket
    generateTicketNumber: () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `TKT${year}${month}${day}${random}`;
    }
};

module.exports = helpers;