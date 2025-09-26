const db = require('../config/database');
const Oferta = require('../models/Oferta');

const ofertaController = {
    async getAll(req, res) {
        try {
            const result = await db.query('SELECT * FROM ofertas ORDER BY fecha_inicio DESC');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("Error getAll ofertas:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo ofertas" });
        }
    },

    async getById(req, res) {
        const { id } = req.params;
        try {
            const result = await db.query('SELECT * FROM ofertas WHERE id_oferta=$1', [id]);
            if (result.rowCount === 0)
                return res.status(404).json({ success: false, message: "Oferta no encontrada" });
            return res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error("Error getById oferta:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo oferta" });
        }
    },

    async create(req, res) {
        const { nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin } = req.body;
        try {
            const result = await db.query(
                `INSERT INTO ofertas (nombre,descripcion,porcentaje_descuento,fecha_inicio,fecha_fin)
                 VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                [nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin]
            );
            return res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error("Error create oferta:", error);
            return res.status(500).json({ success: false, message: "Error creando oferta" });
        }
    },

    async update(req, res) {
        const { id } = req.params;
        const { nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo } = req.body;
        try {
            const result = await db.query(
                `UPDATE ofertas SET nombre=$1, descripcion=$2, porcentaje_descuento=$3, fecha_inicio=$4, fecha_fin=$5, activo=$6 
                 WHERE id_oferta=$7 RETURNING *`,
                [nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo, id]
            );
            if (result.rowCount === 0)
                return res.status(404).json({ success: false, message: "Oferta no encontrada" });
            return res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error("Error update oferta:", error);
            return res.status(500).json({ success: false, message: "Error actualizando oferta" });
        }
    },

    async delete(req, res) {
        const { id } = req.params;
        try {
            const result = await db.query('DELETE FROM ofertas WHERE id_oferta=$1', [id]);
            if (result.rowCount === 0)
                return res.status(404).json({ success: false, message: "Oferta no encontrada" });
            return res.json({ success: true, message: "Oferta eliminada" });
        } catch (error) {
            console.error("Error delete oferta:", error);
            return res.status(500).json({ success: false, message: "Error eliminando oferta" });
        }
    },

    async asignarProducto(req, res) {
        const { id_producto, id_oferta } = req.body;
        try {
            await db.query('INSERT INTO producto_oferta (id_producto,id_oferta) VALUES ($1,$2)', [id_producto, id_oferta]);
            return res.json({ success: true, message: "Producto asignado a oferta" });
        } catch (error) {
            console.error("Error asignarProducto:", error);
            return res.status(500).json({ success: false, message: "Error asignando producto a oferta" });
        }
    }
};

module.exports = ofertaController;
