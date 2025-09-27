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
    comprobanteValidations.query,
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
    comprobanteValidations.getByVenta,
    validation.handleValidationErrors,
    comprobanteController.getByVenta
);

// GET /comprobantes/tipo/:tipo - Obtener comprobantes por tipo
router.get('/tipo/:tipo',
    comprobanteValidations.getByTipo,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    comprobanteController.getByTipo
);

// GET /comprobantes/:id - Obtener comprobante por ID (sin contenido)
router.get('/:id',
    comprobanteValidations.getById,
    validation.handleValidationErrors,
    comprobanteController.getById
);

// GET /comprobantes/:id/contenido - Obtener contenido del comprobante
router.get('/:id/contenido',
    comprobanteValidations.getById,
    validation.handleValidationErrors,
    comprobanteController.getContenido
);

// GET /comprobantes/:id/descargar - Descargar comprobante
router.get('/:id/descargar',
    comprobanteValidations.getById,
    validation.handleValidationErrors,
    comprobanteController.descargarComprobante
);

// ==================== RUTAS DE CREACIÓN ====================

// POST /comprobantes - Crear nuevo comprobante
router.post('/',
    comprobanteValidations.create,
    validation.handleValidationErrors,
    comprobanteController.create
);

// POST /comprobantes/generar-ticket - Generar ticket automático
router.post('/generar-ticket',
    comprobanteValidations.generarTicket,
    validation.handleValidationErrors,
    comprobanteController.generarTicketAutomatico
);

// POST /comprobantes/generar-factura - Generar factura automática
router.post('/generar-factura',
    comprobanteValidations.generarFactura,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente']),
    comprobanteController.generarFactura
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// DELETE /comprobantes/:id - Eliminar comprobante
router.delete('/:id',
    comprobanteValidations.delete,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'dueno']),
    comprobanteController.delete
);

// POST /comprobantes/:id/reenviar - Reenviar comprobante por email
router.post('/:id/reenviar',
    comprobanteValidations.reenviar,
    validation.handleValidationErrors,
    authMiddleware.requireRole(['admin', 'gerente']),
    comprobanteController.reenviarComprobante
);

module.exports = router;