// src/repositories/usuarioRepository.js
// (Este archivo combina los métodos necesarios para authService y usuarioService)

const db = require("../config/database");
const Usuario = require("../models/Usuario");
const helpers = require("../utils/helpers");
const QueryBuilder = require("../utils/queryBuilder"); // Necesario para 'update'

/**
 * Métodos que interactúan directamente con la tabla 'usuarios'
 */
const usuarioRepository = {
  
  /**
   * Busca un usuario por su correo electrónico.
   */
  async findByEmail(correo, client) {
    const runner = client || db;
    const result = await runner.query(
      "SELECT * FROM usuarios WHERE correo = $1",
      [correo.toLowerCase().trim()]
    );
    if (result.rows.length === 0) return null;
    return Usuario.fromDatabaseRow(result.rows[0]);
  },

  /**
   * Busca un usuario por su ID.
   */
  async findById(id, client) {
    const runner = client || db;
    const result = await runner.query(
      "SELECT * FROM usuarios WHERE id_usuario = $1",
      [id]
    );
    if (result.rows.length === 0) return null;
    return Usuario.fromDatabaseRow(result.rows[0]);
  },

  /**
   * Busca un usuario activo por ID (para getMe de auth)
   */
  async findActiveById(id) {
    const result = await db.query(
      "SELECT id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login FROM usuarios WHERE id_usuario = $1 AND activo = true",
      [id]
    );
    if (result.rows.length === 0) return null;
    return Usuario.fromDatabaseRow(result.rows[0]);
  },

  /**
   * Obtiene una lista paginada de usuarios con filtros y búsqueda.
   * (Versión mejorada para 'usuarioController.getAll')
   */
  async findAll({ whereSQL, params, sortField, order, limit, offset }) {
    const dataSql = `
        SELECT id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login
        FROM usuarios
        ${whereSQL}
        ORDER BY ${sortField} ${order}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `SELECT COUNT(*)::int AS total FROM usuarios ${whereSQL}`;
    
    const [dataResult, countResult] = await Promise.all([
        db.query(dataSql, [...params, limit, offset]),
        db.query(countSql, params)
    ]);

    const usuarios = dataResult.rows.map(row => Usuario.fromDatabaseRow(row));
    const total = countResult.rows[0].total;
    return { usuarios, total };
  },

  /**
   * Obtiene estadísticas de ventas para un usuario.
   */
  async getVentasStatsById(id) {
    const statsResult = await db.query(
        `SELECT 
           COUNT(*) as total_ventas,
           COALESCE(SUM(v.total), 0) as total_ventas_monto,
           COUNT(DISTINCT DATE(v.fecha)) as dias_trabajados
         FROM ventas v 
         WHERE v.id_usuario = $1`,
        [id]
    );
    return {
        total_ventas: parseInt(statsResult.rows[0].total_ventas) || 0,
        total_ventas_monto: parseFloat(statsResult.rows[0].total_ventas_monto) || 0,
        dias_trabajados: parseInt(statsResult.rows[0].dias_trabajados) || 0
    };
  },

  /**
   * Cuenta las ventas asociadas a un usuario (para delete).
   */
  async countVentasByUsuarioId(id, client) {
    const runner = client || db;
    const result = await runner.query('SELECT COUNT(*) FROM ventas WHERE id_usuario = $1', [id]);
    return parseInt(result.rows[0].count);
  },

  /**
   * Actualiza la fecha de último login.
   */
  async updateLastLogin(id_usuario) {
    db.query("UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = $1", [
      id_usuario,
    ]).catch((err) =>
      console.error("Error actualizando ultimo_login:", err.message)
    );
  },

  /**
   * Actualiza la contraseña de un usuario (requiere client).
   */
  async updatePassword(id_usuario, nuevoHash, client) {
    await client.query(
      "UPDATE usuarios SET contrasena_hash = $1, actualizado_en = NOW() WHERE id_usuario = $2",
      [nuevoHash, id_usuario]
    );
  },

  /**
   * Crea un nuevo usuario (requiere client).
   */
  async create(usuarioData, contrasenaHash, client) {
    const { nombre, correo, rol, activo = true, creado_en = new Date() } = usuarioData;
    const result = await client.query(
      `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id_usuario, nombre, correo, rol, activo, creado_en`,
      [nombre, correo, contrasenaHash, rol, activo, creado_en]
    );
    return Usuario.fromDatabaseRow(result.rows[0]);
  },
  
  /**
   * Actualiza dinámicamente un usuario (requiere client).
   */
  async update(id, updates, client) {
    const { sql, params } = QueryBuilder.buildUpdateQuery('usuarios', updates, 'id_usuario', id);
    const result = await client.query(
        `${sql}, actualizado_en = CURRENT_TIMESTAMP 
         RETURNING id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login`, 
        params
    );
    return Usuario.fromDatabaseRow(result.rows[0]);
  },

  /**
   * Actualiza el perfil de un usuario (nombre/correo) (requiere client).
   * (Usado por authService)
   */
  async updateProfile(usuarioId, updates, client) {
    const { sql, params } = QueryBuilder.buildUpdateQuery('usuarios', updates, 'id_usuario', usuarioId);
    const result = await client.query(
        `${sql}, actualizado_en = NOW() 
         RETURNING id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login`,
        params
    );
    return Usuario.fromDatabaseRow(result.rows[0]);
  },

  /**
   * Actualiza el estado (activo/inactivo) de un usuario (requiere client).
   */
  async updateStatus(id, activo, client) {
    const result = await client.query(
      "UPDATE usuarios SET activo = $1, actualizado_en = NOW() WHERE id_usuario = $2 RETURNING id_usuario, nombre, correo, rol, activo, creado_en",
      [activo, id]
    );
    if (result.rows.length === 0) return null;
    return Usuario.fromDatabaseRow(result.rows[0]);
  },
  
  /**
   * Actualiza el rol de un usuario (requiere client).
   * (Usado por authService)
   */
  async updateRole(id, rol, client) {
    const result = await client.query(
      "UPDATE usuarios SET rol = $1, actualizado_en = NOW() WHERE id_usuario = $2 RETURNING id_usuario, nombre, correo, rol, activo",
      [rol, id]
    );
    if (result.rows.length === 0) return null;
    return Usuario.fromDatabaseRow(result.rows[0]);
  },

  /**
   * Elimina permanentemente un usuario (requiere client).
   */
  async hardDelete(id, client) {
    await client.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
  },

  // --- Métodos de Auth Service (ya existentes) ---
  
  async updateRecoveryToken(id_usuario, token, expiracion) {
    await db.query(
      "UPDATE usuarios SET token_recuperacion = $1, expiracion_token = $2 WHERE id_usuario = $3",
      [token, expiracion, id_usuario]
    );
  },

  async findByRecoveryToken(token) {
    const result = await db.query(
      "SELECT * FROM usuarios WHERE token_recuperacion = $1 AND expiracion_token > NOW()",
      [token]
    );
    if (result.rows.length === 0) return null;
    return Usuario.fromDatabaseRow(result.rows[0]);
  },

  async resetPassword(id_usuario, nuevoHash, client) {
    await client.query(
      "UPDATE usuarios SET contrasena_hash = $1, token_recuperacion = NULL, expiracion_token = NULL, actualizado_en = NOW() WHERE id_usuario = $2",
      [nuevoHash, id_usuario]
    );
  },
  
  // (El getEstadisticas y getProfile de authService se quedan, 
  // ya que son específicos para la lógica de 'getMe' y 'getProfile' de auth)
   async getEstadisticas(usuarioId) {
    try {
      const ventasResult = await db.query(
        "SELECT COUNT(*) as total_ventas, SUM(total) as total_ventas_monto FROM ventas WHERE id_usuario = $1",
        [usuarioId]
      );
      const alertasResult = await db.query(
        "SELECT COUNT(*) as alertas_pendientes FROM alertas WHERE atendida = false"
      );
      return {
        total_ventas: parseInt(ventasResult.rows[0].total_ventas) || 0,
        total_ventas_monto:
          parseFloat(ventasResult.rows[0].total_ventas_monto) || 0,
        alertas_pendientes:
          parseInt(alertasResult.rows[0].alertas_pendientes) || 0,
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas de usuario", {
        usuarioId,
        error: error.message,
      });
      return { total_ventas: 0, total_ventas_monto: 0, alertas_pendientes: 0 };
    }
   },
   
   async getProfile(id_usuario) {
    const result = await db.query(
      `SELECT u.*, 
         COUNT(v.id_venta) as total_ventas,
         COALESCE(SUM(v.total), 0) as total_ventas_monto,
         COUNT(DISTINCT DATE(v.fecha)) as dias_trabajados
       FROM usuarios u
       LEFT JOIN ventas v ON u.id_usuario = v.id_usuario
       WHERE u.id_usuario = $1 AND u.activo = true
       GROUP BY u.id_usuario`,
      [id_usuario]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
   },
};

module.exports = usuarioRepository;