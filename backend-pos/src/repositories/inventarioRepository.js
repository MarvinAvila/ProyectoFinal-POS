// src/repositories/inventarioRepository.js

const db = require('../config/database');
const HistorialInventario = require('../models/HistorialInventario');

/**
 * Repositorio para manejar las operaciones de HistorialInventario en la BD.
 */
const inventarioRepository = {

    /**
     * Busca en el historial con filtros y paginación.
     */
    async findAll({ whereSQL, params, limit, offset }) {
        
        const dataSql = `
            SELECT hi.*, p.nombre as producto_nombre, p.codigo_barra, u.nombre as usuario_nombre
            FROM historial_inventario hi
            LEFT JOIN productos p ON hi.id_producto = p.id_producto
            LEFT JOIN usuarios u ON hi.id_usuario = u.id_usuario
            ${whereSQL}
            ORDER BY hi.fecha DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `SELECT COUNT(*)::int AS total FROM historial_inventario hi ${whereSQL}`;

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params)
        ]);

        const movimientos = dataResult.rows.map(row => HistorialInventario.fromDatabaseRow(row));
        const total = countResult.rows[0].total;

        return { movimientos, total };
    },

    /**
     * Busca todos los movimientos para estadísticas (sin paginación).
     */
    async findAllForStats({ whereSQL, params }) {
        const result = await db.query(
            `SELECT hi.*, p.nombre as producto_nombre, u.nombre as usuario_nombre
             FROM historial_inventario hi
             LEFT JOIN productos p ON hi.id_producto = p.id_producto
             LEFT JOIN usuarios u ON hi.id_usuario = u.id_usuario
             ${whereSQL}
             ORDER BY hi.fecha DESC`,
            params
        );
        return result.rows.map(row => HistorialInventario.fromDatabaseRow(row));
    },

    /**
     * Crea un nuevo registro en el historial (requiere client).
     */
    async create(movimiento, client) {
        const { id_producto, cambio, motivo, fecha, id_usuario } = movimiento;
        const result = await client.query(
            `INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_producto, cambio, motivo, fecha, id_usuario]
        );
        return HistorialInventario.fromDatabaseRow(result.rows[0]);
    }
};

module.exports = inventarioRepository;