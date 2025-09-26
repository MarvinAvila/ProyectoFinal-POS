const db = require('../config/database');

const comprobanteController = {
    async getByVenta(req, res) {
        const { id_venta } = req.params;
        try {
            const result = await db.query('SELECT * FROM comprobantes WHERE id_venta=$1', [id_venta]);
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("Error getByVenta comprobantes:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo comprobantes" });
        }
    },

    async create(req, res) {
        const { id_venta, tipo, contenido } = req.body;
        if (!id_venta || !contenido)
            return res.status(400).json({ success: false, message: "Faltan datos del comprobante" });
        try {
            const result = await db.query(
                'INSERT INTO comprobantes (id_venta,tipo,contenido) VALUES ($1,$2,$3) RETURNING *',
                [id_venta, tipo || 'ticket', contenido]
            );
            return res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error("Error create comprobante:", error);
            return res.status(500).json({ success: false, message: "Error creando comprobante" });
        }
    }
};

module.exports = comprobanteController;
