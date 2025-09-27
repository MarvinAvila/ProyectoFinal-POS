const { body, param, query, validationResult } = require('express-validator');

const detalleVentaValidations = {
    // Validaciones para consultas
    query: [
        query('id_venta')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido'),
        
        query('id_producto')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe ser entre 1 y 100'),
        
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser válida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser válida')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de detalle de venta inválido')
    ],

    // Validaciones para obtener por venta
    getByVenta: [
        param('id_venta')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido')
    ],

    // Validaciones para obtener por producto
    getByProducto: [
        param('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido')
    ],

    // Validaciones para crear detalle
    create: [
        body('id_venta')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido'),
        
        body('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('cantidad')
            .isFloat({ min: 0.01 })
            .withMessage('La cantidad debe ser mayor a 0'),
        
        body('precio_unitario')
            .isFloat({ min: 0.01 })
            .withMessage('El precio unitario debe ser mayor a 0'),
        
        body('comentario')
            .optional()
            .isLength({ max: 500 })
            .withMessage('El comentario no puede exceder 500 caracteres')
            .trim()
            .escape()
    ],

    // Validaciones para crear múltiples detalles
    createMultiple: [
        body('id_venta')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido'),
        
        body('detalles')
            .isArray({ min: 1 })
            .withMessage('Debe proporcionar al menos un detalle'),
        
        body('detalles.*.id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido en los detalles'),
        
        body('detalles.*.cantidad')
            .isFloat({ min: 0.01 })
            .withMessage('La cantidad debe ser mayor a 0 en los detalles'),
        
        body('detalles.*.precio_unitario')
            .isFloat({ min: 0.01 })
            .withMessage('El precio unitario debe ser mayor a 0 en los detalles')
    ],

    // Validaciones para actualización completa
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de detalle de venta inválido'),
        
        body('id_producto')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('cantidad')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('La cantidad debe ser mayor a 0'),
        
        body('precio_unitario')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('El precio unitario debe ser mayor a 0')
    ],

    // Validaciones para actualización parcial
    patch: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de detalle de venta inválido'),
        
        body('cantidad')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('La cantidad debe ser mayor a 0'),
        
        body('precio_unitario')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('El precio unitario debe ser mayor a 0'),
        
        body('comentario')
            .optional()
            .isLength({ max: 500 })
            .withMessage('El comentario no puede exceder 500 caracteres')
            .trim()
            .escape()
    ],

    // Validaciones para eliminar
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de detalle de venta inválido')
    ],

    // Validaciones para reporte de ventas por productos
    reporteVentasProductos: [
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('Fecha de inicio inválida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('Fecha de fin inválida'),
        
        query('id_categoria')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido'),
        
        query('agrupar_por')
            .optional()
            .isIn(['dia', 'semana', 'mes', 'producto', 'categoria'])
            .withMessage('Agrupar por debe ser: dia, semana, mes, producto o categoria')
    ],

    // Validaciones para reporte de top productos
    reporteTopProductos: [
        query('limite')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('El límite debe ser entre 1 y 50'),
        
        query('periodo')
            .optional()
            .isIn(['7d', '30d', '90d', 'ytd'])
            .withMessage('El período debe ser: 7d, 30d, 90d o ytd'),
        
        query('ordenar_por')
            .optional()
            .isIn(['cantidad', 'ingresos', 'utilidad'])
            .withMessage('Ordenar por debe ser: cantidad, ingresos o utilidad')
    ],

    // Validaciones para validar stock
    validarStock: [
        body('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('cantidad')
            .isFloat({ min: 0.01 })
            .withMessage('La cantidad debe ser mayor a 0'),
        
        body('id_venta')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en detalle de venta',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = detalleVentaValidations;