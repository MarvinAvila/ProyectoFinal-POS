const { body, param, query, validationResult } = require('express-validator');

const categoriaValidations = {
    // Validaciones para consultas
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
            .trim()
            .escape(),
        
        query('activo')
            .optional()
            .isBoolean()
            .withMessage('El filtro activo debe ser verdadero o falso')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido')
    ],

    // Validaciones para crear categoría
    create: [
        body('nombre')
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .trim()
            .escape(),
        
        body('descripcion')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .trim()
            .escape(),
        
        body('color')
            .optional()
            .isHexColor()
            .withMessage('El color debe ser un código hexadecimal válido'),
        
        body('icono')
            .optional()
            .isLength({ max: 50 })
            .withMessage('El icono no puede exceder 50 caracteres')
    ],

    // Validaciones para actualización completa
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido'),
        
        body('nombre')
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .trim()
            .escape(),
        
        body('descripcion')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .trim()
            .escape()
    ],

    // Validaciones para actualización parcial
    patch: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido'),
        
        body('nombre')
            .optional()
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .trim()
            .escape(),
        
        body('descripcion')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .trim()
            .escape(),
        
        body('activo')
            .optional()
            .isBoolean()
            .withMessage('El estado activo debe ser verdadero o falso')
    ],

    // Validaciones para eliminar
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido')
    ],

    // Validaciones para mover productos
    moverProductos: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de categoría origen inválido'),
        
        body('categoria_destino_id')
            .isInt({ min: 1 })
            .withMessage('ID de categoría destino inválido'),
        
        body('productos_ids')
            .isArray({ min: 1 })
            .withMessage('Debe proporcionar al menos un producto para mover'),
        
        body('productos_ids.*')
            .isInt({ min: 1 })
            .withMessage('Cada ID de producto debe ser válido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en categoría',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = categoriaValidations;