const express = require('express');
const router = express.Router();
const ofertaController = require('../controllers/ofertaController');
const authMiddleware = require('../middleware/auth');
const ofertaValidations = require('../middleware/validation/oferta');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /ofertas - Obtener todas las ofertas con filtros
router.get('/', 
    ofertaValidations.getAll,
    ofertaValidations.handleValidationErrors,
    ofertaController.getAll
);

// GET /ofertas/:id - Obtener oferta por ID
router.get('/:id', 
    ofertaValidations.getById,
    ofertaValidations.handleValidationErrors,
    ofertaController.getById
);

// GET /ofertas/:id/productos - Obtener productos asociados a una oferta
router.get('/:id/productos', 
    ofertaValidations.getProductosAsociados,
    ofertaValidations.handleValidationErrors,
    ofertaController.getProductosAsociados
);

// POST /ofertas - Crear nueva oferta
router.post('/', 
    authMiddleware.requireRole(['admin', 'dueno']),
    ofertaValidations.create,
    ofertaValidations.handleValidationErrors,
    ofertaController.create
);

// PUT /ofertas/:id - Actualizar oferta completa
router.put('/:id', 
    authMiddleware.requireRole(['admin', 'dueno']),
    ofertaValidations.update,
    ofertaValidations.handleValidationErrors,
    ofertaController.update
);

// DELETE /ofertas/:id - Eliminar oferta
router.delete('/:id', 
    authMiddleware.requireRole(['admin', 'dueno']),
    ofertaValidations.delete,
    ofertaValidations.handleValidationErrors,
    ofertaController.delete
);

// POST /ofertas/asignar-producto - Asignar producto a oferta
router.post('/asignar-producto', 
    authMiddleware.requireRole(['admin', 'dueno']),
    ofertaValidations.asignarProducto,
    ofertaValidations.handleValidationErrors,
    ofertaController.asignarProducto
);

// POST /ofertas/desasignar-producto - Desasignar producto de oferta
router.post('/desasignar-producto', 
    authMiddleware.requireRole(['admin', 'dueno']),
    ofertaValidations.desasignarProducto,
    ofertaValidations.handleValidationErrors,
    ofertaController.desasignarProducto
);

module.exports = router;