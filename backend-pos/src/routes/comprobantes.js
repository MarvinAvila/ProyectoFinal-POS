const express = require('express');
const router = express.Router();
const comprobanteController = require('../controllers/comprobanteController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /comprobantes/venta/:id_venta - Obtener comprobante por venta
router.get('/venta/:id_venta', comprobanteController.getByVenta);

// POST /comprobantes - Crear nuevo comprobante
router.post('/', comprobanteController.create);

module.exports = router;