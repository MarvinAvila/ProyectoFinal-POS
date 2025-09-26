const db = require('../config/database');
const HistorialInventario = require('../models/HistorialInventario');

const inventarioController = {
    async historial(req, res) {
        try {
            const result = await db.query('SELECT * FROM historial_inventario ORDER BY fecha DESC');
            return res.status(200).json({ success: true, data: result.rows });
        } catch (error) {
            console.error("Error en inventario historial:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo historial" });
        }
    },

    async ajuste(req, res) {
        const { id_producto, cambio, motivo, id_usuario } = req.body;
        if (!id_producto || !cambio || !motivo) {
            return res.status(400).json({ success: false, message: "Faltan datos para el ajuste" });
        }
        try {
            await db.query('BEGIN');
            const insertHist = await db.query(
                `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
                 VALUES ($1,$2,$3,$4) RETURNING *`,
                [id_producto, cambio, motivo, id_usuario]
            );
            await db.query(`UPDATE productos SET stock = stock + $1 WHERE id_producto=$2`, [cambio, id_producto]);
            await db.query('COMMIT');
            return res.status(201).json({ success: true, data: insertHist.rows[0] });
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error en inventario ajuste:", error);
            return res.status(500).json({ success: false, message: "Error registrando ajuste de inventario" });
        }
    }
};

module.exports = inventarioController;
