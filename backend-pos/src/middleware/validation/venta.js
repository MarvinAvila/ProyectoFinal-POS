const { body, param, query, validationResult } = require('express-validator');

const ventaValidations = {
    // Validaciones para consulta de ventas
    getAll: [
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser una fecha válida'),
        
        query('id_usuario')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100')
    ],

    // Validaciones para obtener estadísticas
    getEstadisticas: [
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser una fecha válida')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido')
    ],

    // Validaciones para crear venta
    create: [
        body('id_usuario')
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido'),
        
        body('forma_pago')
            .optional()
            .isIn(['efectivo', 'tarjeta', 'transferencia', 'mixto'])
            .withMessage('Forma de pago debe ser: efectivo, tarjeta, transferencia o mixto'),
        
        body('detalles')
            .isArray({ min: 1 })
            .withMessage('La venta debe tener al menos un producto'),
        
        body('detalles.*.id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido en los detalles'),
        
        body('detalles.*.cantidad')
            .isFloat({ min: 0.01 })
            .withMessage('La cantidad debe ser mayor a 0 en los detalles'),
        
        body('detalles.*.precio_unitario')
            .isFloat({ min: 0.01 })
            .withMessage('El precio unitario debe ser mayor a 0 en los detalles'),
        
        body('detalles.*.comentario')
            .optional()
            .isLength({ max: 200 })
            .withMessage('El comentario no puede exceder 200 caracteres')
            .trim()
            .escape()
    ],

    // Validaciones para eliminar venta
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en venta',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = ventaValidations;