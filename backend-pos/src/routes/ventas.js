const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /ventas - Obtener todas las ventas
router.get('/', ventaController.getAll);

// GET /ventas/:id - Obtener venta por ID (con detalles)
router.get('/:id', ventaController.getById);

// POST /ventas - Crear nueva venta
router.post('/', ventaController.create);

// DELETE /ventas/:id - Eliminar venta
router.delete('/:id', authMiddleware.requireRole(['admin', 'dueno']), ventaController.delete);

module.exports = router;