const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const authMiddleware = require('../middleware/auth');
const inventarioValidations = require('../middleware/validation/inventario');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /inventario/historial - Obtener historial de inventario con filtros
router.get('/historial', 
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    inventarioValidations.historial,
    inventarioValidations.handleValidationErrors,
    inventarioController.historial
);

// GET /inventario/estadisticas - Obtener estadísticas del inventario
router.get('/estadisticas', 
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    inventarioValidations.estadisticas,
    inventarioValidations.handleValidationErrors,
    inventarioController.estadisticas
);

// POST /inventario/ajuste - Realizar ajuste de inventario
router.post('/ajuste', 
    authMiddleware.requireRole(['admin', 'dueno']),
    inventarioValidations.ajuste,
    inventarioValidations.handleValidationErrors,
    inventarioController.ajuste
);

module.exports = router;