const express = require('express');
const router = express.Router();
const detalleVentaController = require('../controllers/detalleVentaController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /detalle-venta - Obtener todos los detalles (con filtros opcionales)
router.get('/', detalleVentaController.getAll);

// GET /detalle-venta/:id - Obtener detalle por ID
router.get('/:id', detalleVentaController.getById);

// POST /detalle-venta - Crear nuevo detalle de venta
router.post('/', detalleVentaController.create);

// PUT /detalle-venta/:id - Actualizar detalle de venta
router.put('/:id', detalleVentaController.update);

// DELETE /detalle-venta/:id - Eliminar detalle de venta
router.delete('/:id', detalleVentaController.delete);

module.exports = router;