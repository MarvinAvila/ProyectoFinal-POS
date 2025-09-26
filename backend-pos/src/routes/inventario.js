const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /inventario/historial - Obtener historial de inventario
router.get('/historial', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), inventarioController.historial);

// POST /inventario/ajuste - Realizar ajuste de inventario
router.post('/ajuste', authMiddleware.requireRole(['admin', 'dueno']), inventarioController.ajuste);

module.exports = router;