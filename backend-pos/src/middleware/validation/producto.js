const { body, param, query, validationResult } = require('express-validator');

const productoValidations = {
    // Validaciones para consulta de productos
    getAll: [
        query('q')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El término de búsqueda no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        query('categoria')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido'),
        
        query('proveedor')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido'),
        
        query('con_stock_minimo')
            .optional()
            .isBoolean()
            .withMessage('con_stock_minimo debe ser true o false'),
        
        query('por_caducar')
            .optional()
            .isBoolean()
            .withMessage('por_caducar debe ser true o false'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100'),
        
        query('sortBy')
            .optional()
            .isIn(['nombre', 'precio_venta', 'stock', 'fecha_creacion', 'fecha_caducidad'])
            .withMessage('sortBy debe ser: nombre, precio_venta, stock, fecha_creacion o fecha_caducidad'),
        
        query('sortOrder')
            .optional()
            .isIn(['ASC', 'DESC'])
            .withMessage('sortOrder debe ser ASC o DESC')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido')
    ],

    // Validaciones para crear producto
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
        
        body('codigo_barra')
            .optional()
            .isLength({ max: 50 })
            .withMessage('El código de barras no puede exceder 50 caracteres'),
        
        body('precio_compra')
            .isFloat({ min: 0 })
            .withMessage('El precio de compra debe ser un número positivo'),
        
        body('precio_venta')
            .isFloat({ min: 0 })
            .withMessage('El precio de venta debe ser un número positivo')
            .custom((value, { req }) => {
                if (parseFloat(value) < parseFloat(req.body.precio_compra)) {
                    throw new Error('El precio de venta no puede ser menor al precio de compra');
                }
                return true;
            }),
        
        body('stock')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El stock debe ser un número positivo'),
        
        body('stock_minimo')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El stock mínimo debe ser un número positivo'),
        
        body('unidad')
            .optional()
            .isLength({ max: 20 })
            .withMessage('La unidad no puede exceder 20 caracteres'),
        
        body('fecha_caducidad')
            .optional()
            .isDate()
            .withMessage('La fecha de caducidad debe ser válida'),
        
        body('id_categoria')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido'),
        
        body('id_proveedor')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido')
    ],

    // Validaciones para actualizar producto
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
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
        
        body('codigo_barra')
            .optional()
            .isLength({ max: 50 })
            .withMessage('El código de barras no puede exceder 50 caracteres'),
        
        body('precio_compra')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El precio de compra debe ser un número positivo'),
        
        body('precio_venta')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El precio de venta debe ser un número positivo')
            .custom((value, { req }) => {
                if (req.body.precio_compra && parseFloat(value) < parseFloat(req.body.precio_compra)) {
                    throw new Error('El precio de venta no puede ser menor al precio de compra');
                }
                return true;
            }),
        
        body('stock')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El stock debe ser un número positivo'),
        
        body('stock_minimo')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El stock mínimo debe ser un número positivo'),
        
        body('unidad')
            .optional()
            .isLength({ max: 20 })
            .withMessage('La unidad no puede exceder 20 caracteres'),
        
        body('fecha_caducidad')
            .optional()
            .isDate()
            .withMessage('La fecha de caducidad debe ser válida'),
        
        body('id_categoria')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido'),
        
        body('id_proveedor')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de proveedor inválido')
    ],

    // Validaciones para eliminar producto
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido')
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