const { body, param, query, validationResult } = require('express-validator');

const comprobanteValidations = {
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
            .isIn(['ticket', 'factura', 'nota_credito'])
            .withMessage('El tipo debe ser: ticket, factura o nota_credito')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de comprobante inválido')
    ],

    // Validaciones para obtener por venta
    getByVenta: [
        param('id_venta')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido')
    ],

    // Validaciones para obtener por tipo
    getByTipo: [
        param('tipo')
            .isIn(['ticket', 'factura', 'nota_credito'])
            .withMessage('El tipo debe ser: ticket, factura o nota_credito')
    ],

    // Validaciones para crear comprobante
    create: [
        body('id_venta')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido'),
        
        body('tipo')
            .isIn(['ticket', 'factura', 'nota_credito'])
            .withMessage('El tipo debe ser: ticket, factura o nota_credito'),
        
        body('contenido')
            .notEmpty()
            .withMessage('El contenido del comprobante es obligatorio')
            .isLength({ max: 10000 })
            .withMessage('El contenido no puede exceder 10000 caracteres')
    ],

    // Validaciones para generar ticket automático
    generarTicket: [
        body('id_venta')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido'),
        
        body('formato')
            .optional()
            .isIn(['json', 'html', 'pdf'])
            .withMessage('El formato debe ser: json, html o pdf')
    ],

    // Validaciones para generar factura
    generarFactura: [
        body('id_venta')
            .isInt({ min: 1 })
            .withMessage('ID de venta inválido'),
        
        body('datos_factura')
            .isObject()
            .withMessage('Los datos de factura son obligatorios'),
        
        body('datos_factura.rfc')
            .notEmpty()
            .withMessage('El RFC es obligatorio para factura'),
        
        body('datos_factura.razon_social')
            .notEmpty()
            .withMessage('La razón social es obligatoria para factura')
    ],

    // Validaciones para eliminar comprobante
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de comprobante inválido')
    ],

    // Validaciones para reenviar comprobante
    reenviar: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de comprobante inválido'),
        
        body('email')
            .optional()
            .isEmail()
            .withMessage('El email debe ser válido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en comprobante',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = comprobanteValidations;