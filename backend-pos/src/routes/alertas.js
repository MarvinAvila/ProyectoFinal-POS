const express = require('express');
const router = express.Router();
const alertaController = require('../controllers/alertaController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /alertas - Obtener todas las alertas
router.get('/', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.getAll);

// GET /alertas/pendientes - Obtener alertas pendientes
router.get('/pendientes', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.getPendientes);

// PATCH /alertas/:id/atendida - Marcar alerta como atendida
router.patch('/:id/atendida', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.marcarAtendida);

module.exports = router;