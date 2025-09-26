const express = require('express');
const router = express.Router();
const productoOfertaController = require('../controllers/productoOfertaController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /producto-oferta - Obtener todas las relaciones producto-oferta
router.get('/', productoOfertaController.getAll);

// GET /producto-oferta/producto/:id_producto - Obtener ofertas por producto
router.get('/producto/:id_producto', productoOfertaController.getOffersByProduct);

// GET /producto-oferta/oferta/:id_oferta - Obtener productos por oferta
router.get('/oferta/:id_oferta', productoOfertaController.getProductsByOffer);

// POST /producto-oferta/assign - Asignar producto a oferta
router.post('/assign', authMiddleware.requireRole(['admin', 'dueno']), productoOfertaController.assign);

// POST /producto-oferta/unassign - Remover producto de oferta
router.post('/unassign', authMiddleware.requireRole(['admin', 'dueno']), productoOfertaController.unassign);

module.exports = router;