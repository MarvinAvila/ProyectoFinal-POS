const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /categorias - Obtener todas las categorías
router.get('/', categoriaController.getAll);

// GET /categorias/:id - Obtener categoría por ID
router.get('/:id', categoriaController.getById);

// POST /categorias - Crear nueva categoría
router.post('/', authMiddleware.requireRole(['admin', 'dueno']), categoriaController.create);

// PUT /categorias/:id - Actualizar categoría
router.put('/:id', authMiddleware.requireRole(['admin', 'dueno']), categoriaController.update);

// DELETE /categorias/:id - Eliminar categoría
router.delete('/:id', authMiddleware.requireRole(['admin', 'dueno']), categoriaController.delete);

module.exports = router;