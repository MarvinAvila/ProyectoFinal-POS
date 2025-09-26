    const db = require('../config/database');

const alertaController = {
    async getAll(req, res) {
        try {
            const result = await db.query('SELECT * FROM alertas ORDER BY fecha DESC');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("Error getAll alertas:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo alertas" });
        }
    },

    async getPendientes(req, res) {
        try {
            const result = await db.query('SELECT * FROM alertas WHERE atendida=FALSE ORDER BY fecha DESC');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("Error getPendientes alertas:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo alertas pendientes" });
        }
    },

    async marcarAtendida(req, res) {
        const { id } = req.params;
        try {
            const result = await db.query('UPDATE alertas SET atendida=TRUE WHERE id_alerta=$1 RETURNING *', [id]);
            if (result.rowCount === 0)
                return res.status(404).json({ success: false, message: "Alerta no encontrada" });
            return res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error("Error marcarAtendida:", error);
            return res.status(500).json({ success: false, message: "Error actualizando alerta" });
        }
    }
};

module.exports = alertaController;
