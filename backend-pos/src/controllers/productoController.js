// src/controllers/productoController.js
const db = require('../config/database');

const productoController = {
  async getAll(req, res) {
    try {
      const { q, categoria, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      const params = [];
      const where = [];
      let idx = 1;

      if (q) {
        where.push(`(p.nombre ILIKE $${idx} OR p.descripcion ILIKE $${idx})`);
        params.push(`%${q}%`);
        idx++;
      }
      if (categoria) {
        where.push(`p.id_categoria = $${idx}`);
        params.push(categoria);
        idx++;
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
      params.push(limit, offset);

      const sql = `
        SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
        ${whereSQL}
        ORDER BY p.nombre ASC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      const result = await db.query(sql, params);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("productoController.getAll:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo productos" });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(
        `SELECT * FROM productos WHERE id_producto=$1`,
        [id]
      );
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Producto no encontrado" });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("productoController.getById:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo producto" });
    }
  },

  async create(req, res) {
    try {
      const { id_categoria, id_proveedor, nombre, descripcion, precio, stock, unidad, fecha_caducidad } = req.body;
      if (!nombre || !precio || stock == null) {
        return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
      }
      const result = await db.query(
        `INSERT INTO productos (id_categoria, id_proveedor, nombre, descripcion, precio, stock, unidad, fecha_caducidad)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [id_categoria, id_proveedor, nombre, descripcion, precio, stock, unidad, fecha_caducidad]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("productoController.create:", error);
      return res.status(500).json({ success: false, message: "Error creando producto" });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const fields = [];
      const params = [];
      let idx = 1;

      for (let key of ["id_categoria", "id_proveedor", "nombre", "descripcion", "precio", "stock", "unidad", "fecha_caducidad"]) {
        if (req.body[key] !== undefined) {
          fields.push(`${key}=$${idx}`);
          params.push(req.body[key]);
          idx++;
        }
      }
      if (fields.length === 0) return res.status(400).json({ success: false, message: "Nada para actualizar" });

      params.push(id);
      const sql = `UPDATE productos SET ${fields.join(", ")} WHERE id_producto=$${idx} RETURNING *`;
      const result = await db.query(sql, params);
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Producto no encontrado" });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("productoController.update:", error);
      return res.status(500).json({ success: false, message: "Error actualizando producto" });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`DELETE FROM productos WHERE id_producto=$1 RETURNING *`, [id]);
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Producto no encontrado" });
      return res.json({ success: true, message: "Producto eliminado" });
    } catch (error) {
      console.error("productoController.delete:", error);
      return res.status(500).json({ success: false, message: "Error eliminando producto" });
    }
  }
};

module.exports = productoController;
