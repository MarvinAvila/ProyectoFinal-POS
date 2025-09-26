const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /usuarios - Obtener usuarios (con paginación y búsqueda)
router.get('/', authMiddleware.requireRole(['admin', 'dueno']), usuarioController.getAll);

// GET /usuarios/:id - Obtener usuario por ID
router.get('/:id', authMiddleware.requireRole(['admin', 'dueno']), usuarioController.getById);

// POST /usuarios - Crear nuevo usuario
router.post('/', authMiddleware.requireRole(['admin', 'dueno']), usuarioController.create);

// PUT /usuarios/:id - Actualizar usuario
router.put('/:id', authMiddleware.requireRole(['admin', 'dueno']), usuarioController.update);

// PATCH /usuarios/:id/active - Activar/desactivar usuario
router.patch('/:id/active', authMiddleware.requireRole(['admin', 'dueno']), usuarioController.setActive);

// DELETE /usuarios/:id - Eliminar usuario
router.delete('/:id', authMiddleware.requireRole(['admin', 'dueno']), usuarioController.delete);

module.exports = router;