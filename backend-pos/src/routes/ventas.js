const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const authMiddleware = require('../middleware/auth');
const ventaValidations = require('../middleware/validation/venta');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /ventas - Obtener todas las ventas con filtros
router.get('/', 
    ventaValidations.getAll,
    ventaValidations.handleValidationErrors,
    ventaController.getAll
);

// GET /ventas/estadisticas - Obtener estadísticas de ventas
router.get('/estadisticas', 
    ventaValidations.getEstadisticas,
    ventaValidations.handleValidationErrors,
    ventaController.getEstadisticas
);

// GET /ventas/top-productos - Obtener los productos más vendidos
router.get('/top-productos', 
    authMiddleware.requireRole(['admin', 'gerente']), // 👈 opcional, ambos pueden acceder
    ventaController.topProductos
);

// GET /ventas/dia - Obtener las ventas del día
router.get(
  '/dia',
  authMiddleware.requireRole(['admin', 'gerente']),
  ventaController.ventasDelDia
);

// GET /ventas/:id - Obtener venta por ID (con detalles)
router.get('/:id', 
    ventaValidations.getById,
    ventaValidations.handleValidationErrors,
    ventaController.getById
);


// POST /ventas - Crear nueva venta
router.post('/', 
    ventaValidations.create,
    ventaValidations.handleValidationErrors,
    ventaController.create
);

// DELETE /ventas/:id - Eliminar venta
router.delete('/:id', 
    authMiddleware.requireRole(['admin', 'dueno']),
    ventaValidations.delete,
    ventaValidations.handleValidationErrors,
    ventaController.delete
);

module.exports = router;