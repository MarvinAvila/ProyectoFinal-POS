// src/controllers/usuarioController.js
const db = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const ALLOWED_ROLES = ['admin', 'cajero', 'gerente', 'dueno'];

const usuarioController = {
  // Listado con paginación y búsqueda
  async getAll(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page || '1'), 1);
      const limit = Math.min(parseInt(req.query.limit || '20'), 100);
      const offset = (page - 1) * limit;
      const q = req.query.q ? `%${req.query.q}%` : null;
      const rol = req.query.rol || null;

      const whereClauses = [];
      const params = [];
      let idx = 1;

      if (q) {
        whereClauses.push(`(nombre ILIKE $${idx} OR correo ILIKE $${idx})`);
        params.push(q);
        idx++;
      }
      if (rol) {
        whereClauses.push(`rol = $${idx}`);
        params.push(rol);
        idx++;
      }

      const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // total
      const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM usuarios ${whereSQL}`, params);
      const total = countRes.rows[0].total;

      // data
      params.push(limit, offset); // last two params
      const dataRes = await db.query(
        `SELECT id_usuario, nombre, correo, rol, activo, creado_en
         FROM usuarios
         ${whereSQL}
         ORDER BY creado_en DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        params
      );

      return res.status(200).json({
        success: true,
        data: dataRes.rows,
        meta: { total, page, limit, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('usuarioController.getAll error:', error);
      return res.status(500).json({ success: false, message: 'Error obteniendo usuarios' });
    }
  },

  async getById(req, res) {
    const { id } = req.params;
    try {
      const result = await db.query(
        'SELECT id_usuario, nombre, correo, rol, activo, creado_en FROM usuarios WHERE id_usuario = $1',
        [id]
      );
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('usuarioController.getById error:', error);
      return res.status(500).json({ success: false, message: 'Error obteniendo usuario' });
    }
  },

  async create(req, res) {
    const { nombre, correo, contrasena, rol } = req.body;
    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({ success: false, message: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (rol && !ALLOWED_ROLES.includes(rol)) {
      return res.status(400).json({ success: false, message: `Rol inválido. Permitidos: ${ALLOWED_ROLES.join(', ')}` });
    }
    try {
      const hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
      const result = await db.query(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) 
         VALUES ($1,$2,$3,$4)
         RETURNING id_usuario, nombre, correo, rol, activo, creado_en`,
        [nombre, correo, hash, rol || 'cajero']
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('usuarioController.create error:', error);
      // Unique violation (correo)
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'El correo ya está registrado' });
      }
      return res.status(500).json({ success: false, message: 'Error creando usuario' });
    }
  },

  async update(req, res) {
    const { id } = req.params;
    const { nombre, correo, contrasena, rol, activo } = req.body;
    try {
      // Build dynamic update
      const fields = [];
      const params = [];
      let idx = 1;

      if (nombre !== undefined) { fields.push(`nombre=$${idx}`); params.push(nombre); idx++; }
      if (correo !== undefined) { fields.push(`correo=$${idx}`); params.push(correo); idx++; }
      if (rol !== undefined) {
        if (!ALLOWED_ROLES.includes(rol)) return res.status(400).json({ success: false, message: 'Rol inválido' });
        fields.push(`rol=$${idx}`); params.push(rol); idx++;
      }
      if (activo !== undefined) { fields.push(`activo=$${idx}`); params.push(activo); idx++; }
      if (contrasena !== undefined) {
        const hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
        fields.push(`contrasena_hash=$${idx}`); params.push(hash); idx++;
      }

      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
      }

      params.push(id);
      const sql = `UPDATE usuarios SET ${fields.join(', ')} WHERE id_usuario=$${idx} RETURNING id_usuario, nombre, correo, rol, activo, creado_en`;
      const result = await db.query(sql, params);
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('usuarioController.update error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'El correo ya está en uso' });
      }
      return res.status(500).json({ success: false, message: 'Error actualizando usuario' });
    }
  },

  async setActive(req, res) {
    const { id } = req.params;
    const { activo } = req.body;
    try {
      const result = await db.query('UPDATE usuarios SET activo=$1 WHERE id_usuario=$2 RETURNING id_usuario, nombre, correo, rol, activo', [!!activo, id]);
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('usuarioController.setActive error:', error);
      return res.status(500).json({ success: false, message: 'Error actualizando estado de usuario' });
    }
  },

  async delete(req, res) {
    const { id } = req.params;
    try {
      const result = await db.query('DELETE FROM usuarios WHERE id_usuario=$1 RETURNING id_usuario', [id]);
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
      console.error('usuarioController.delete error:', error);
      return res.status(500).json({ success: false, message: 'Error eliminando usuario' });
    }
  }
};

module.exports = usuarioController;
