// src/controllers/productoOfertaController.js
const db = require('../config/database');

const productoOfertaController = {
  // Listar todas las relaciones (opcional join para detalle)
  async getAll(req, res) {
    try {
      const result = await db.query(`
        SELECT po.id_producto, po.id_oferta, p.nombre as producto_nombre, o.nombre as oferta_nombre, o.porcentaje_descuento
        FROM producto_oferta po
        LEFT JOIN productos p ON p.id_producto = po.id_producto
        LEFT JOIN ofertas o ON o.id_oferta = po.id_oferta
        ORDER BY o.fecha_inicio DESC NULLS LAST
      `);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('productoOfertaController.getAll error:', error);
      return res.status(500).json({ success: false, message: 'Error obteniendo producto_oferta' });
    }
  },

  async getOffersByProduct(req, res) {
    const { id_producto } = req.params;
    try {
      const result = await db.query(`
        SELECT o.*
        FROM producto_oferta po
        JOIN ofertas o ON o.id_oferta = po.id_oferta
        WHERE po.id_producto = $1
        ORDER BY o.fecha_inicio DESC
      `, [id_producto]);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('productoOfertaController.getOffersByProduct error:', error);
      return res.status(500).json({ success: false, message: 'Error obteniendo ofertas del producto' });
    }
  },

  async getProductsByOffer(req, res) {
    const { id_oferta } = req.params;
    try {
      const result = await db.query(`
        SELECT p.*
        FROM producto_oferta po
        JOIN productos p ON p.id_producto = po.id_producto
        WHERE po.id_oferta = $1
      `, [id_oferta]);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('productoOfertaController.getProductsByOffer error:', error);
      return res.status(500).json({ success: false, message: 'Error obteniendo productos de la oferta' });
    }
  },

  async assign(req, res) {
    const { id_producto, id_oferta } = req.body;
    if (!id_producto || !id_oferta) return res.status(400).json({ success: false, message: 'Faltan id_producto o id_oferta' });
    try {
      const result = await db.query(
        'INSERT INTO producto_oferta (id_producto, id_oferta) VALUES ($1,$2) RETURNING *',
        [id_producto, id_oferta]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('productoOfertaController.assign error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'La relación producto-oferta ya existe' });
      }
      return res.status(500).json({ success: false, message: 'Error asignando producto a oferta' });
    }
  },

  async unassign(req, res) {
    const { id_producto, id_oferta } = req.body;
    if (!id_producto || !id_oferta) return res.status(400).json({ success: false, message: 'Faltan id_producto o id_oferta' });
    try {
      const result = await db.query('DELETE FROM producto_oferta WHERE id_producto=$1 AND id_oferta=$2 RETURNING *', [id_producto, id_oferta]);
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Relación no encontrada' });
      return res.json({ success: true, message: 'Producto removido de la oferta' });
    } catch (error) {
      console.error('productoOfertaController.unassign error:', error);
      return res.status(500).json({ success: false, message: 'Error removiendo relación producto-oferta' });
    }
  }
};

module.exports = productoOfertaController;
