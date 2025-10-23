require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const db = require("./src/config/database"); // Importar la configuración de BD
const {
  inicializarBaseDeDatos,
  crearTriggers,
} = require("./src/config/initDatabase"); // ✅ NUEVO: Importar inicialización

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

// Función para verificar la conexión a la base de datos
async function verificarConexionBD() {
  try {
    const result = await db.query(
      "SELECT current_database() as db_name, current_user as usuario, version() as postgres_version"
    );
    console.log("🔍 INFORMACIÓN DE CONEXIÓN A BD:");
    console.log("   📊 Base de datos:", result.rows[0].db_name);
    console.log("   👤 Usuario:", result.rows[0].usuario);
    console.log(
      "   🐘 PostgreSQL:",
      result.rows[0].postgres_version.split(",")[0]
    );

    // Verificar si existen tablas (opcional)
    const tablasResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            LIMIT 5
        `);
    console.log(
      "   📋 Tablas existentes (primeras 5):",
      tablasResult.rows.map((t) => t.table_name).join(", ") || "Ninguna"
    );
  } catch (error) {
    console.error("❌ ERROR DE CONEXIÓN A BD:", error.message);
  }
}

// Usar rutas
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
      // ✅ NUEVO: Consulta para obtener la estructura de todas las columnas
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

    // ✅ NUEVO: Agrupar columnas por tabla
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

    // ✅ NUEVO: Combinar tablas con su estructura
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

// ✅ NUEVO: Endpoint para actualizar BD con campos de códigos QR/barras
app.post("/api/admin/update-barcode-fields", async (req, res) => {
  console.log("🔄 Solicitada actualización de BD para códigos QR/barras...");

  const db = require("./src/config/database");
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    console.log("\n📋 EJECUTANDO ACTUALIZACIONES:");

    // 1. Agregar nuevos campos a productos
    console.log("1. ➕ Agregando nuevos campos a tabla productos...");
    await client.query(`
            ALTER TABLE productos 
            ADD COLUMN IF NOT EXISTS codigo_barras_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS codigo_qr_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS codigos_public_ids JSONB,
            ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP DEFAULT NOW()
        `);

    // 2. Actualizar productos existentes
    console.log("2. 🔄 Actualizando productos existentes...");
    const updateResult = await client.query(`
            UPDATE productos 
            SET activo = COALESCE(activo, TRUE),
                fecha_creacion = COALESCE(fecha_creacion, NOW()),
                fecha_actualizacion = NOW()
            WHERE activo IS NULL OR fecha_creacion IS NULL
        `);
    console.log(`   ✅ ${updateResult.rowCount} productos actualizados`);

    // 3. Crear índices para mejor rendimiento
    console.log("3. 🗂️ Creando índices...");
    await client.query(`
            CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
            CREATE INDEX IF NOT EXISTS idx_productos_codigo_barra ON productos(codigo_barra);
            CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
            CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock);
        `);

    // 4. Actualizar trigger de fecha_actualizacion
    console.log("4. ⚡ Actualizando trigger...");
    await client.query(`
            CREATE OR REPLACE FUNCTION set_fecha_actualizacion()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.fecha_actualizacion := NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_set_fecha_actualizacion ON productos;
            
            CREATE TRIGGER trg_set_fecha_actualizacion
            BEFORE UPDATE ON productos
            FOR EACH ROW
            EXECUTE FUNCTION set_fecha_actualizacion();
        `);

    // 5. Verificar cambios
    console.log("5. ✅ Verificando cambios...");
    const verification = await client.query(`
            SELECT 
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'productos' 
            AND column_name IN ('codigo_barras_url', 'codigo_qr_url', 'codigos_public_ids', 'activo')
            ORDER BY column_name
        `);

    await client.query("COMMIT");

    console.log("\n🎉 ACTUALIZACIÓN COMPLETADA EXITOSAMENTE!");

    // Verificar conteo de productos actualizados
    const countResult = await client.query(
      "SELECT COUNT(*) as total FROM productos WHERE activo = TRUE"
    );

    res.json({
      success: true,
      message: "Base de datos actualizada para códigos QR y barras",
      detalles: {
        campos_agregados: verification.rows.map((row) => ({
          nombre: row.column_name,
          tipo: row.data_type,
          nullable: row.is_nullable === "YES",
        })),
        productos_activos: parseInt(countResult.rows[0].total),
        estado: "LISTO",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ ERROR durante la actualización:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      codigo: error.code,
      mensaje:
        "Error actualizando BD, pero algunos campos pueden haberse agregado",
    });
  } finally {
    client.release();
  }
});

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

// ✅ MODIFICADO: Iniciar servidor con inicialización automática de BD
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(
    `📊 Health check disponible en http://localhost:${PORT}/api/health`
  );
  console.log(
    `🔍 Info de BD disponible en http://localhost:${PORT}/api/db-info`
  );
  console.log(
    `🔄 Endpoint de inicialización: http://localhost:${PORT}/api/init-db`
  );
  console.log("⏳ Verificando conexión a la base de datos...");

  // Verificar conexión a BD
  await verificarConexionBD();

  // ✅ NUEVO: Inicializar automáticamente las tablas al iniciar
  console.log("🔄 Inicializando tablas de la base de datos...");
  try {
    await inicializarBaseDeDatos();
    console.log("✅ Tablas inicializadas correctamente");

    // Intentar crear triggers (opcional)
    await crearTriggers();
  } catch (error) {
    console.error("❌ Error inicializando tablas:", error.message);
    console.log("💡 Puedes inicializar manualmente con: POST /api/init-db");
  }
});

module.exports = app;
