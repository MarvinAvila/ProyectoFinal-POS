const express = require("express");
const router = express.Router();
const productoController = require("../controllers/productoController");
const authMiddleware = require("../middleware/auth");
const upload = require('../middleware/uploadMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /productos - Obtener productos (con búsqueda y filtros avanzados)
router.get("/", productoController.getAll);

// GET /productos/stats - Obtener estadísticas de productos
router.get("/stats", productoController.getStats);

// GET /productos/:id/codes - Obtener códigos de un producto
router.get(
  "/:id/codes",
  productoController.getProductCodes
);

// POST /productos/:id/regenerate-codes - Regenerar códigos
router.post(
  "/:id/regenerate-codes",
  authMiddleware.requireRole(["admin", "dueno"]),
  productoController.regenerateCodes
);

// GET /productos/:id - Obtener producto por ID
router.get("/:id", productoController.getById);

// POST /productos - Crear nuevo producto
router.post(
  "/",
  authMiddleware.requireRole(["admin", "dueno"]),
  upload.single("imagen"),
  productoController.create
);

// PUT /productos/:id - Actualizar producto completo
router.put(
  "/:id",
  authMiddleware.requireRole(["admin", "dueno"]),
  upload.single("imagen"),
  productoController.update
);

// DELETE /productos/:id - Eliminar producto
router.delete(
  "/:id",
  authMiddleware.requireRole(["admin", "dueno"]),
  productoController.delete
);

module.exports = router;