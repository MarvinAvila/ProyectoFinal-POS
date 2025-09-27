const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');
const authMiddleware = require('../middleware/auth');
const proveedorValidations = require('../middleware/validation/proveedor');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /proveedores - Obtener todos los proveedores con filtros
router.get('/', 
    proveedorValidations.getAll,
    proveedorValidations.handleValidationErrors,
    proveedorController.getAll
);

// GET /proveedores/:id - Obtener proveedor por ID
router.get('/:id', 
    proveedorValidations.getById,
    proveedorValidations.handleValidationErrors,
    proveedorController.getById
);

// GET /proveedores/:id/productos - Obtener productos de un proveedor específico
router.get('/:id/productos', 
    proveedorValidations.getProductos,
    proveedorValidations.handleValidationErrors,
    proveedorController.getProductos
);

// GET /proveedores/:id/estadisticas - Obtener estadísticas de un proveedor
router.get('/:id/estadisticas', 
    proveedorValidations.getEstadisticas,
    proveedorValidations.handleValidationErrors,
    proveedorController.getEstadisticas
);

// POST /proveedores - Crear nuevo proveedor
router.post('/', 
    authMiddleware.requireRole(['admin', 'dueno']),
    proveedorValidations.create,
    proveedorValidations.handleValidationErrors,
    proveedorController.create
);

// PUT /proveedores/:id - Actualizar proveedor completo
router.put('/:id', 
    authMiddleware.requireRole(['admin', 'dueno']),
    proveedorValidations.update,
    proveedorValidations.handleValidationErrors,
    proveedorController.update
);

// DELETE /proveedores/:id - Eliminar proveedor
router.delete('/:id', 
    authMiddleware.requireRole(['admin', 'dueno']),
    proveedorValidations.delete,
    proveedorValidations.handleValidationErrors,
    proveedorController.delete
);

module.exports = router;