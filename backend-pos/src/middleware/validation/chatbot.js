const { body, validationResult } = require('express-validator');
const responseHelper = require('../../utils/responseHelper');
const logger = require('../../utils/logger');

const chatbotValidations = {
    processMessage: [
        body('message')
            .trim()
            .notEmpty().withMessage('El mensaje no puede estar vacío.')
            .isString().withMessage('El mensaje debe ser una cadena de texto.')
            .isLength({ min: 1, max: 500 }).withMessage('El mensaje debe tener entre 1 y 500 caracteres.'),
    ],

    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Errores de validación en chatbot request', { errors: errors.array() });
            return responseHelper.error(res, 'Datos de entrada inválidos', 400, errors.array());
        }
        next();
    }
};

module.exports = chatbotValidations;