// src/controllers/detalleVentaController.js
const db = require('../config/database');

const detalleVentaController = {
  // Listar detalles, opcionalmente por id_venta o id_producto, con paginación
  async getAll(req, res) {
    try {
      const { id_venta, id_producto, page = 1, limit = 50 } = req.query;
      const offset = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);
      const params = [];
      const where = [];
      let idx = 1;
      if (id_venta) { where.push(`id_venta = $${idx}`); params.push(id_venta); idx++; }
      if (id_producto) { where.push(`id_producto = $${idx}`); params.push(id_producto); idx++; }
      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const sql = `SELECT * FROM detalle_venta ${whereSQL} ORDER BY id_detalle DESC LIMIT $${idx} OFFSET $${idx+1}`;
      params.push(limit, offset);
      const result = await db.query(sql, params);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('detalleVentaController.getAll error:', error);
      return res.status(500).json({ success: false, message: 'Error obteniendo detalles de venta' });
    }
  },

  async getById(req, res) {
    const { id } = req.params;
    try {
      const result = await db.query('SELECT * FROM detalle_venta WHERE id_detalle=$1', [id]);
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('detalleVentaController.getById error:', error);
      return res.status(500).json({ success: false, message: 'Error obteniendo detalle' });
    }
  },

  // Crear detalle (trigger descontará stock e insertará historial si lo tienes)
  async create(req, res) {
    const { id_venta, id_producto, cantidad, precio_unitario } = req.body;
    if (!id_venta || !id_producto || cantidad == null || precio_unitario == null) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
    }
    const subtotal = parseFloat(cantidad) * parseFloat(precio_unitario);
    try {
      await db.query('BEGIN');
      const insert = await db.query(
        `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id_venta, id_producto, cantidad, precio_unitario, subtotal]
      );
      // trigger descontar_stock() (AFTER INSERT) debe ajustar stock y escribir historial_inventario si lo configuraste
      await db.query('COMMIT');
      return res.status(201).json({ success: true, data: insert.rows[0] });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('detalleVentaController.create error:', error);
      return res.status(500).json({ success: false, message: 'Error creando detalle de venta' });
    }
  },

  // Actualizar detalle: ajustar stock/historial según delta o cambio de producto
  async update(req, res) {
    const { id } = req.params;
    const { id_producto: newProducto, cantidad: newCantidad, precio_unitario: newPrecio } = req.body;
    try {
      await db.query('BEGIN');
      const curRes = await db.query('SELECT * FROM detalle_venta WHERE id_detalle=$1', [id]);
      if (curRes.rowCount === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
      }
      const old = curRes.rows[0];
      const idVenta = old.id_venta;
      const oldProducto = old.id_producto;
      const oldCantidad = parseFloat(old.cantidad);
      const precioUnitario = newPrecio != null ? newPrecio : old.precio_unitario;
      const cantidadFinal = newCantidad != null ? parseFloat(newCantidad) : oldCantidad;
      const productoFinal = newProducto != null ? newProducto : oldProducto;
      const subtotal = cantidadFinal * precioUnitario;

      if (productoFinal === oldProducto) {
        // mismo producto: ajustar por delta
        const delta = cantidadFinal - oldCantidad; // new - old
        if (delta !== 0) {
          // disminuye stock si delta > 0, aumenta si delta < 0
          await db.query('UPDATE productos SET stock = stock - $1 WHERE id_producto=$2', [delta, oldProducto]);
          await db.query(
            `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
             VALUES ($1,$2,$3,$4)`,
            [oldProducto, -delta, 'ajuste_detalle_venta', null]
          );
        }
      } else {
        // cambió de producto: revertir efecto sobre producto viejo y aplicar al nuevo
        // revertir viejo: sumamos la cantidad anterior
        await db.query('UPDATE productos SET stock = stock + $1 WHERE id_producto=$2', [oldCantidad, oldProducto]);
        await db.query(
          `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
           VALUES ($1,$2,$3,$4)`,
          [oldProducto, oldCantidad, 'revertir_cambio_detalle', null]
        );
        // aplicar al nuevo producto: restar la nueva cantidad
        await db.query('UPDATE productos SET stock = stock - $1 WHERE id_producto=$2', [cantidadFinal, productoFinal]);
        await db.query(
          `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
           VALUES ($1,$2,$3,$4)`,
          [productoFinal, -cantidadFinal, 'aplicar_cambio_detalle', null]
        );
      }

      // Actualizar fila detalle_venta
      const upd = await db.query(
        `UPDATE detalle_venta
         SET id_producto=$1, cantidad=$2, precio_unitario=$3, subtotal=$4
         WHERE id_detalle=$5
         RETURNING *`,
        [productoFinal, cantidadFinal, precioUnitario, subtotal, id]
      );

      await db.query('COMMIT');
      return res.json({ success: true, data: upd.rows[0] });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('detalleVentaController.update error:', error);
      return res.status(500).json({ success: false, message: 'Error actualizando detalle de venta' });
    }
  },

  // Borrar detalle: revertir stock/historial
  async delete(req, res) {
    const { id } = req.params;
    try {
      await db.query('BEGIN');
      const curRes = await db.query('SELECT * FROM detalle_venta WHERE id_detalle=$1', [id]);
      if (curRes.rowCount === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
      }
      const old = curRes.rows[0];
      // Revertir stock
      await db.query('UPDATE productos SET stock = stock + $1 WHERE id_producto=$2', [old.cantidad, old.id_producto]);
      await db.query(
        `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
         VALUES ($1,$2,$3,$4)`,
        [old.id_producto, old.cantidad, 'eliminar_detalle_venta', null]
      );
      // Borrar detalle
      await db.query('DELETE FROM detalle_venta WHERE id_detalle=$1', [id]);
      await db.query('COMMIT');
      return res.json({ success: true, message: 'Detalle eliminado' });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('detalleVentaController.delete error:', error);
      return res.status(500).json({ success: false, message: 'Error eliminando detalle' });
    }
  }
};

module.exports = detalleVentaController;
