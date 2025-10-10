const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  // Configuración para Render (usa DATABASE_URL con SSL)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // Configuración local para pruebas
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '111444', // contraseña de pruebas
    database: process.env.DB_NAME || 'punto_venta',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
}

// Log de conexión exitosa
pool.on('connect', () => {
  console.log('✅ Conexión a la base de datos establecida');
});

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('❌ Error inesperado en la conexión con la BD', err);
  process.exit(-1);
});

// Wrapper para queries
const db = {
  query: (text, params) => {
    if (process.env.DB_LOG_QUERIES === 'true') {
      console.log('📗 Ejecutando query:', text, params || '');
    }
    return pool.query(text, params);
  },
  async getClient() {
    const client = await pool.connect();
    return client;
  }
};

module.exports = db;
