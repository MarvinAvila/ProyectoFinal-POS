const express = require('express');
const router = express.Router();
const ofertaController = require('../controllers/ofertaController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /ofertas - Obtener todas las ofertas
router.get('/', ofertaController.getAll);

// GET /ofertas/:id - Obtener oferta por ID
router.get('/:id', ofertaController.getById);

// POST /ofertas - Crear nueva oferta
router.post('/', authMiddleware.requireRole(['admin', 'dueno']), ofertaController.create);

// PUT /ofertas/:id - Actualizar oferta
router.put('/:id', authMiddleware.requireRole(['admin', 'dueno']), ofertaController.update);

// DELETE /ofertas/:id - Eliminar oferta
router.delete('/:id', authMiddleware.requireRole(['admin', 'dueno']), ofertaController.delete);

// POST /ofertas/asignar-producto - Asignar producto a oferta
router.post('/asignar-producto', authMiddleware.requireRole(['admin', 'dueno']), ofertaController.asignarProducto);

module.exports = router;