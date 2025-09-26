// src/controllers/proveedorController.js
const db = require('../config/database');

const proveedorController = {
  async getAll(req, res) {
    try {
      const result = await db.query(`SELECT * FROM proveedores ORDER BY nombre ASC`);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("proveedorController.getAll:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo proveedores" });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`SELECT * FROM proveedores WHERE id_proveedor=$1`, [id]);
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("proveedorController.getById:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo proveedor" });
    }
  },

  async create(req, res) {
    try {
      const { nombre, contacto, telefono, direccion } = req.body;
      if (!nombre) return res.status(400).json({ success: false, message: "Nombre es obligatorio" });

      const result = await db.query(
        `INSERT INTO proveedores (nombre, contacto, telefono, direccion)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [nombre, contacto, telefono, direccion]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("proveedorController.create:", error);
      return res.status(500).json({ success: false, message: "Error creando proveedor" });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const fields = [];
      const params = [];
      let idx = 1;

      for (let key of ["nombre", "contacto", "telefono", "direccion"]) {
        if (req.body[key] !== undefined) {
          fields.push(`${key}=$${idx}`);
          params.push(req.body[key]);
          idx++;
        }
      }
      if (fields.length === 0) return res.status(400).json({ success: false, message: "Nada para actualizar" });

      params.push(id);
      const sql = `UPDATE proveedores SET ${fields.join(", ")} WHERE id_proveedor=$${idx} RETURNING *`;
      const result = await db.query(sql, params);
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("proveedorController.update:", error);
      return res.status(500).json({ success: false, message: "Error actualizando proveedor" });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`DELETE FROM proveedores WHERE id_proveedor=$1 RETURNING *`, [id]);
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
      return res.json({ success: true, message: "Proveedor eliminado" });
    } catch (error) {
      console.error("proveedorController.delete:", error);
      return res.status(500).json({ success: false, message: "Error eliminando proveedor" });
    }
  }
};

module.exports = proveedorController;
