const { execSync } = require("child_process");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Cargar variables de entorno
require("dotenv").config();

// --- 1. Configuración ---

// Configuración de la BD Local (leída desde .env)
const localConfig = {
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "2504",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "punto_venta",
};

// Configuración de la BD de Supabase
const supabaseHost = "db.oartkearacxzryhxuiwm.supabase.co";
const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
const supabaseDbUrl = `postgresql://postgres:${supabasePassword}@${supabaseHost}:5432/postgres`;

if (!supabasePassword) {
  console.error(
    "❌ Error: Falta SUPABASE_DB_PASSWORD en tu archivo .env"
  );
  process.exit(1);
}

// Ruta para el archivo de backup
const backupSqlPath = path.join(__dirname, "full_backup.sql");

// --- 2. Función Principal de Migración ---

async function migrate() {
  console.log("🚀 Iniciando migración a Supabase...");

  try {
    // --- PASO 1: Crear un backup completo (estructura y datos) de la BD local ---
    console.log(
      `PASO 1: Creando backup completo de '${localConfig.database}'...`
    );

    // Usamos variables de entorno para la contraseña de pg_dump
    const env = { ...process.env, PGPASSWORD: localConfig.password };

    // pg_dump creará el archivo 'full_backup.sql'
    const dumpCommand = `pg_dump --clean --username=${localConfig.user} --host=${localConfig.host} --port=${localConfig.port} ${localConfig.database}`;

    // Redirigimos la salida del comando (el SQL) directamente a un archivo
    const sqlOutput = execSync(dumpCommand, {
      env: env,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 50, // 50 MB
    });

    fs.writeFileSync(backupSqlPath, sqlOutput);

    console.log("✅ Backup completo guardado en 'full_backup.sql'.");

    // --- PASO 2: Importar el backup completo a Supabase ---
    console.log(
      `PASO 2: Importando backup a Supabase en '${supabaseHost}'...`
    );

    // Usamos psql para importar, ya que es la herramienta diseñada para esto
    // y entiende comandos especiales como \connect si los hubiera.
    // Usamos la variable de entorno para la contraseña de psql.
    const importEnv = { ...process.env, PGPASSWORD: supabasePassword };
    const importCommand = `psql "${supabaseDbUrl}" -f "${backupSqlPath}"`;

    execSync(importCommand, {
      env: importEnv,
      stdio: "inherit", // Muestra la salida de psql
    });

    console.log("✅ ¡Backup importado a Supabase exitosamente!");
  } catch (error) {
    console.error("❌ ERROR DURANTE LA MIGRACIÓN:", error.message);
    if (error.stderr) {
      console.error("Detalle del error (stderr):", error.stderr.toString());
    }
    if (error.stdout) {
      console.error("Detalle del error (stdout):", error.stdout.toString());
    }
  } finally {
    // --- PASO 3: Limpieza ---
    if (fs.existsSync(backupSqlPath)) {
      fs.unlinkSync(backupSqlPath);
      console.log("🧹 Archivo 'full_backup.sql' temporal eliminado.");
    }
    console.log("🎉 ¡Migración finalizada!");
  }
}

// Ejecutar la función
migrate();