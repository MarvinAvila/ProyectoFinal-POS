// middleware/validation/barcodeValidations.js
const { body, param, query, validationResult } = require('express-validator'); 
const responseHelper = require('../../utils/responseHelper');

const barcodeValidations = {
  
  // Validación para generar código de barras individual
  validateGenerateBarcode: [
    param('text')
      .notEmpty()
      .withMessage('El texto para el código de barras es requerido')
      .isLength({ min: 1, max: 50 })
      .withMessage('El texto debe tener entre 1 y 50 caracteres')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('Solo se permiten letras, números, guiones y guiones bajos')
  ],

  // Validación para generar QR individual
  validateGenerateQR: [
    param('text')
      .notEmpty()
      .withMessage('El texto para el QR es requerido')
      .isLength({ min: 1, max: 1000 })
      .withMessage('El texto debe tener entre 1 y 1000 caracteres')
  ],

  // Validación para generar etiqueta
  validateGenerateLabel: [
    param('productId')
      .isInt({ min: 1 })
      .withMessage('ID de producto inválido')
  ],

  // Validación para generación masiva
  validateBatchGenerate: [
    body('products')
      .isArray({ min: 1, max: 100 })
      .withMessage('Se requiere un array de productos (1-100)'),
    
    body('products.*.id_producto')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ID de producto inválido'),
    
    body('products.*.codigo_barra')
      .notEmpty()
      .withMessage('Código de barras requerido para cada producto'),
    
    body('products.*.nombre')
      .notEmpty()
      .withMessage('Nombre requerido para cada producto'),
    
    body('options')
      .optional()
      .isObject()
      .withMessage('Opciones deben ser un objeto')
  ],

  // Validación para regenerar códigos
  validateRegenerateCodes: [
    param('productId')
      .isInt({ min: 1 })
      .withMessage('ID de producto inválido'),
    
    body('newBarcode')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('El nuevo código de barras debe tener entre 1 y 50 caracteres')
  ],

  // Middleware para manejar errores de validación
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req); // ← AHORA validationResult está definido
    if (!errors.isEmpty()) {
      return responseHelper.error(res, 'Errores de validación', 400, {
        errors: errors.array()
      });
    }
    next();
  }
};

module.exports = barcodeValidations;