const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middleware/auth');
const validation = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// ==================== RUTAS PÚBLICAS (para usuarios autenticados) ====================

// GET /categorias - Obtener todas las categorías con paginación y búsqueda
router.get('/', 
    validation.categoria.query,
    validation.handleValidationErrors,
    categoriaController.getAll
);

// GET /categorias/estadisticas - Obtener estadísticas de categorías
router.get('/estadisticas/globales',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    categoriaController.getEstadisticas
);

// GET /categorias/:id - Obtener categoría por ID
router.get('/:id',
    validation.categoria.getById,
    validation.handleValidationErrors,
    categoriaController.getById
);

// GET /categorias/:id/productos - Obtener productos de una categoría
router.get('/:id/productos',
    validation.categoria.getById,
    validation.handleValidationErrors,
    categoriaController.getProductos
);

// GET /categorias/:id/estadisticas - Obtener estadísticas específicas de la categoría
router.get('/:id/estadisticas',
    validation.categoria.getById,
    validation.handleValidationErrors,
    categoriaController.getEstadisticasCategoria
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// POST /categorias - Crear nueva categoría
router.post('/',
    authMiddleware.requireRole(['admin', 'dueno']),
    validation.categoria.create,
    validation.handleValidationErrors,
    categoriaController.create
);

// PUT /categorias/:id - Actualizar categoría
router.put('/:id',
    authMiddleware.requireRole(['admin', 'dueno']),
    validation.categoria.update,
    validation.handleValidationErrors,
    categoriaController.update
);

// PATCH /categorias/:id - Actualización parcial de categoría
router.patch('/:id',
    authMiddleware.requireRole(['admin', 'dueno']),
    validation.categoria.patch,
    validation.handleValidationErrors,
    categoriaController.patch
);

// DELETE /categorias/:id - Eliminar categoría
router.delete('/:id',
    authMiddleware.requireRole(['admin', 'dueno']),
    validation.categoria.delete,
    validation.handleValidationErrors,
    categoriaController.delete
);

// POST /categorias/:id/productos/mover - Mover productos a otra categoría
router.post('/:id/productos/mover',
    authMiddleware.requireRole(['admin', 'dueno']),
    validation.categoria.moverProductos,
    validation.handleValidationErrors,
    categoriaController.moverProductos
);

module.exports = router;