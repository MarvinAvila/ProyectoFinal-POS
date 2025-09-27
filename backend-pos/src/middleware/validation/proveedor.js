const { body, param, query, validationResult } = require('express-validator');

const proveedorValidations = {
    // Validaciones para consulta de proveedores
    getAll: [
        query('q')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El término de búsqueda no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        query('activo')
            .optional()
            .isBoolean()
            .withMessage('Activo debe ser true o false'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido'),
        
        query('includeProductos')
            .optional()
            .isBoolean()
            .withMessage('includeProductos debe ser true o false')
    ],

    // Validaciones para obtener productos de proveedor
    getProductos: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido'),
        
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
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido')
    ],

    // Validaciones para crear proveedor
    create: [
        body('nombre')
            .isLength({ min: 1, max: 100 })
            .withMessage('El nombre es requerido y no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        body('contacto')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El contacto no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        body('telefono')
            .optional()
            .isLength({ max: 20 })
            .withMessage('El teléfono no puede exceder 20 caracteres')
            .matches(/^[\d\s\-\+\(\)]+$/)
            .withMessage('Formato de teléfono inválido'),
        
        body('email')
            .optional()
            .isEmail()
            .withMessage('El formato del email no es válido')
            .normalizeEmail(),
        
        body('direccion')
            .optional()
            .isLength({ max: 255 })
            .withMessage('La dirección no puede exceder 255 caracteres')
            .trim()
            .escape()
    ],

    // Validaciones para actualizar proveedor
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido'),
        
        body('nombre')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('El nombre no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        body('contacto')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El contacto no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        body('telefono')
            .optional()
            .isLength({ max: 20 })
            .withMessage('El teléfono no puede exceder 20 caracteres')
            .matches(/^[\d\s\-\+\(\)]+$/)
            .withMessage('Formato de teléfono inválido'),
        
        body('email')
            .optional()
            .isEmail()
            .withMessage('El formato del email no es válido')
            .normalizeEmail(),
        
        body('direccion')
            .optional()
            .isLength({ max: 255 })
            .withMessage('La dirección no puede exceder 255 caracteres')
            .trim()
            .escape()
    ],

    // Validaciones para eliminar proveedor
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en proveedor',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = proveedorValidations;