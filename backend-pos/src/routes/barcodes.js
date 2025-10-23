// routes/barcodes.js
const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcodeController');
const barcodeValidations = require('../middleware/validation/barcodeValidations');
const auth = require('../middleware/auth');
const { validationResult } = require('express-validator');

// Aplicar autenticación a todas las rutas
router.use(auth.verifyToken);

// ===== RUTAS DE CÓDIGOS INDIVIDUALES =====

// GET /api/barcodes/barcode/:text - Generar código de barras
router.get(
  '/barcode/:text',
  barcodeValidations.validateGenerateBarcode,
  barcodeValidations.handleValidationErrors,
  barcodeController.generateBarcode
);

// GET /api/barcodes/qr/:text - Generar código QR
router.get(
  '/qr/:text',
  barcodeValidations.validateGenerateQR,
  barcodeValidations.handleValidationErrors,
  barcodeController.generateQR
);

// GET /api/barcodes/label/:productId - Generar PDF etiqueta
router.get(
  '/label/:productId',
  barcodeValidations.validateGenerateLabel,
  barcodeValidations.handleValidationErrors,
  barcodeController.generateLabel
);

// ===== RUTAS DE PROCESAMIENTO =====

// POST /api/barcodes/batch - Generación masiva
router.post(
  '/batch',
  barcodeValidations.validateBatchGenerate,
  barcodeValidations.handleValidationErrors,
  barcodeController.batchGenerate
);

// POST /api/barcodes/decode - Decodificar QR
router.post(
  '/decode',
  barcodeController.decodeQR
);

// GET /api/barcodes/validate/:barcode - Validar formato código barras
router.get(
  '/validate/:barcode',
  barcodeController.validateBarcode
);

// ===== RUTAS DE INFORMACIÓN =====

// GET /api/barcodes/formats - Obtener formatos disponibles
router.get('/formats', (req, res) => {
  const responseHelper = require('../utils/responseHelper');
  responseHelper.success(res, {
    barcode_formats: [
      { id: 'code128', name: 'Code 128', desc: 'Estándar retail' },
      { id: 'code39', name: 'Code 39', desc: 'Alfanumérico' },
      { id: 'ean13', name: 'EAN-13', desc: 'Productos comerciales' },
      { id: 'upca', name: 'UPC-A', desc: 'Estados Unidos' }
    ],
    qr_capabilities: {
      max_length: 1000,
      error_correction: ['L', 'M', 'Q', 'H'],
      data_types: ['text', 'json', 'url']
    },
    label_sizes: {
      small: '50x25mm',
      medium: '75x38mm', 
      large: '100x50mm',
      thermal: '80mm rollo'
    }
  });
});

// GET /api/barcodes/health - Health check del servicio
router.get('/health', (req, res) => {
  const responseHelper = require('../utils/responseHelper');
  responseHelper.success(res, {
    service: 'barcode-generator',
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: [
      'barcode-generation',
      'qr-generation', 
      'label-printing',
      'batch-processing',
      'cloudinary-integration'
    ]
  });
});

module.exports = router;