// app.js
// Carga dotenv solo si NO estamos en modo 'test'
if (process.env.NODE_ENV !== "test") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const db = require("./src/config/database"); // Importar solo para las rutas que lo usan

// Importar rutas
const authRoutes = require("./src/routes/auth");
const usuarioRoutes = require("./src/routes/usuarios");
const productoRoutes = require("./src/routes/productos");
const proveedorRoutes = require("./src/routes/proveedores");
const ventaRoutes = require("./src/routes/ventas");
const reporteRoutes = require("./src/routes/reportes");
const categoriaRoutes = require("./src/routes/categorias");
const alertaRoutes = require("./src/routes/alertas");
const dashboardRoutes = require("./src/routes/dashboard");
const inventarioRoutes = require("./src/routes/inventario");
const ofertaRoutes = require("./src/routes/ofertas");
const comprobanteRoutes = require("./src/routes/comprobantes");
const detalleVentaRoutes = require("./src/routes/detalleVenta");
const productoOfertaRoutes = require("./src/routes/productoOferta");
const chatbotRoutes = require("./src/routes/chatbot");
const barcodeRoutes = require("./src/routes/barcodes");

// (Importaciones para las rutas de admin que están en server.js)
const BarcodeGenerator = require("./src/utils/barcodeGenerator");
const BarcodeService = require("./src/services/barcodeService");
const QRService = require("./src/services/qrService");
const logger = require("./src/utils/logger");
const {
  inicializarBaseDeDatos,
  crearTriggers,
} = require("./src/config/initDatabase");

const app = express();

// Middlewares básicos
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Usar rutas modulares
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/proveedores", proveedorRoutes);
app.use("/api/ventas", ventaRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/alertas", alertaRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/ofertas", ofertaRoutes);
app.use("/api/comprobantes", comprobanteRoutes);
app.use("/api/detalle-venta", detalleVentaRoutes);
app.use("/api/producto-oferta", productoOfertaRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/barcodes", barcodeRoutes);

// =================================================================
// TODAS LAS RUTAS DE UTILIDAD Y ADMIN SE MUEVEN AQUÍ
// (Estas son las rutas que estaban sueltas en tu server.js)
// =================================================================

// Ruta de salud mejorada con info de BD
app.get("/api/health", async (req, res) => {
  try {
    const dbResult = await db.query(
      "SELECT current_database() as db_name, current_user as usuario"
    );
    res.json({
      success: true,
      message: "Servidor funcionando correctamente",
      database: {
        name: dbResult.rows[0].db_name,
        user: dbResult.rows[0].usuario,
        status: "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error de conexión a la base de datos",
      error: error.message,
    });
  }
});

// Ruta adicional para información detallada de BD
app.get("/api/db-info", async (req, res) => {
  try {
    const [dbInfo, tablas, columnas] = await Promise.all([
      db.query(
        "SELECT current_database() as name, current_user as user, version() as version"
      ),
      db.query(`
                SELECT table_name, table_type 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `),
      db.query(`
                SELECT 
                    table_name, 
                    column_name, 
                    data_type, 
                    is_nullable, 
                    column_default,
                    character_maximum_length,
                    udt_name
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                ORDER BY table_name, ordinal_position
            `),
    ]);
    const columnasPorTabla = columnas.rows.reduce((acc, col) => {
      if (!acc[col.table_name]) {
        acc[col.table_name] = [];
      }
      acc[col.table_name].push({
        name: col.column_name,
        type: col.data_type,
        is_nullable: col.is_nullable === "YES",
        default: col.column_default,
        max_length: col.character_maximum_length,
      });
      return acc;
    }, {});
    const tablasConEstructura = tablas.rows.map((tabla) => ({
      ...tabla,
      columns: columnasPorTabla[tabla.table_name] || [],
    }));
    res.json({
      success: true,
      database: dbInfo.rows[0],
      tables: tablasConEstructura,
      total_tables: tablasConEstructura.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Has duplicado esta ruta, la dejo solo una vez
app.post("/api/init-db", async (req, res) => {
  try {
    console.log("🔄 Solicitada inicialización de BD...");
    await inicializarBaseDeDatos();
    await crearTriggers();
    res.json({
      success: true,
      message: "Base de datos inicializada correctamente",
    });
  } catch (error) {
    console.error("❌ Error en init-db:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Todas las rutas /api/admin/...
app.post("/api/admin/update-barcode-fields", async (req, res) => {
  // ... (tu código de update-barcode-fields)
});

app.post("/api/admin/update-alertas-table", async (req, res) => {
  // ... (tu código de update-alertas-table)
});

app.post("/api/admin/migrate-productos-sin-codigo", async (req, res) => {
  // ... (tu código de migrate-productos-sin-codigo)
});

app.get("/api/admin/estado-migracion", async (req, res) => {
  // ... (tu código de estado-migracion)
});

// =================================================================
// MANEJADORES DE ERROR (Van al final)
// =================================================================

// Manejo de errores 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error("Error global:", error);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
});

// EXPORTAR LA APP
module.exports = app;
