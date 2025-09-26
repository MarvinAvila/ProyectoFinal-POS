const { validationResult, body, param, query } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

const validationMiddleware = {
    // Validaciones comunes para IDs
    validateId: (paramName = 'id') => {
        return param(paramName)
            .isInt({ min: 1 })
            .withMessage(`El ${paramName} debe ser un número entero positivo`);
    },

    // Validaciones para paginación
    validatePagination: () => {
        return [
            query('page')
                .optional()
                .isInt({ min: 1 })
                .withMessage('La página debe ser un número positivo'),
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('El límite debe ser entre 1 y 100')
        ];
    },

    // Validaciones para búsqueda
    validateSearch: () => {
        return query('q')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El término de búsqueda no puede exceder 100 caracteres')
            .trim()
            .escape();
    },

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return responseHelper.validationError(res, errors);
        }
        next();
    },

    // Validaciones específicas para cada entidad
    usuario: {
        create: [
            body('nombre')
                .isLength({ min: 2, max: 100 })
                .withMessage('El nombre debe tener entre 2 y 100 caracteres')
                .trim()
                .escape(),
            
            body('correo')
                .isEmail()
                .normalizeEmail()
                .withMessage('Debe proporcionar un correo electrónico válido'),
            
            body('contrasena')
                .isLength({ min: 6 })
                .withMessage('La contraseña debe tener al menos 6 caracteres')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
            
            body('rol')
                .optional()
                .isIn(['admin', 'cajero', 'gerente', 'dueno'])
                .withMessage('Rol no válido')
        ],

        update: [
            body('nombre')
                .optional()
                .isLength({ min: 2, max: 100 })
                .withMessage('El nombre debe tener entre 2 y 100 caracteres')
                .trim()
                .escape(),
            
            body('correo')
                .optional()
                .isEmail()
                .normalizeEmail()
                .withMessage('Debe proporcionar un correo electrónico válido'),
            
            body('contrasena')
                .optional()
                .isLength({ min: 6 })
                .withMessage('La contraseña debe tener al menos 6 caracteres'),
            
            body('rol')
                .optional()
                .isIn(['admin', 'cajero', 'gerente', 'dueno'])
                .withMessage('Rol no válido'),
            
            body('activo')
                .optional()
                .isBoolean()
                .withMessage('El estado activo debe ser verdadero o falso')
        ]
    },

    producto: {
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

        update: [
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
                .withMessage('El precio de venta debe ser un número positivo'),
            
            body('stock')
                .optional()
                .isFloat({ min: 0 })
                .withMessage('El stock debe ser un número positivo')
        ]
    },

    venta: {
        create: [
            body('id_usuario')
                .isInt({ min: 1 })
                .withMessage('ID de usuario inválido'),
            
            body('detalles')
                .isArray({ min: 1 })
                .withMessage('Debe proporcionar al menos un detalle de venta'),
            
            body('detalles.*.id_producto')
                .isInt({ min: 1 })
                .withMessage('ID de producto inválido'),
            
            body('detalles.*.cantidad')
                .isFloat({ min: 0.01 })
                .withMessage('La cantidad debe ser mayor a 0'),
            
            body('detalles.*.precio_unitario')
                .isFloat({ min: 0 })
                .withMessage('El precio unitario debe ser positivo')
        ]
    }
};

module.exports = validationMiddleware;