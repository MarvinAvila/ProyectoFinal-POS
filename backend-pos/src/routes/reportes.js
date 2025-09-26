const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /reportes - Obtener todos los reportes
router.get('/', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), reporteController.getAll);

// GET /reportes/:id - Obtener reporte por ID
router.get('/:id', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), reporteController.getById);

// POST /reportes/generar - Generar nuevo reporte
router.post('/generar', authMiddleware.requireRole(['admin', 'gerente', 'dueno']), reporteController.generarReporte);

// DELETE /reportes/:id - Eliminar reporte
router.delete('/:id', authMiddleware.requireRole(['admin', 'dueno']), reporteController.delete);

module.exports = router;