const db = require('../config/database');
const Categoria = require('../models/Categoria');

const categoriaController = {
    async getAll(req, res) {
        try {
            const result = await db.query('SELECT * FROM categorias ORDER BY id_categoria');
            return res.status(200).json({
                success: true,
                data: result.rows.map(row => new Categoria(row.id_categoria, row.nombre, row.descripcion))
            });
        } catch (error) {
            console.error("Error en getAll categorías:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo categorías" });
        }
    },

    async getById(req, res) {
        const { id } = req.params;
        try {
            const result = await db.query('SELECT * FROM categorias WHERE id_categoria=$1', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: "Categoría no encontrada" });
            }
            const row = result.rows[0];
            return res.status(200).json({ success: true, data: new Categoria(row.id_categoria, row.nombre, row.descripcion) });
        } catch (error) {
            console.error("Error en getById categoría:", error);
            return res.status(500).json({ success: false, message: "Error obteniendo categoría" });
        }
    },

    async create(req, res) {
        const { nombre, descripcion } = req.body;
        if (!nombre) {
            return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
        }
        try {
            const result = await db.query(
                'INSERT INTO categorias (nombre, descripcion) VALUES ($1,$2) RETURNING *',
                [nombre, descripcion]
            );
            const row = result.rows[0];
            return res.status(201).json({ success: true, data: new Categoria(row.id_categoria, row.nombre, row.descripcion) });
        } catch (error) {
            console.error("Error en create categoría:", error);
            return res.status(500).json({ success: false, message: "Error creando categoría" });
        }
    },

    async update(req, res) {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        try {
            const result = await db.query(
                'UPDATE categorias SET nombre=$1, descripcion=$2 WHERE id_categoria=$3 RETURNING *',
                [nombre, descripcion, id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: "Categoría no encontrada" });
            }
            const row = result.rows[0];
            return res.status(200).json({ success: true, data: new Categoria(row.id_categoria, row.nombre, row.descripcion) });
        } catch (error) {
            console.error("Error en update categoría:", error);
            return res.status(500).json({ success: false, message: "Error actualizando categoría" });
        }
    },

    async delete(req, res) {
        const { id } = req.params;
        try {
            const result = await db.query('DELETE FROM categorias WHERE id_categoria=$1', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: "Categoría no encontrada" });
            }
            return res.status(200).json({ success: true, message: "Categoría eliminada" });
        } catch (error) {
            console.error("Error en delete categoría:", error);
            return res.status(500).json({ success: false, message: "Error eliminando categoría" });
        }
    }
};

module.exports = categoriaController;
