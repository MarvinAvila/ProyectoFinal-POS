const express = require('express');
const router = express.Router();
const comprobanteController = require('../controllers/comprobanteController');
const authMiddleware = require('../middleware/auth');
const validation = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// ==================== RUTAS DE CONSULTA ====================

// GET /comprobantes - Obtener todos los comprobantes con paginación y filtros
router.get('/',
    validation.comprobante.query,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    comprobanteController.getAll
);

// GET /comprobantes/estadisticas - Obtener estadísticas de comprobantes
router.get('/estadisticas',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    comprobanteController.getEstadisticas
);

// GET /comprobantes/venta/:id_venta - Obtener comprobantes por venta
router.get('/venta/:id_venta',
    validation.comprobante.getByVenta,
    validation.handleValidationErrors,
    comprobanteController.getByVenta
);

// GET /comprobantes/tipo/:tipo - Obtener comprobantes por tipo
router.get('/tipo/:tipo',
    validation.comprobante.getByTipo,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    comprobanteController.getByTipo
);

// GET /comprobantes/:id - Obtener comprobante por ID (sin contenido)
router.get('/:id',
    validation.comprobante.getById,
    validation.handleValidationErrors,
    comprobanteController.getById
);

// GET /comprobantes/:id/contenido - Obtener contenido del comprobante
router.get('/:id/contenido',
    validation.comprobante.getById,
    validation.handleValidationErrors,
    comprobanteController.getContenido
);

// GET /comprobantes/:id/descargar - Descargar comprobante
router.get('/:id/descargar',
    validation.comprobante.getById,
    validation.handleValidationErrors,
    comprobanteController.descargarComprobante
);

// ==================== RUTAS DE CREACIÓN ====================

// POST /comprobantes - Crear nuevo comprobante
router.post('/',
    validation.comprobante.create,
    validation.handleValidationErrors,
    comprobanteController.create
);

// POST /comprobantes/generar-ticket - Generar ticket automático
router.post('/generar-ticket',
    validation.comprobante.generarTicket,
    validation.handleValidationErrors,
    comprobanteController.generarTicketAutomatico
);

// POST /comprobantes/generar-factura - Generar factura automática
router.post('/generar-factura',
    validation.comprobante.generarFactura,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente']),
    comprobanteController.generarFactura
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// DELETE /comprobantes/:id - Eliminar comprobante
router.delete('/:id',
    validation.comprobante.delete,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'dueno']),
    comprobanteController.delete
);

// POST /comprobantes/:id/reenviar - Reenviar comprobante por email
router.post('/:id/reenviar',
    validation.comprobante.reenviar,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente']),
    comprobanteController.reenviarComprobante
);

module.exports = router;