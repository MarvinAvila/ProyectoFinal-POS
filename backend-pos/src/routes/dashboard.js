const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /dashboard/resumen - Resumen general del dashboard
router.get('/resumen', dashboardController.resumen);

// GET /dashboard/top-productos - Top 5 productos más vendidos
router.get('/top-productos', dashboardController.topProductos);

module.exports = router;