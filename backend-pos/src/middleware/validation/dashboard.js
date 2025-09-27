const { body, param, query, validationResult } = require('express-validator');

const dashboardValidations = {
    // Validaciones para estadísticas avanzadas
    estadisticasAvanzadas: [
        query('periodo')
            .optional()
            .isIn(['7d', '30d', '90d', 'ytd', 'custom'])
            .withMessage('El período debe ser: 7d, 30d, 90d, ytd o custom'),
        
        query('fecha_inicio')
            .optional()
            .isDate()
            .withMessage('La fecha de inicio debe ser válida')
            .custom((value, { req }) => {
                if (req.query.periodo === 'custom' && !value) {
                    throw new Error('La fecha de inicio es requerida para período custom');
                }
                return true;
            }),
        
        query('fecha_fin')
            .optional()
            .isDate()
            .withMessage('La fecha de fin debe ser válida')
            .custom((value, { req }) => {
                if (req.query.fecha_inicio && value) {
                    const inicio = new Date(req.query.fecha_inicio);
                    const fin = new Date(value);
                    if (fin <= inicio) {
                        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
                    }
                }
                return true;
            }),
        
        query('categoria_id')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de categoría inválido'),
        
        query('agrupar_por')
            .optional()
            .isIn(['dia', 'semana', 'mes', 'año'])
            .withMessage('Agrupar por debe ser: dia, semana, mes o año')
    ],

    // Validaciones para datos de ventas
    ventas: [
        query('tipo_grafico')
            .optional()
            .isIn(['lineas', 'barras', 'torta', 'areas'])
            .withMessage('Tipo de gráfico debe ser: lineas, barras, torta o areas'),
        
        query('mostrar_comparativa')
            .optional()
            .isBoolean()
            .withMessage('Mostrar comparativa debe ser verdadero o falso'),
        
        query('periodo_comparativo')
            .optional()
            .isIn(['mes_anterior', 'año_anterior', 'custom'])
            .withMessage('Período comparativo debe ser: mes_anterior, año_anterior o custom')
    ],

    // Validaciones para métricas financieras
    finanzas: [
        query('moneda')
            .optional()
            .isIn(['MXN', 'USD', 'EUR'])
            .withMessage('Moneda debe ser: MXN, USD o EUR'),
        
        query('incluir_proyecciones')
            .optional()
            .isBoolean()
            .withMessage('Incluir proyecciones debe ser verdadero o falso'),
        
        query('nivel_detalle')
            .optional()
            .isIn(['basico', 'detallado', 'completo'])
            .withMessage('Nivel de detalle debe ser: basico, detallado o completo')
    ],

    // Validaciones para exportación
    exportar: [
        body('tipo_reporte')
            .isIn(['ventas', 'inventario', 'finanzas', 'completo'])
            .withMessage('Tipo de reporte debe ser: ventas, inventario, finanzas o completo'),
        
        body('formato')
            .isIn(['pdf', 'excel', 'csv', 'json'])
            .withMessage('Formato debe ser: pdf, excel, csv o json'),
        
        body('periodo')
            .isObject()
            .withMessage('El período debe ser un objeto'),
        
        body('periodo.fecha_inicio')
            .optional()
            .isDate()
            .withMessage('Fecha de inicio inválida'),
        
        body('periodo.fecha_fin')
            .optional()
            .isDate()
            .withMessage('Fecha de fin inválida'),
        
        body('filtros')
            .optional()
            .isObject()
            .withMessage('Los filtros deben ser un objeto')
    ],

    // Validaciones para exportar plantilla
    exportarPlantilla: [
        param('tipo')
            .isIn(['ventas', 'inventario', 'finanzas', 'usuarios'])
            .withMessage('Tipo de plantilla debe ser: ventas, inventario, finanzas o usuarios')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en dashboard',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = dashboardValidations;