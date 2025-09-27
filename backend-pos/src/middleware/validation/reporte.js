const { body, param, query, validationResult } = require('express-validator');

const reporteValidations = {
    // Validaciones para consulta de reportes
    getAll: [
        query('tipo')
            .optional()
            .isIn(['ventas_dia', 'top_productos', 'stock_bajo', 'inventario', 'ventas_mensual', 'clientes_frecuentes'])
            .withMessage('Tipo de reporte no válido'),
        
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser una fecha válida'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('El límite debe estar entre 1 y 50')
    ],

    // Validaciones para obtener estadísticas de reportes
    getEstadisticasReportes: [
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser una fecha válida'),
        
        query('tipo')
            .optional()
            .isIn(['ventas_dia', 'top_productos', 'stock_bajo', 'inventario', 'ventas_mensual', 'clientes_frecuentes'])
            .withMessage('Tipo de reporte no válido')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de reporte inválido')
    ],

    // Validaciones para generar reporte
    generarReporte: [
        body('tipo')
            .isIn(['ventas_dia', 'top_productos', 'stock_bajo', 'inventario', 'ventas_mensual', 'clientes_frecuentes'])
            .withMessage('Tipo de reporte no válido'),
        
        body('id_usuario')
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido'),
        
        body('parametros.fecha')
            .optional()
            .isDate()
            .withMessage('La fecha debe ser válida'),
        
        body('parametros.limite')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100'),
        
        body('parametros.fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser válida'),
        
        body('parametros.fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser válida'),
        
        body('parametros.stock_minimo')
            .optional()
            .isInt({ min: 0 })
            .withMessage('El stock mínimo debe ser un número positivo'),
        
        body('parametros.mes')
            .optional()
            .isInt({ min: 1, max: 12 })
            .withMessage('El mes debe estar entre 1 y 12'),
        
        body('parametros.anio')
            .optional()
            .isInt({ min: 2020, max: 2030 })
            .withMessage('El año debe ser válido')
    ],

    // Validaciones para eliminar reporte
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de reporte inválido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en reporte',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = reporteValidations;