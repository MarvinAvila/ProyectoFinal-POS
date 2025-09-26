backend-pos/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productoController.js
│   │   ├── ventaController.js
│   │   ├── proveedorController.js
│   │   └── reporteController.js
│   ├── models/
│   │   ├── Usuario.js
│   │   ├── Producto.js
│   │   ├── Venta.js
│   │   ├── Proveedor.js
│   │   └── Categoria.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── productos.js
│   │   ├── ventas.js
│   │   ├── proveedores.js
│   │   └── reportes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── config/
│   │   └── database.js
│   ├── utils/
│   │   └── helpers.js
│   └── validations/
│       ├── authValidations.js
│       └── productoValidations.js
├── tests/
├── server.js
├── .env
├── .gitignore
├── package.json
└── README.md