const express = require('express');
const router = express.Router();
const alertaController = require('../controllers/alertaController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /alertas - Obtener todas las alertas con filtros y paginación
router.get('/', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.getAll);

// GET /alertas/pendientes - Obtener alertas pendientes
router.get('/pendientes', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.getPendientes);

// GET /alertas/estadisticas - Obtener estadísticas de alertas
router.get('/estadisticas', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.getEstadisticas);

// POST /alertas/stock-bajo - Crear alerta de stock bajo manualmente
router.post('/stock-bajo', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.crearAlertaStockBajo);

// GET /alertas/:id - Obtener alerta por ID
router.get('/:id', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.getById);

// PATCH /alertas/:id/atendida - Marcar alerta como atendida
router.patch('/:id/atendida', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), alertaController.marcarAtendida);

// DELETE /alertas/:id - Eliminar alerta
router.delete('/:id', authMiddleware.requireRole(['admin', 'dueno']), alertaController.delete);

module.exports = router;