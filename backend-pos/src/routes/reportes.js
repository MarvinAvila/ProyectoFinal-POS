const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const authMiddleware = require('../middleware/auth');
const reporteValidations = require('../middleware/validation/reporte');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /reportes - Obtener todos los reportes con filtros
router.get('/', 
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    reporteValidations.getAll,
    reporteValidations.handleValidationErrors,
    reporteController.getAll
);

// GET /reportes/estadisticas - Obtener estadísticas de reportes
router.get('/estadisticas', 
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    reporteValidations.getEstadisticasReportes,
    reporteValidations.handleValidationErrors,
    reporteController.getEstadisticasReportes
);

// GET /reportes/:id - Obtener reporte por ID
router.get('/:id', 
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    reporteValidations.getById,
    reporteValidations.handleValidationErrors,
    reporteController.getById
);

// POST /reportes/generar - Generar nuevo reporte
router.post('/generar', 
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    reporteValidations.generarReporte,
    reporteValidations.handleValidationErrors,
    reporteController.generarReporte
);

// DELETE /reportes/:id - Eliminar reporte
router.delete('/:id', 
    authMiddleware.requireRole(['admin', 'dueno']),
    reporteValidations.delete,
    reporteValidations.handleValidationErrors,
    reporteController.delete
);

module.exports = router;