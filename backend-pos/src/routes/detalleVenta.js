const express = require('express');
const router = express.Router();
const detalleVentaController = require('../controllers/detalleVentaController');
const authMiddleware = require('../middleware/auth');
const validation = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// ==================== RUTAS DE CONSULTA ====================

// GET /detalle-venta - Obtener todos los detalles (con filtros opcionales)
router.get('/',
    detalleVentaValidations.query,
    validation.handleValidationErrors,
    detalleVentaController.getAll
);

// GET /detalle-venta/venta/:id_venta - Obtener detalles por venta específica
router.get('/venta/:id_venta',
    detalleVentaValidations.getByVenta,
    validation.handleValidationErrors,
    detalleVentaController.getByVenta
);

// GET /detalle-venta/producto/:id_producto - Obtener detalles por producto
router.get('/producto/:id_producto',
    detalleVentaValidations.getByProducto,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    detalleVentaController.getByProducto
);

// GET /detalle-venta/:id - Obtener detalle por ID
router.get('/:id',
    detalleVentaValidations.getById,
    validation.handleValidationErrors,
    detalleVentaController.getById
);

// GET /detalle-venta/estadisticas/producto/:id_producto - Estadísticas de ventas por producto
router.get('/estadisticas/producto/:id_producto',
    detalleVentaValidations.getByProducto,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    detalleVentaController.getEstadisticasProducto
);

// GET /detalle-venta/estadisticas/venta/:id_venta - Resumen estadístico de una venta
router.get('/estadisticas/venta/:id_venta',
    detalleVentaValidations.getByVenta,
    validation.handleValidationErrors,
    detalleVentaController.getEstadisticasVenta
);

// ==================== RUTAS DE OPERACIONES ====================

// POST /detalle-venta - Crear nuevo detalle de venta
router.post('/',
    detalleVentaValidations.create,
    validation.handleValidationErrors,
    detalleVentaController.create
);

// POST /detalle-venta/multiple - Crear múltiples detalles de venta
router.post('/multiple',
    detalleVentaValidations.createMultiple,
    validation.handleValidationErrors,
    detalleVentaController.createMultiple
);

// PUT /detalle-venta/:id - Actualizar detalle de venta
router.put('/:id',
    detalleVentaValidations.update,
    validation.handleValidationErrors,
    detalleVentaController.update
);

// PATCH /detalle-venta/:id - Actualización parcial del detalle
router.patch('/:id',
    detalleVentaValidations.patch,
    validation.handleValidationErrors,
    detalleVentaController.patch
);

// DELETE /detalle-venta/:id - Eliminar detalle de venta
router.delete('/:id',
    detalleVentaValidations.delete,
    validation.handleValidationErrors,
    detalleVentaController.delete
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// GET /detalle-venta/reporte/ventas-productos - Reporte de ventas por productos
router.get('/reporte/ventas-productos',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    detalleVentaValidations.reporteVentasProductos,
    validation.handleValidationErrors,
    detalleVentaController.getReporteVentasProductos
);

// GET /detalle-venta/reporte/top-productos - Top productos más vendidos
router.get('/reporte/top-productos',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    detalleVentaValidations.reporteTopProductos,
    validation.handleValidationErrors,
    detalleVentaController.getReporteTopProductos
);

// POST /detalle-venta/validar-stock - Validar stock antes de crear detalle
router.post('/validar-stock',
    detalleVentaValidations.validarStock,
    validation.handleValidationErrors,
    detalleVentaController.validarStock
);

// Rutas principales
router.get('/', 
  detalleVentaValidations.query, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.getAll
);

router.get('/:id', 
  detalleVentaValidations.getById, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.getById
);

router.post('/', 
  detalleVentaValidations.create, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.create
);

router.put('/:id', 
  detalleVentaValidations.update, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.update
);

router.patch('/:id', 
  detalleVentaValidations.patch, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.patch
);

router.delete('/:id', 
  detalleVentaValidations.delete, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.delete
);

// Rutas específicas
router.get('/venta/:id_venta', 
  detalleVentaValidations.getByVenta, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.getByVenta
);

router.get('/producto/:id_producto', 
  detalleVentaValidations.getByProducto, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.getByProducto
);

router.post('/multiple', 
  detalleVentaValidations.createMultiple, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.createMultiple
);

// Rutas de reportes
router.get('/reporte/ventas-productos', 
  detalleVentaValidations.reporteVentasProductos, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.reporteVentasProductos
);

router.get('/reporte/top-productos', 
  detalleVentaValidations.reporteTopProductos, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.reporteTopProductos
);

// Ruta de validación
router.post('/validar-stock', 
  detalleVentaValidations.validarStock, 
  detalleVentaValidations.handleValidationErrors, 
  detalleVentaController.validarStock
);

module.exports = router;