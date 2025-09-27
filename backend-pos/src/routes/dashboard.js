const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const validation = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// ==================== RUTAS PRINCIPALES ====================

// GET /dashboard/resumen - Resumen general completo del dashboard
router.get('/resumen',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno', 'vendedor']),
    dashboardController.getResumenCompleto
);

// GET /dashboard/metricas-rapidas - Métricas rápidas para widgets
router.get('/metricas-rapidas',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno', 'vendedor']),
    dashboardController.getMetricasRapidas
);

// GET /dashboard/estadisticas-avanzadas - Estadísticas detalladas por periodo
router.get('/estadisticas-avanzadas',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    validation.dashboard.estadisticasAvanzadas,
    validation.handleValidationErrors,
    dashboardController.getEstadisticasAvanzadas
);

// GET /dashboard/alertas - Alertas prioritarias para el dashboard
router.get('/alertas',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno', 'vendedor']),
    dashboardController.getAlertasDashboard
);

// ==================== RUTAS ESPECÍFICAS ====================

// GET /dashboard/ventas - Datos específicos de ventas
router.get('/ventas',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    validation.dashboard.ventas,
    validation.handleValidationErrors,
    dashboardController.getDatosVentas
);

// GET /dashboard/inventario - Estado del inventario
router.get('/inventario',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    dashboardController.getEstadoInventario
);

// GET /dashboard/finanzas - Métricas financieras
router.get('/finanzas',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    validation.dashboard.finanzas,
    validation.handleValidationErrors,
    dashboardController.getMetricasFinancieras
);

// GET /dashboard/usuarios - Estadísticas de usuarios
router.get('/usuarios',
    authMiddleware.requireRole(['admin', 'dueno']),
    dashboardController.getEstadisticasUsuarios
);

// ==================== RUTAS DE REPORTES RÁPIDOS ====================

// GET /dashboard/reporte-ventas-diarias - Reporte rápido de ventas del día
router.get('/reporte-ventas-diarias',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    dashboardController.getReporteVentasDiarias
);

// GET /dashboard/reporte-stock - Reporte rápido de estado de stock
router.get('/reporte-stock',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    dashboardController.getReporteStock
);

// GET /dashboard/reporte-alertas - Reporte consolidado de alertas
router.get('/reporte-alertas',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    dashboardController.getReporteAlertas
);

// ==================== RUTAS DE EXPORTACIÓN ====================

// POST /dashboard/exportar - Exportar datos del dashboard
router.post('/exportar',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    validation.dashboard.exportar,
    validation.handleValidationErrors,
    dashboardController.exportarDashboard
);

// GET /dashboard/exportar-plantilla - Descargar plantilla de reporte
router.get('/exportar-plantilla/:tipo',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    validation.dashboard.exportarPlantilla,
    validation.handleValidationErrors,
    dashboardController.descargarPlantillaReporte
);

module.exports = router;