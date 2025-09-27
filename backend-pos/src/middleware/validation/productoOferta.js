const { body, param, query, validationResult } = require('express-validator');

const productoOfertaValidations = {
    // Validaciones para consulta general
    getAll: [
        query('activa')
            .optional()
            .isBoolean()
            .withMessage('Activa debe ser true o false'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100')
    ],

    // Validaciones para obtener ofertas por producto
    getOffersByProduct: [
        param('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        query('solo_activas')
            .optional()
            .isBoolean()
            .withMessage('solo_activas debe ser true o false'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100')
    ],

    // Validaciones para obtener productos por oferta
    getProductsByOffer: [
        param('id_oferta')
            .isInt({ min: 1 })
            .withMessage('ID de oferta inválido'),
        
        query('con_precio')
            .optional()
            .isBoolean()
            .withMessage('con_precio debe ser true o false'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100')
    ],

    // Validaciones para obtener ofertas activas por producto
    getActiveOffersByProduct: [
        param('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido')
    ],

    // Validaciones para asignar producto
    assign: [
        body('id_producto')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('id_oferta')
            .isInt({ min: 1 })
            .withMessage('ID de oferta inválido')
    ],

    // Validaciones para desasignar producto
    unassign: [
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
                message: 'Errores de validación en producto-oferta',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = productoOfertaValidations;