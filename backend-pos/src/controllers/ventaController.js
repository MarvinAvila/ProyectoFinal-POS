// src/controllers/ventaController.js
const db = require("../config/database");

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
      return res
        .status(500)
        .json({ success: false, message: "Error obteniendo ventas" });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const venta = await db.query(`SELECT * FROM ventas WHERE id_venta=$1`, [
        id,
      ]);
      if (venta.rowCount === 0)
        return res
          .status(404)
          .json({ success: false, message: "Venta no encontrada" });

      const detalles = await db.query(
        `SELECT dv.*, p.nombre
         FROM detalle_venta dv
         JOIN productos p ON dv.id_producto = p.id_producto
         WHERE dv.id_venta=$1`,
        [id]
      );
      return res.json({
        success: true,
        data: { ...venta.rows[0], detalles: detalles.rows },
      });
    } catch (error) {
      console.error("ventaController.getById:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error obteniendo venta" });
    }
  },

  async create(req, res) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const { id_usuario, detalles, forma_pago = "efectivo" } = req.body;

      // ✅ CREAR INSTANCIA DEL MODELO
      const nuevaVenta = Venta.crearNueva(id_usuario, forma_pago);

      // Procesar detalles usando modelos
      for (const detalleData of detalles) {
        const detalle = DetalleVenta.crearNuevo(
          null, // id_venta se asignará después
          detalleData.id_producto,
          detalleData.cantidad,
          detalleData.precio_unitario
        );

        nuevaVenta.agregarDetalle(detalle);
      }

      // ✅ USAR MÉTODO DEL MODELO para calcular totales
      nuevaVenta.calcularTotales();

      // Insertar venta y detalles en la base de datos...

      await client.query("COMMIT");

      return responseHelper.success(
        res,
        nuevaVenta,
        "Venta registrada exitosamente",
        201
      );
    } catch (error) {
      await client.query("ROLLBACK");
      // Manejo de errores...
    } finally {
      client.release();
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await db.query("BEGIN");
      await db.query(`DELETE FROM detalle_venta WHERE id_venta=$1`, [id]);
      const result = await db.query(
        `DELETE FROM ventas WHERE id_venta=$1 RETURNING *`,
        [id]
      );
      await db.query("COMMIT");
      if (result.rowCount === 0)
        return res
          .status(404)
          .json({ success: false, message: "Venta no encontrada" });
      return res.json({ success: true, message: "Venta eliminada" });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("ventaController.delete:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error eliminando venta" });
    }
  },
};

module.exports = ventaController;
