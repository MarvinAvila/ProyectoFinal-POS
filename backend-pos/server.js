// server.js
// Carga el .env para desarrollo/producción
require("dotenv").config();

// Importa la app definida en app.js
const app = require("./app");
const db = require("./src/config/database");
const {
  inicializarBaseDeDatos,
  crearTriggers,
} = require("./src/config/initDatabase");

const PORT = process.env.PORT || 3000;

// =================================================================
// LÓGICA DE ARRANQUE (Se queda aquí)
// =================================================================

// Función para verificar la conexión a la base de datos
async function verificarConexionBD() {
  try {
    const result = await db.query(
      "SELECT current_database() as db_name, current_user as usuario, version() as postgres_version"
    );
    console.log("🔍 INFORMACIÓN DE CONEXIÓN A BD:");
    console.log("   📊 Base de datos:", result.rows[0].db_name);
    console.log("   👤 Usuario:", result.rows[0].usuario);
    console.log(
      "   🐘 PostgreSQL:",
      result.rows[0].postgres_version.split(",")[0]
    );
    const tablasResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
  nbsp;         LIMIT 5
        `);
    console.log(
      "   📋 Tablas existentes (primeras 5):",
      tablasResult.rows.map((t) => t.table_name).join(", ") || "Ninguna"
    );
  } catch (error) {
    console.error("❌ ERROR DE CONEXIÓN A BD:", error.message);
  }
}

// Iniciar servidor con inicialización automática de BD
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
  console.log("⏳ Verificando conexión a la base de datos..."); // Verificar conexión a BD

  await verificarConexionBD(); // Inicializar automáticamente las tablas al iniciar

  // ESTO NO SE EJECUTARÁ DURANTE LOS TESTS
  console.log("🔄 Inicializando tablas de la base de datos...");
  try {
    await inicializarBaseDeDatos();
    console.log("✅ Tablas inicializadas correctamente");
    await crearTriggers();
  } catch (error) {
    console.error("❌ Error inicializando tablas:", error.message);
    console.log("💡 Puedes inicializar manualmente con: POST /api/init-db");
  }
});

// NO SE EXPORTA NADA DESDE AQUÍ
