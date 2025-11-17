// src/repositories/ventaRepository.js

const db = require('../config/database');
const ModelMapper = require('../utils/modelMapper');

/**
 * Repositorio para manejar las operaciones de Ventas en la BD.
 */
const ventaRepository = {

    /**
     * Busca ventas con filtros, paginación y estadísticas.
     */
    async findAll({ whereSQL, params, limit, offset }) {
        const dataSql = `
            SELECT v.*, u.nombre as usuario_nombre,
                   COUNT(dv.id_detalle) as total_detalles,
                   SUM(dv.cantidad) as total_productos
            FROM ventas v
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
            ${whereSQL}
            GROUP BY v.id_venta, u.nombre
            ORDER BY v.fecha DESC 
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `SELECT COUNT(*) FROM ventas v ${whereSQL}`;
        
        const statsSql = `
            SELECT COUNT(*) as total_ventas, SUM(total) as ingresos_totales, AVG(total) as promedio_venta
            FROM ventas v
            ${whereSQL}
        `;

        const [dataResult, countResult, statsResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params),
            db.query(statsSql, params)
        ]);

        const ventas = ModelMapper.toVentaList(dataResult.rows);
        // Agregar información adicional a cada venta
        ventas.forEach(venta => {
            const row = dataResult.rows.find(r => r.id_venta === venta.id_venta);
            venta.usuario_nombre = row?.usuario_nombre || null;
            venta.total_detalles = row ? parseInt(row.total_detalles) : 0;
            venta.total_productos = row ? parseFloat(row.total_productos) : 0;
        });
        
        const total = parseInt(countResult.rows[0].count);
        const estadisticas = {
            total_ventas: parseInt(statsResult.rows[0].total_ventas) || 0,
            ingresos_totales: parseFloat(statsResult.rows[0].ingresos_totales) || 0,
            promedio_venta: parseFloat(statsResult.rows[0].promedio_venta) || 0
        };

        return { ventas, total, estadisticas };
    },

    /**
     * Busca una Venta por ID con JOINs.
     */
    async findById(id) {
        const result = await db.query(`
            SELECT v.*, u.nombre as usuario_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            WHERE v.id_venta = $1
        `, [id]);
        
        if (result.rows.length === 0) return null;
        const venta = ModelMapper.toVenta(result.rows[0]);
        venta.usuario_nombre = result.rows[0].usuario_nombre;
        return venta;
    },

    /**
     * Busca los detalles de una venta.
     */
    async findDetallesByVentaId(id_venta) {
        const result = await db.query(`
            SELECT dv.*, p.nombre as producto_nombre, p.codigo_barra
            FROM detalle_venta dv
            JOIN productos p ON dv.id_producto = p.id_producto
            WHERE dv.id_venta = $1
            ORDER BY dv.id_detalle
        `, [id_venta]);
        return ModelMapper.toDetalleVentaList(result.rows);
    },

    /**
     * Busca los comprobantes de una venta.
     */
    async findComprobantesByVentaId(id_venta) {
        const result = await db.query(`SELECT * FROM comprobantes WHERE id_venta = $1`, [id_venta]);
        return result.rows; // Devuelve datos crudos
    },

    /**
     * Crea una nueva venta (requiere client).
     */
    async create(venta, client) {
        const { fecha, id_usuario, forma_pago, subtotal, iva, total } = venta;
        const result = await client.query(`
            INSERT INTO ventas (fecha, id_usuario, forma_pago, subtotal, iva, total)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [fecha, id_usuario, forma_pago, subtotal, iva, total]);
        return ModelMapper.toVenta(result.rows[0]);
    },

    /**
     * Elimina una venta (requiere client).
     */
    async delete(id_venta, client) {
        await client.query('DELETE FROM ventas WHERE id_venta = $1', [id_venta]);
    },
    
    /**
     * Elimina los detalles de una venta (requiere client).
     */
    async deleteDetalles(id_venta, client) {
        await client.query('DELETE FROM detalle_venta WHERE id_venta = $1', [id_venta]);
    },
    
    /**
     * Elimina los comprobantes de una venta (requiere client).
     */
    async deleteComprobantes(id_venta, client) {
        await client.query('DELETE FROM comprobantes WHERE id_venta = $1', [id_venta]);
    },
    
    // --- Métodos de reportes ---

    async getEstadisticas(whereSQL, params) {
        const statsResult = await db.query(`
            SELECT 
                COUNT(*) as total_ventas, SUM(total) as ingresos_totales,
                AVG(total) as promedio_venta, MIN(total) as venta_minima, MAX(total) as venta_maxima
            FROM ventas v
            ${whereSQL}
        `, params);
        
        const ventasPorDia = await db.query(`
            SELECT DATE(fecha) as fecha, COUNT(*) as cantidad_ventas, SUM(total) as ingresos_dia
            FROM ventas v
            ${whereSQL}
            GROUP BY DATE(fecha)
            ORDER BY fecha DESC
            LIMIT 30
        `, params);
        
        const productosPopulares = await db.query(`
            SELECT 
                p.nombre, p.codigo_barra, SUM(dv.cantidad) as total_vendido,
                SUM(dv.subtotal) as ingresos_producto
            FROM detalle_venta dv
            JOIN productos p ON dv.id_producto = p.id_producto
            JOIN ventas v ON dv.id_venta = v.id_venta
            ${whereSQL ? 'WHERE ' + whereSQL.replace(/v\./g, 'v.') : ''}
            GROUP BY p.id_producto, p.nombre, p.codigo_barra
            ORDER BY total_vendido DESC
            LIMIT 10
        `, params);

        return {
            general: statsResult.rows[0],
            ventas_por_dia: ventasPorDia.rows,
            productos_populares: productosPopulares.rows
        };
    },
    
    async getTopProductos() {
        const { rows } = await db.query(`
            SELECT 
              p.id_producto, p.nombre AS producto,
              SUM(dv.cantidad) AS unidades_vendidas,
              SUM(dv.subtotal) AS total_vendido
            FROM detalle_venta dv
            JOIN productos p ON p.id_producto = dv.id_producto
            GROUP BY p.id_producto, p.nombre
            ORDER BY total_vendido DESC
            LIMIT 10;
        `);
        return rows;
    },

    async getVentasDelDia(inicioDia, finDia) {
        const ventasQuery = `
            SELECT v.id_venta, v.fecha, v.forma_pago, v.total, u.nombre AS usuario_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            WHERE v.fecha >= $1 AND v.fecha < $2
            ORDER BY v.fecha DESC
        `;
        const totalQuery = `
            SELECT COUNT(*) AS total_ventas, COALESCE(SUM(total), 0) AS ingresos_totales
            FROM ventas
            WHERE fecha >= $1 AND fecha < $2
        `;
        
        const [ventasResult, totalResult] = await Promise.all([
            db.query(ventasQuery, [inicioDia, finDia]),
            db.query(totalQuery, [inicioDia, finDia])
        ]);

        return {
            ventas: ventasResult.rows,
            resumen: totalResult.rows[0]
        };
    }
};

// --- Repositorios mínimos para dependencias de transacciones ---

const usuarioRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT id_usuario FROM usuarios WHERE id_usuario = $1", [id]);
        return result.rows[0];
    }
};

const productoRepository = {
    async findByIdForUpdate(id, client) {
        const result = await client.query(
            "SELECT nombre, stock, precio_venta FROM productos WHERE id_producto = $1 FOR UPDATE", 
            [id]
        );
        return result.rows[0];
    },
    async updateStock(id, cantidadARestar, client) {
        await client.query("UPDATE productos SET stock = stock - $1 WHERE id_producto = $2", [cantidadARestar, id]);
    },
    async revertStock(id, cantidadASumar, client) {
        await client.query("UPDATE productos SET stock = stock + $1 WHERE id_producto = $2", [cantidadASumar, id]);
    }
};

const detalleVentaRepository = {
    async create(detalle, client) {
        const { id_venta, id_producto, cantidad, precio_unitario, subtotal } = detalle;
        await client.query(
            `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_venta, id_producto, cantidad, precio_unitario, subtotal]
        );
    }
};

const historialInventarioRepository = {
    async create(movimiento, client) {
        const { id_producto, cambio, motivo, fecha, id_usuario } = movimiento;
        await client.query(
            `INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_producto, cambio, motivo, fecha, id_usuario]
        );
    }
};

module.exports = {
    ventaRepository,
    usuarioRepository,
    productoRepository,
    detalleVentaRepository,
    historialInventarioRepository
};