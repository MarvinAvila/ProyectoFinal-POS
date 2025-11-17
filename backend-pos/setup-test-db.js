// Archivo: setup-test-db.js
const { execSync } = require("child_process");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt"); 

// Cargar variables de entorno desde .env
require("dotenv").config();

// --- 1. Configuración ---

// Configuración de la BD de Desarrollo (leída desde .env)
const devDbConfig = {
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "2504",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "punto_venta",
};

// --- Configuración de Pruebas ---
const testDbName = "punto_venta_test";
// Estas credenciales DEBEN COINCIDIR con las de tu full_api.test.js
const TEST_ADMIN_EMAIL = "admin_test@dominio.com";
const TEST_ADMIN_PASSWORD = "tu_contrasena_de_prueba_segura";

// Configuración para conectarse al servidor Postgres (base de datos 'postgres')
const adminDbConfig = {
  ...devDbConfig,
  database: "postgres",
};

// Configuración para conectarse a la BD de Pruebas (para el seeder)
const testDbConfig = {
  ...devDbConfig,
  database: testDbName,
};

// Ruta para el archivo de backup temporal
const backupSqlPath = path.join(__dirname, "test_data_backup.sql");

// --- 2. Función Principal (async) ---

async function setupTestDatabase() {
  console.log("🚀 Iniciando configuración de la Base de Datos de Pruebas...");
  let pool;
  let testPool;

  try {
    // --- PASO 1: Borrar y Re-crear la BD de Pruebas ---
    console.log(`PASO 1: Re-creando la base de datos '${testDbName}'...`);
    pool = new Pool(adminDbConfig);
    const client = await pool.connect();

    try {
      console.log(` ↳ Intentando borrar '${testDbName}' (si existe)...`);
      // Forzamos desconectar a todos los usuarios de la BD de pruebas
      await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '${testDbName}';
      `);
      await client.query(`DROP DATABASE IF EXISTS "${testDbName}";`);
      
      console.log(` ↳ Creando '${testDbName}'...`);
      await client.query(`CREATE DATABASE "${testDbName}";`);
      
      console.log("✅ Base de datos de pruebas re-creada.");
    } finally {
      client.release();
      await pool.end();
    }

    // --- PASO 2: Crear backup de la BD de Desarrollo ---
    console.log(
      `PASO 2: Creando backup de '${devDbConfig.database}'...`
    );
    const env = { ...process.env, PGPASSWORD: devDbConfig.password };
    const dumpCommand = `pg_dump --clean --username=${devDbConfig.user} --host=${devDbConfig.host} --port=${devDbConfig.port} ${devDbConfig.database}`;
    const sqlOutput = execSync(dumpCommand, {
      env: env,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 50, // 50 MB
    });
    fs.writeFileSync(backupSqlPath, sqlOutput);
    console.log("✅ Backup de desarrollo guardado en 'test_data_backup.sql'.");

    // --- PASO 3: Importar el backup a la BD de Pruebas ---
    console.log(
      `PASO 3: Importando datos a '${testDbName}'...`
    );
    const testDbUrl = `postgresql://${devDbConfig.user}:${devDbConfig.password}@${devDbConfig.host}:${devDbConfig.port}/${testDbName}`;
    const importCommand = `psql "${testDbUrl}" -f "${backupSqlPath}"`;
    
    // Agregamos un try...catch aquí para ignorar los errores "no existe"
    try {
        execSync(importCommand, {
            env: env,
            stdio: "inherit", // Sigue mostrando la salida
        });
    } catch (error) {
        // Ignora los errores de 'psql' si son por 'no existe la relación'
        if (error.stderr && error.stderr.toString().includes("no existe")) {
            console.warn("⚠️  Se ignoraron los errores 'no existe' de psql (normal durante --clean).");
        } else {
            throw error; // Lanza cualquier otro error real
        }
    }
    console.log("✅ ¡Datos importados a la base de datos de pruebas!");

    // --- PASO 4: Sembrar usuario administrador de prueba (CORREGIDO) ---
    console.log("PASO 4: Sembrando usuario administrador de prueba...");
    
    // 1. Hashear la contraseña de prueba
    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(TEST_ADMIN_PASSWORD, saltRounds);
    console.log(` ↳ Contraseña de prueba hasheada.`);

    // 2. Conectar a la BD de pruebas
    testPool = new Pool(testDbConfig);
    const testClient = await testPool.connect();

    try {
      // 3. Insertar o Actualizar (UPSERT) el usuario de prueba
      // CORREGIDO: Usando 'correo' y 'contrasena_hash'
      const seedQuery = `
        INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, creado_en, actualizado_en)
        VALUES ('Admin de Pruebas', $1, $2, 'dueno', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (correo) 
        DO UPDATE SET
          contrasena_hash = EXCLUDED.contrasena_hash,
          rol = 'dueno',
          activo = TRUE,
          nombre = 'Admin de Pruebas',
          actualizado_en = CURRENT_TIMESTAMP;
      `;
      
      // Pasamos los valores correctos
      await testClient.query(seedQuery, [TEST_ADMIN_EMAIL, hashedPassword]);
      console.log(`✅ Usuario de prueba '${TEST_ADMIN_EMAIL}' sembrado/actualizado.`);
    
    } finally {
      testClient.release();
      await testPool.end();
    }

  } catch (error) {
    console.error("❌ ERROR DURANTE LA CONFIGURACIÓN:", error.message);
    if (error.stderr) {
      console.error("Detalle del error (stderr):", error.stderr.toString());
    }
  } finally {
    // --- PASO 5: Limpieza ---
    if (fs.existsSync(backupSqlPath)) {
      fs.unlinkSync(backupSqlPath);
      console.log("🧹 Archivo 'test_data_backup.sql' temporal eliminado.");
    }
    console.log("🎉 ¡Configuración de pruebas finalizada!");
  }
}

// Ejecutar la función
setupTestDatabase();