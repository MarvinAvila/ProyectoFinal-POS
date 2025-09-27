const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middleware/auth');
const categoriaValidations = require('../middleware/validation/categoria'); // ← Cambiar nombre

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// ==================== RUTAS PÚBLICAS (para usuarios autenticados) ====================

// GET /categorias - Obtener todas las categorías con paginación y búsqueda
router.get('/', 
    categoriaValidations.query, // ← Usar directamente, sin .categoria
    categoriaValidations.handleValidationErrors,
    categoriaController.getAll
);

// GET /categorias/estadisticas - Obtener estadísticas de categorías
router.get('/estadisticas/globales',
    authMiddleware.requireRole(['admin', 'gerente', 'dueno']),
    categoriaController.getEstadisticas
);

// GET /categorias/:id - Obtener categoría por ID
router.get('/:id',
    categoriaValidations.getById,
    categoriaValidations.handleValidationErrors,
    categoriaController.getById
);

// GET /categorias/:id/productos - Obtener productos de una categoría
router.get('/:id/productos',
    categoriaValidations.getById,
    categoriaValidations.handleValidationErrors,
    categoriaController.getProductos
);

// GET /categorias/:id/estadisticas - Obtener estadísticas específicas de la categoría
router.get('/:id/estadisticas',
    categoriaValidations.getById,
    categoriaValidations.handleValidationErrors,
    categoriaController.getEstadisticasCategoria
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// POST /categorias - Crear nueva categoría
router.post('/',
    authMiddleware.requireRole(['admin', 'dueno']),
    categoriaValidations.create,
    categoriaValidations.handleValidationErrors,
    categoriaController.create
);

// PUT /categorias/:id - Actualizar categoría
router.put('/:id',
    authMiddleware.requireRole(['admin', 'dueno']),
    categoriaValidations.update,
    categoriaValidations.handleValidationErrors,
    categoriaController.update
);

// PATCH /categorias/:id - Actualización parcial de categoría
router.patch('/:id',
    authMiddleware.requireRole(['admin', 'dueno']),
    categoriaValidations.patch || [], // ← Si no existe, usar array vacío temporalmente
    categoriaValidations.handleValidationErrors,
    categoriaController.patch
);

// DELETE /categorias/:id - Eliminar categoría
router.delete('/:id',
    authMiddleware.requireRole(['admin', 'dueno']),
    categoriaValidations.delete,
    categoriaValidations.handleValidationErrors,
    categoriaController.delete
);

// POST /categorias/:id/productos/mover - Mover productos a otra categoría
router.post('/:id/productos/mover',
    authMiddleware.requireRole(['admin', 'dueno']),
    categoriaValidations.moverProductos || [], // ← Si no existe, usar array vacío
    categoriaValidations.handleValidationErrors,
    categoriaController.moverProductos
);

module.exports = router;