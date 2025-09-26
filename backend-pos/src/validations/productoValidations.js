const { body, param, query, validationResult } = require('express-validator');

const productoValidations = {
    // Validaciones para crear producto
    create: [
        body('nombre')
            .isLength({ min: 2, max: 200 })
            .withMessage('El nombre del producto debe tener entre 2 y 200 caracteres')
            .trim()
            .escape(),
        
        body('precio_compra')
            .isFloat({ min: 0 })
            .withMessage('El precio de compra debe ser un número positivo'),
        
        body('precio_venta')
            .isFloat({ min: 0 })
            .withMessage('El precio de venta debe ser un número positivo'),
        
        body('stock')
            .isFloat({ min: 0 })
            .withMessage('El stock debe ser un número positivo'),
        
        body('unidad')
            .isIn(['pieza', 'kg', 'lt', 'otro'])
            .withMessage('La unidad debe ser: pieza, kg, lt u otro'),
        
        body('fecha_caducidad')
            .optional()
            .isDate()
            .withMessage('La fecha de caducidad debe ser una fecha válida')
    ],
    
    // Validaciones para actualizar producto
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('nombre')
            .optional()
            .isLength({ min: 2, max: 200 })
            .withMessage('El nombre del producto debe tener entre 2 y 200 caracteres'),
        
        body('precio_compra')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El precio de compra debe ser un número positivo'),
        
        body('precio_venta')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El precio de venta debe ser un número positivo')
    ],
    
    // Validaciones para parámetros de consulta
    query: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe ser entre 1 y 100'),
        
        query('q')
            .optional()
            .isLength({ max: 100 })
            .withMessage('La búsqueda no puede exceder 100 caracteres')
    ],
    
    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en producto',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = productoValidations;