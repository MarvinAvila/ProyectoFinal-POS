// src/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Crear el pool de conexiones
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '111444', //cambie la contra pa pruebas del front
  database: process.env.DB_NAME || 'punto_venta',
  max: 20,            // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo de inactividad antes de cerrar conexión
  connectionTimeoutMillis: 5000 // tiempo máximo para intentar conectar
});

// Log de conexión exitosa
pool.on('connect', () => {
  console.log('✅ Conexión a la base de datos establecida');
});

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('❌ Error inesperado en la conexión con la BD', err);
  process.exit(-1);
});

// Wrapper para queries (los controladores lo usan con db.query)
const db = {
  query: (text, params) => {
    if (process.env.DB_LOG_QUERIES === 'true') {
      console.log('📗 Ejecutando query:', text, params || '');
    }
    return pool.query(text, params);
  },

  // Transacciones manuales si quieres extender
  async getClient() {
    const client = await pool.connect();
    return client;
  }
};

module.exports = db;
