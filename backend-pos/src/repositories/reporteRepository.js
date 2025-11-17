// src/repositories/reporteRepository.js
const db = require('../config/database');
const Reporte = require('../models/Reporte');
const ModelMapper = require('../utils/modelMapper');

/**
 * Repositorio para manejar las operaciones de Reportes en la BD.
 */
const reporteRepository = {

    /**
     * Busca reportes con filtros y paginación.
     */
    async findAll({ whereSQL, params, limit, offset }) {
        const dataSql = `
            SELECT r.*, u.nombre as usuario_nombre
            FROM reportes r
            LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
            ${whereSQL}
            ORDER BY r.fecha_generado DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `SELECT COUNT(*)::int AS total FROM reportes r ${whereSQL}`;

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params)
        ]);

        const reportes = dataResult.rows.map(row => Reporte.fromDatabaseRow(row));
        const total = countResult.rows[0].total;
        
        return { reportes, total };
    },

    /**
     * Busca un reporte por ID con JOINs.
     */
    async findById(id) {
        const result = await db.query(
            `SELECT r.*, u.nombre as usuario_nombre
             FROM reportes r
             LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
             WHERE r.id_reporte = $1`,
            [id]
        );
        if (result.rows.length === 0) return null;
        return Reporte.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Busca todos los reportes que coinciden con los filtros (para estadísticas).
     */
    async findAllForStats({ whereSQL, params }) {
        const result = await db.query(
            `SELECT r.*, u.nombre as usuario_nombre
             FROM reportes r
             LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
             ${whereSQL}
             ORDER BY r.fecha_generado DESC`,
            params
        );
        return result.rows.map(row => Reporte.fromDatabaseRow(row));
    },

    /**
     * Crea un nuevo reporte (requiere client).
     */
    async create(reporte, descripcion, client) {
        const { tipo, id_usuario, contenido, fecha_generado } = reporte;
        const result = await client.query(
            `INSERT INTO reportes (tipo, id_usuario, descripcion, contenido, fecha_generado)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [tipo, id_usuario, descripcion, contenido, fecha_generado]
        );
        return Reporte.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Elimina un reporte (requiere client).
     */
    async delete(id, client) {
        await client.query('DELETE FROM reportes WHERE id_reporte = $1', [id]);
    },

    // --- Consultas para Generación de Reportes ---

    /**
     * Obtiene los datos para el reporte 'ventas_dia'.
     */
    async getReporteVentasDia(fecha, client) {
        const result = await client.query(
            `SELECT v.*, u.nombre as usuario_nombre,
                    COUNT(dv.id_detalle) as total_items,
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'producto_nombre', p.nombre,
                            'cantidad', dv.cantidad,
                            'precio_unitario', dv.precio_unitario,
                            'subtotal', dv.subtotal
                        )
                    ) as items
             FROM ventas v
             LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
             LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
             LEFT JOIN productos p ON dv.id_producto = p.id_producto
             WHERE DATE(v.fecha) = $1
             GROUP BY v.id_venta, u.nombre
             ORDER BY v.fecha DESC`,
            [fecha]
        );
        return result.rows;
    },

    /**
     * Obtiene los datos para el reporte 'top_productos'.
     */
    async getReporteTopProductos(whereCondition, params, client) {
        const result = await client.query(
            `SELECT p.nombre, p.codigo_barra, 
                    SUM(dv.cantidad) as total_vendido,
                    SUM(dv.subtotal) as total_ingresos,
                    COUNT(DISTINCT dv.id_venta) as veces_vendido
             FROM detalle_venta dv
             JOIN productos p ON dv.id_producto = p.id_producto
             JOIN ventas v ON dv.id_venta = v.id_venta
             ${whereCondition}
             GROUP BY p.id_producto, p.nombre, p.codigo_barra
             ORDER BY total_vendido DESC
             LIMIT $1`,
            params
        );
        return result.rows;
    },

    /**
     * Obtiene los datos para el reporte 'stock_bajo'.
     */
    async getReporteStockBajo(stock_minimo, client) {
        const result = await client.query(
            `SELECT p.*, c.nombre as categoria_nombre,
                    CASE 
                        WHEN p.stock = 0 THEN 'AGOTADO'
                        WHEN p.stock <= $1 THEN 'STOCK BAJO'
                        ELSE 'SUFICIENTE'
                    END as estado_stock
             FROM productos p
             LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
             WHERE p.stock <= $1
             ORDER BY p.stock ASC, p.nombre ASC`,
            [stock_minimo]
        );
        return result.rows;
    },

    /**
     * Obtiene los datos para el reporte 'inventario'.
     */
    async getReporteInventario(client) {
        const result = await client.query(
            `SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre,
                    (p.precio_venta - p.precio_compra) as ganancia_unitaria,
                    (p.stock * (p.precio_venta - p.precio_compra)) as ganancia_total_stock
             FROM productos p
             LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
             LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
             ORDER BY p.nombre ASC`
        );
        return result.rows;
    }
};

// --- Repositorio mínimo para dependencias ---
const usuarioRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = $1", [id]);
        return result.rows[0];
    }
};

module.exports = {
    reporteRepository,
    usuarioRepository
};