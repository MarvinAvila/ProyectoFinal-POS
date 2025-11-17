// src/config/database.js
const { Pool } = require("pg");

// Carga dotenv solo si NO estamos en modo 'test'.
if (process.env.NODE_ENV !== "test") {
  require("dotenv").config();
}

let pool;

const isTest = process.env.NODE_ENV === "test";

if (process.env.DATABASE_URL) {
  // Configuración para Render
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  // Configuración local (desarrollo o pruebas)
  pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: isTest ? process.env.DB_NAME_TEST : process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

pool.on("connect", (client) => {
  client
    .query("SELECT current_database()")
    .then((res) => {
      console.log(
        `✅ Conexión a la base de datos establecida: ${res.rows[0].current_database}`
      );
    })
    .catch((err) => {
      console.error(
        "❌ Error al obtener el nombre de la BD en la conexión",
        err
      );
    });
});

pool.on("error", (err) => {
  console.error("❌ Error inesperado en la conexión con la BD", err);
  process.exit(-1);
});

// Wrapper para queries
const db = {
  query: (text, params) => {
    if (process.env.DB_LOG_QUERIES === "true") {
      console.log("📗 Ejecutando query:", text, params || "");
    }
    return pool.query(text, params);
  },
  async getClient() {
    const client = await pool.connect();
    return client;
  },

  end: () => {
    console.log("🔌 Cerrando pool de conexiones de la BD...");
    return pool.end();
  }, 
};

module.exports = db;
