const express = require('express');
const router = express.Router();
const detalleVentaController = require('../controllers/detalleVentaController');
const authMiddleware = require('../middleware/auth');
const detalleVentaValidations = require('../middleware/validation/detalleVenta');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// ==================== RUTAS DE CONSULTA ====================

// GET /detalle-venta - Obtener todos los detalles
router.get('/',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno', 'vendedor']),
    ...detalleVentaValidations.query, // COMENTADO TEMPORALMENTE
    detalleVentaValidations.handleValidationErrors, // COMENTADO TEMPORALMENTE
    detalleVentaController.getAll
);

// GET /detalle-venta/venta/:id_venta - Obtener detalles por venta
router.get('/venta/:id_venta',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno', 'vendedor']),
    ...detalleVentaValidations.getByVenta,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.getByVenta
);

// GET /detalle-venta/producto/:id_producto - Obtener detalles por producto
router.get('/producto/:id_producto',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    ...detalleVentaValidations.getByProducto,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.getByProducto
);

// GET /detalle-venta/:id - Obtener detalle por ID
router.get('/:id',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno', 'vendedor']),
    ...detalleVentaValidations.getById,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.getById
);

// GET /detalle-venta/estadisticas/producto/:id_producto - Estadísticas por producto
router.get('/estadisticas/producto/:id_producto',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    ...detalleVentaValidations.getByProducto,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.getEstadisticasProducto
);

// GET /detalle-venta/estadisticas/venta/:id_venta - Estadísticas por venta
router.get('/estadisticas/venta/:id_venta',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno', 'vendedor']),
    ...detalleVentaValidations.getByVenta,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.getEstadisticasVenta
);

// ==================== RUTAS DE CREACIÓN ====================

// POST /detalle-venta - Crear nuevo detalle
router.post('/',
    authMiddleware.requireRole(['admin', 'gerente', 'vendedor']),
    ...detalleVentaValidations.create,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.create
);

// POST /detalle-venta/multiple - Crear múltiples detalles
router.post('/multiple',
    authMiddleware.requireRole(['admin', 'gerente', 'vendedor']),
    ...detalleVentaValidations.createMultiple,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.createMultiple
);

// ==================== RUTAS DE ACTUALIZACIÓN ====================

// PUT /detalle-venta/:id - Actualizar detalle completo
router.put('/:id',
    authMiddleware.requireRole(['admin', 'gerente']),
    ...detalleVentaValidations.update,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.update
);

// PATCH /detalle-venta/:id - Actualización parcial
router.patch('/:id',
    authMiddleware.requireRole(['admin', 'gerente']),
    ...detalleVentaValidations.patch,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.patch
);

// ==================== RUTAS DE ELIMINACIÓN ====================

// DELETE /detalle-venta/:id - Eliminar detalle
router.delete('/:id',
    authMiddleware.requireRole(['admin', 'gerente']),
    ...detalleVentaValidations.delete,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.delete
);

// ==================== RUTAS DE REPORTES ====================

// GET /detalle-venta/reporte/ventas-productos - Reporte de ventas por productos
router.get('/reporte/ventas-productos',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    ...detalleVentaValidations.reporteVentasProductos,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.getReporteVentasProductos
);

// GET /detalle-venta/reporte/top-productos - Top productos más vendidos
router.get('/reporte/top-productos',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    ...detalleVentaValidations.reporteTopProductos,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.getReporteTopProductos
);

// ==================== RUTAS DE VALIDACIÓN ====================

// POST /detalle-venta/validar-stock - Validar stock
router.post('/validar-stock',
    authMiddleware.requireRole(['admin', 'gerente', 'vendedor']),
    ...detalleVentaValidations.validarStock,
    detalleVentaValidations.handleValidationErrors,
    detalleVentaController.validarStock
);

module.exports = router;