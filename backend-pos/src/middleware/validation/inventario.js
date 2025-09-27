const { query, body, validationResult } = require('express-validator');

const inventarioValidations = {
    // Validaciones para el historial
    historial: [
        query('id_producto')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de producto debe ser un número entero positivo'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100'),
        
        query('motivo')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El motivo no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        query('tipo')
            .optional()
            .isIn(['entrada', 'salida'])
            .withMessage('El tipo debe ser "entrada" o "salida"'),
        
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser una fecha válida')
    ],

    // Validaciones para estadísticas
    estadisticas: [
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser una fecha válida')
    ],

    // Validaciones para ajustes
    ajuste: [
        body('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto es requerido y debe ser un número entero positivo'),
        
        body('cambio')
            .isFloat()
            .withMessage('El cambio debe ser un número válido')
            .custom((value) => {
                if (parseFloat(value) === 0) {
                    throw new Error('El cambio no puede ser cero');
                }
                return true;
            }),
        
        body('motivo')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El motivo no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        body('nota')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La nota no puede exceder 500 caracteres')
            .trim()
            .escape(),
        
        body('id_usuario')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de usuario debe ser un número entero positivo')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en inventario',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = inventarioValidations;