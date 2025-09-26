// src/controllers/ventaController.js
const db = require('../config/database');

const ventaController = {
  async getAll(req, res) {
    try {
      const result = await db.query(
        `SELECT v.*, u.nombre as usuario
         FROM ventas v
         LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
         ORDER BY v.fecha DESC`
      );
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("ventaController.getAll:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo ventas" });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const venta = await db.query(`SELECT * FROM ventas WHERE id_venta=$1`, [id]);
      if (venta.rowCount === 0)
        return res.status(404).json({ success: false, message: "Venta no encontrada" });

      const detalles = await db.query(
        `SELECT dv.*, p.nombre
         FROM detalle_venta dv
         JOIN productos p ON dv.id_producto = p.id_producto
         WHERE dv.id_venta=$1`,
        [id]
      );
      return res.json({ success: true, data: { ...venta.rows[0], detalles: detalles.rows } });
    } catch (error) {
      console.error("ventaController.getById:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo venta" });
    }
  },

  async create(req, res) {
    const { id_usuario, detalles } = req.body;
    if (!id_usuario || !detalles || detalles.length === 0) {
      return res.status(400).json({ success: false, message: "Datos de venta incompletos" });
    }
    try {
      await db.query("BEGIN");

      const venta = await db.query(
        `INSERT INTO ventas (id_usuario, total) VALUES ($1, 0) RETURNING *`,
        [id_usuario]
      );
      const idVenta = venta.rows[0].id_venta;

      let total = 0;
      for (const d of detalles) {
        const subtotal = d.cantidad * d.precio_unitario;
        total += subtotal;
        await db.query(
          `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
           VALUES ($1,$2,$3,$4,$5)`,
          [idVenta, d.id_producto, d.cantidad, d.precio_unitario, subtotal]
        );
      }

      await db.query(`UPDATE ventas SET total=$1 WHERE id_venta=$2`, [total, idVenta]);

      await db.query("COMMIT");
      return res.status(201).json({ success: true, message: "Venta registrada", data: { id_venta: idVenta, total } });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("ventaController.create:", error);
      return res.status(500).json({ success: false, message: "Error registrando venta" });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await db.query("BEGIN");
      await db.query(`DELETE FROM detalle_venta WHERE id_venta=$1`, [id]);
      const result = await db.query(`DELETE FROM ventas WHERE id_venta=$1 RETURNING *`, [id]);
      await db.query("COMMIT");
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Venta no encontrada" });
      return res.json({ success: true, message: "Venta eliminada" });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("ventaController.delete:", error);
      return res.status(500).json({ success: false, message: "Error eliminando venta" });
    }
  }
};

module.exports = ventaController;
