// src/controllers/reporteController.js
const db = require('../config/database');

const reporteController = {
  async getAll(req, res) {
    try {
      const result = await db.query(`SELECT * FROM reportes ORDER BY fecha_generado DESC`);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("reporteController.getAll:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo reportes" });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`SELECT * FROM reportes WHERE id_reporte=$1`, [id]);
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Reporte no encontrado" });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("reporteController.getById:", error);
      return res.status(500).json({ success: false, message: "Error obteniendo reporte" });
    }
  },

  async generarReporte(req, res) {
    try {
      const { tipo, id_usuario } = req.body;
      if (!tipo) return res.status(400).json({ success: false, message: "Tipo de reporte requerido" });

      let contenido = {};
      if (tipo === "ventas_dia") {
        const ventas = await db.query(
          `SELECT v.*, u.nombre as usuario
           FROM ventas v
           JOIN usuarios u ON v.id_usuario = u.id_usuario
           WHERE DATE(v.fecha) = CURRENT_DATE`
        );
        contenido = ventas.rows;
      } else if (tipo === "top_productos") {
        const top = await db.query(
          `SELECT p.nombre, SUM(dv.cantidad) as total_vendido
           FROM detalle_venta dv
           JOIN productos p ON dv.id_producto = p.id_producto
           GROUP BY p.nombre
           ORDER BY total_vendido DESC
           LIMIT 5`
        );
        contenido = top.rows;
      } else if (tipo === "stock_bajo") {
        const low = await db.query(`SELECT * FROM productos WHERE stock <= 5 ORDER BY stock ASC`);
        contenido = low.rows;
      } else {
        return res.status(400).json({ success: false, message: "Tipo de reporte no válido" });
      }

      const insert = await db.query(
        `INSERT INTO reportes (tipo, id_usuario, descripcion, contenido)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [tipo, id_usuario, `Reporte de tipo ${tipo}`, JSON.stringify(contenido)]
      );
      return res.status(201).json({ success: true, data: insert.rows[0] });
    } catch (error) {
      console.error("reporteController.generarReporte:", error);
      return res.status(500).json({ success: false, message: "Error generando reporte" });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`DELETE FROM reportes WHERE id_reporte=$1 RETURNING *`, [id]);
      if (result.rowCount === 0)
        return res.status(404).json({ success: false, message: "Reporte no encontrado" });
      return res.json({ success: true, message: "Reporte eliminado" });
    } catch (error) {
      console.error("reporteController.delete:", error);
      return res.status(500).json({ success: false, message: "Error eliminando reporte" });
    }
  }
};

module.exports = reporteController;
