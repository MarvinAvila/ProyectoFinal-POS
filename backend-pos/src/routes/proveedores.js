const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /proveedores - Obtener todos los proveedores
router.get('/', proveedorController.getAll);

// GET /proveedores/:id - Obtener proveedor por ID
router.get('/:id', proveedorController.getById);

// POST /proveedores - Crear nuevo proveedor
router.post('/', authMiddleware.requireRole(['admin', 'dueno']), proveedorController.create);

// PUT /proveedores/:id - Actualizar proveedor
router.put('/:id', authMiddleware.requireRole(['admin', 'dueno']), proveedorController.update);

// DELETE /proveedores/:id - Eliminar proveedor
router.delete('/:id', authMiddleware.requireRole(['admin', 'dueno']), proveedorController.delete);

module.exports = router;