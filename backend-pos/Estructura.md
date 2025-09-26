# Estructura del Backend - Sistema Punto de Venta

backend-pos/
├── src/
│   ├── config/
│   │   └── database.js ✅
│   ├── controllers/ ✅
│   │   ├── alertaController.js
│   │   ├── authController.js
│   │   ├── categoriaController.js
│   │   ├── comprobanteController.js
│   │   ├── dashboardController.js
│   │   ├── detalleVentaController.js
│   │   ├── inventarioController.js
│   │   ├── ofertaController.js
│   │   ├── productoController.js
│   │   ├── productoOfertaController.js
│   │   ├── proveedorController.js
│   │   ├── reporteController.js
│   │   ├── usuarioController.js
│   │   └── ventaController.js
│   ├── middleware/ ✅
│   │   └── auth.js
│   ├── models/ ✅
│   │   ├── Alerta.js
│   │   ├── Categoria.js
│   │   ├── Comprobante.js
│   │   ├── DetalleVenta.js
│   │   ├── HistorialInventario.js
│   │   ├── Oferta.js
│   │   ├── Producto.js
│   │   ├── ProductoOferta.js
│   │   ├── Proveedor.js
│   │   ├── Reporte.js
│   │   ├── Usuario.js
│   │   └── Venta.js
│   ├── routes/ ✅
│   │   ├── alertas.js
│   │   ├── auth.js
│   │   ├── categorias.js
│   │   ├── comprobantes.js
│   │   ├── dashboard.js
│   │   ├── detalleVenta.js
│   │   ├── inventario.js
│   │   ├── ofertas.js
│   │   ├── productoOferta.js
│   │   ├── productos.js
│   │   ├── proveedores.js
│   │   ├── reportes.js
│   │   ├── usuarios.js
│   │   └── ventas.js
│   ├── utils/
│   │   └── helpers.js ⚠️ (Parcial)
│   └── validations/
│       ├── authValidations.js ⚠️ (Parcial)
│       └── productoValidations.js ⚠️ (Parcial)
├── tests/ ❌ (Falta desarrollar)
├── server.js ❌ (Falta desarrollar)
├── .env ❌ (Falta desarrollar)
├── .gitignore ❌ (Falta desarrollar)
├── package.json ⚠️ (Probablemente existe pero necesita dependencias)
└── README.md ❌ (Falta desarrollar)

## Leyenda:
✅ = Completado
⚠️ = Parcialmente completado
❌ = Faltante