const { body, param, query, validationResult } = require('express-validator');

const ofertaValidations = {
    // Validaciones para consulta de ofertas
    getAll: [
        query('estado')
            .optional()
            .isIn(['ACTIVA', 'INACTIVA', 'PROGRAMADA', 'EXPIRADA'])
            .withMessage('Estado debe ser: ACTIVA, INACTIVA, PROGRAMADA o EXPIRADA'),
        
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
            .withMessage('ID de oferta inválido'),
        
        query('includeProductos')
            .optional()
            .isBoolean()
            .withMessage('includeProductos debe ser true o false')
    ],

    // Validaciones para obtener productos asociados
    getProductosAsociados: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de oferta inválido'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100')
    ],

    // Validaciones para crear oferta
    create: [
        body('nombre')
            .isLength({ min: 1, max: 100 })
            .withMessage('El nombre es requerido y no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        body('descripcion')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .trim()
            .escape(),
        
        body('porcentaje_descuento')
            .isFloat({ min: 0.01, max: 100 })
            .withMessage('El porcentaje de descuento debe ser entre 0.01 y 100'),
        
        body('fecha_inicio')
            .isISO8601()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        body('fecha_fin')
            .isISO8601()
            .withMessage('La fecha de fin debe ser una fecha válida')
            .custom((value, { req }) => {
                if (new Date(value) <= new Date(req.body.fecha_inicio)) {
                    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
                }
                return true;
            })
    ],

    // Validaciones para actualizar oferta
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de oferta inválido'),
        
        body('nombre')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('El nombre no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        body('descripcion')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .trim()
            .escape(),
        
        body('porcentaje_descuento')
            .optional()
            .isFloat({ min: 0.01, max: 100 })
            .withMessage('El porcentaje de descuento debe ser entre 0.01 y 100'),
        
        body('fecha_inicio')
            .optional()
            .isISO8601()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        body('fecha_fin')
            .optional()
            .isISO8601()
            .withMessage('La fecha de fin debe ser una fecha válida')
            .custom((value, { req }) => {
                if (req.body.fecha_inicio && new Date(value) <= new Date(req.body.fecha_inicio)) {
                    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
                }
                return true;
            }),
        
        body('activo')
            .optional()
            .isBoolean()
            .withMessage('Activo debe ser true o false')
    ],

    // Validaciones para eliminar oferta
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de oferta inválido')
    ],

    // Validaciones para asignar producto
    asignarProducto: [
        body('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('id_oferta')
            .isInt({ min: 1 })
            .withMessage('ID de oferta inválido')
    ],

    // Validaciones para desasignar producto
    desasignarProducto: [
        body('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('id_oferta')
            .isInt({ min: 1 })
            .withMessage('ID de oferta inválido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en oferta',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = ofertaValidations;