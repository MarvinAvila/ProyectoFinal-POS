const db = require('../config/database');

const dashboardController = {
    async resumen(req, res) {
        try {
            const ventasHoy = await db.query('SELECT COALESCE(SUM(total),0) as total FROM ventas WHERE DATE(fecha) = CURRENT_DATE');
            const productos = await db.query('SELECT COUNT(*) FROM productos');
            const usuarios = await db.query('SELECT COUNT(*) FROM usuarios');
            return res.status(200).json({
                success: true,
                data: {
                    ventas_hoy: ventasHoy.rows[0].total,
                    productos: productos.rows[0].count,
                    usuarios: usuarios.rows[0].count
                }
            });
        } catch (error) {
            console.error("Error en dashboard resumen:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo resumen" });
        }
    },

    async topProductos(req, res) {
        try {
            const result = await db.query(`
                SELECT p.nombre, SUM(dv.cantidad) as vendidos
                FROM detalle_venta dv
                JOIN productos p ON dv.id_producto = p.id_producto
                GROUP BY p.nombre
                ORDER BY vendidos DESC
                LIMIT 5
            `);
            return res.status(200).json({ success: true, data: result.rows });
        } catch (error) {
            console.error("Error en dashboard topProductos:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo top productos" });
        }
    }
};

module.exports = dashboardController;
