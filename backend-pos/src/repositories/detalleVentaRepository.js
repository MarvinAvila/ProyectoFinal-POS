// src/repositories/detalleVentaRepository.js
const db = require('../config/database');
const ModelMapper = require('../utils/modelMapper');
const QueryBuilder = require('../utils/queryBuilder');

/**
 * Repositorio para manejar las operaciones de DetalleVenta en la BD.
 */
const detalleVentaRepository = {

    /**
     * Busca detalles con filtros y paginación.
     */
    async findAll({ id_venta, id_producto }, { limit, offset }) {
        const params = [];
        const where = [];
        let idx = 1;

        if (id_venta) {
            where.push(`dv.id_venta = $${idx++}`);
            params.push(id_venta);
        }
        if (id_producto) {
            where.push(`dv.id_producto = $${idx++}`);
            params.push(id_producto);
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
        params.push(limit, offset);

        const dataSql = `
            SELECT dv.*, p.nombre as producto_nombre, v.total as venta_total, v.fecha as venta_fecha
            FROM detalle_venta dv
            LEFT JOIN productos p ON dv.id_producto = p.id_producto
            LEFT JOIN ventas v ON dv.id_venta = v.id_venta
            ${whereSQL} 
            ORDER BY dv.id_detalle DESC 
            LIMIT $${idx} OFFSET $${idx + 1}
        `;
        
        const countSql = `SELECT COUNT(*) FROM detalle_venta dv ${whereSQL}`;
        
        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, params),
            db.query(countSql, params.slice(0, -2)) // Quita limit y offset
        ]);

        const detalles = ModelMapper.toDetalleVentaList(dataResult.rows);
        const total = parseInt(countResult.rows[0].count);
        return { detalles, total };
    },

    /**
     * Busca un detalle por ID con JOINs para información completa.
     */
    async findById(id) {
        const result = await db.query(`
            SELECT dv.*, p.nombre as producto_nombre, p.codigo_barra,
                   v.total as venta_total, v.fecha as venta_fecha,
                   u.nombre as usuario_nombre
            FROM detalle_venta dv
            LEFT JOIN productos p ON dv.id_producto = p.id_producto
            LEFT JOIN ventas v ON dv.id_venta = v.id_venta
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            WHERE dv.id_detalle = $1
        `, [id]);
        
        if (result.rows.length === 0) return null;
        return ModelMapper.toDetalleVenta(result.rows[0]);
    },

    /**
     * Busca un detalle por ID (simple, para transacciones).
     */
    async findByIdSimple(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT * FROM detalle_venta WHERE id_detalle = $1", [id]);
        if (result.rows.length === 0) return null;
        return ModelMapper.toDetalleVenta(result.rows[0]);
    },

    /**
     * Crea un nuevo detalle (requiere client).
     */
    async create(detalle, client) {
        const { id_venta, id_producto, cantidad, precio_unitario, subtotal } = detalle;
        const result = await client.query(
            `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_venta, id_producto, cantidad, precio_unitario, subtotal]
        );
        return ModelMapper.toDetalleVenta(result.rows[0]);
    },

    /**
     * Actualiza un detalle (requiere client).
     */
    async update(id, updates, client) {
        // updates = { id_producto, cantidad, precio_unitario, subtotal }
        const { sql, params } = QueryBuilder.buildUpdateQuery('detalle_venta', updates, 'id_detalle', id);
        const result = await client.query(sql, params);
        return ModelMapper.toDetalleVenta(result.rows[0]);
    },
    
    /**
     * Actualiza un detalle parcialmente (PATCH) (requiere client).
     */
    async patch(id, updates, client) {
        const { sql, params } = QueryBuilder.buildUpdateQuery('detalle_venta', updates, 'id_detalle', id);
        const result = await client.query(sql, params);
        return ModelMapper.toDetalleVenta(result.rows[0]);
    },

    /**
     * Elimina un detalle (requiere client).
     */
    async delete(id, client) {
        await client.query("DELETE FROM detalle_venta WHERE id_detalle = $1", [id]);
    },
    
    /**
     * Busca detalles por ID de Venta (paginado).
     */
    async findByVentaId(id_venta, { limit, offset }) {
        const dataSql = `
            SELECT dv.*, p.nombre as producto_nombre, p.codigo_barra,
                   p.precio_compra, c.nombre as categoria_nombre
            FROM detalle_venta dv
            LEFT JOIN productos p ON dv.id_producto = p.id_producto
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE dv.id_venta = $1
            ORDER BY dv.id_detalle
            LIMIT $2 OFFSET $3
        `;
        const countSql = "SELECT COUNT(*) FROM detalle_venta WHERE id_venta = $1";

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [id_venta, limit, offset]),
            db.query(countSql, [id_venta])
        ]);

        const detalles = ModelMapper.toDetalleVentaList(dataResult.rows);
        const total = parseInt(countResult.rows[0].count);
        return { detalles, total };
    },
    
    /**
     * Busca detalles por ID de Producto (paginado y con filtros).
     */
    async findByProductoId({ id_producto, fecha_inicio, fecha_fin }, { limit, offset }) {
        const params = [id_producto];
        let whereClause = "WHERE dv.id_producto = $1";
        let paramIndex = 2;

        if (fecha_inicio) {
            whereClause += ` AND v.fecha >= $${paramIndex++}`;
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            whereClause += ` AND v.fecha <= $${paramIndex++}`;
            params.push(fecha_fin + ' 23:59:59');
        }

        params.push(limit, offset);
        const countParams = params.slice(0, -2);

        const dataSql = `
            SELECT dv.*, v.fecha as venta_fecha, v.total as venta_total, u.nombre as vendedor_nombre
            FROM detalle_venta dv
            LEFT JOIN ventas v ON dv.id_venta = v.id_venta
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            ${whereClause}
            ORDER BY v.fecha DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const countSql = `
            SELECT COUNT(*) 
            FROM detalle_venta dv
            LEFT JOIN ventas v ON dv.id_venta = v.id_venta
            ${whereClause}
        `;

        const statsSql = `
            SELECT 
                COUNT(DISTINCT dv.id_venta) as total_ventas, SUM(dv.cantidad) as total_vendido,
                SUM(dv.subtotal) as ingresos_totales, AVG(dv.precio_unitario) as precio_promedio
            FROM detalle_venta dv
            LEFT JOIN ventas v ON dv.id_venta = v.id_venta
            ${whereClause}
        `;

        const [dataResult, countResult, statsResult] = await Promise.all([
            db.query(dataSql, params),
            db.query(countSql, countParams),
            db.query(statsSql, countParams)
        ]);

        const detalles = ModelMapper.toDetalleVentaList(dataResult.rows);
        const total = parseInt(countResult.rows[0].count);
        const estadisticas = statsResult.rows[0];
        
        return { detalles, total, estadisticas };
    },

    /**
     * Suma la cantidad de un producto en una venta (para validar stock).
     */
    async getCantidadReservada(id_venta, id_producto) {
        const result = await db.query(
            `SELECT SUM(cantidad) as cantidad_reservada 
             FROM detalle_venta 
             WHERE id_venta = $1 AND id_producto = $2`,
            [id_venta, id_producto]
        );
        return parseFloat(result.rows[0].cantidad_reservada) || 0;
    },
    
    /**
     * Obtiene estadísticas de un producto.
     */
    async getEstadisticasProducto(id_producto) {
        const result = await db.query(`
            SELECT 
                COUNT(DISTINCT dv.id_venta) as total_ventas, SUM(dv.cantidad) as total_vendido,
                SUM(dv.subtotal) as ingresos_totales, AVG(dv.precio_unitario) as precio_promedio,
                MIN(dv.precio_unitario) as precio_minimo, MAX(dv.precio_unitario) as precio_maximo,
                SUM(dv.cantidad * p.precio_compra) as costo_total,
                SUM(dv.subtotal - (dv.cantidad * p.precio_compra)) as utilidad_total
            FROM detalle_venta dv
            LEFT JOIN productos p ON dv.id_producto = p.id_producto
            WHERE dv.id_producto = $1
            GROUP BY dv.id_producto
        `, [id_producto]);
        return result.rows[0];
    },

    /**
     * Obtiene estadísticas de una venta.
     */
    async getEstadisticasVenta(id_venta) {
        const result = await db.query(`
            SELECT COUNT(*) as total_productos, SUM(dv.cantidad) as total_items,
                   SUM(dv.subtotal) as subtotal_venta, AVG(dv.precio_unitario) as precio_promedio
            FROM detalle_venta dv
            WHERE dv.id_venta = $1
        `, [id_venta]);
        return result.rows[0];
    },

    /**
     * Genera un reporte de ventas por productos (o categorías, etc.).
     */
    async getReporteVentasProductos(whereClause, groupByClause, selectFields, params) {
        const sql = `
            SELECT 
              ${selectFields}
              COUNT(DISTINCT dv.id_venta) as total_ventas,
              SUM(dv.cantidad) as total_vendido,
              SUM(dv.subtotal) as ingresos_totales,
              AVG(dv.precio_unitario) as precio_promedio,
              SUM(dv.cantidad * p.precio_compra) as costo_total,
              SUM(dv.subtotal - (dv.cantidad * p.precio_compra)) as utilidad_total
            FROM detalle_venta dv
            LEFT JOIN ventas v ON dv.id_venta = v.id_venta
            LEFT JOIN productos p ON dv.id_producto = p.id_producto
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            ${whereClause}
            ${groupByClause}
            ORDER BY ingresos_totales DESC
        `;
        const result = await db.query(sql, params);
        return result.rows;
    },

    /**
     * Genera un reporte de Top Productos.
     */
    async getReporteTopProductos(fechaFiltro, orderBy, limit) {
        const sql = `
            SELECT 
              p.id_producto, p.nombre as producto_nombre, p.codigo_barra,
              c.nombre as categoria_nombre,
              COUNT(DISTINCT dv.id_venta) as total_ventas,
              SUM(dv.cantidad) as total_vendido,
              SUM(dv.subtotal) as ingresos_totales,
              AVG(dv.precio_unitario) as precio_promedio,
              SUM(dv.cantidad * p.precio_compra) as costo_total,
              SUM(dv.subtotal - (dv.cantidad * p.precio_compra)) as utilidad_total,
              (SUM(dv.subtotal - (dv.cantidad * p.precio_compra)) / NULLIF(SUM(dv.subtotal), 0)) * 100 as margen_utilidad
            FROM detalle_venta dv
            LEFT JOIN ventas v ON dv.id_venta = v.id_venta
            LEFT JOIN productos p ON dv.id_producto = p.id_producto
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE ${fechaFiltro}
            GROUP BY p.id_producto, p.nombre, p.codigo_barra, c.nombre
            ORDER BY ${orderBy}
            LIMIT $1
        `;
        const result = await db.query(sql, [limit]);
        return result.rows;
    }
};

// --- Repositorios mínimos para dependencias de transacciones ---

const productoRepository = {
    /**
     * Busca un producto por ID (para stock y nombre).
     * @param {number} id
     * @param {object} client - Cliente de la transacción
     */
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query(
            "SELECT id_producto, nombre, stock FROM productos WHERE id_producto = $1",
            [id]
        );
        return result.rows[0];
    },
    
    /**
     * Busca un producto por ID y lo bloquea para actualización (evita race conditions).
     * @param {number} id
     * @param {object} client - Cliente de la transacción
     */
    async findByIdForUpdate(id, client) {
        const result = await client.query(
            "SELECT nombre, stock FROM productos WHERE id_producto = $1 FOR UPDATE", 
            [id]
        );
        return result.rows[0];
    },

    /**
     * Actualiza el stock de un producto (requiere client).
     * @param {number} id - ID del producto
     * @param {number} deltaCantidad - El cambio en el stock (positivo para restar, negativo para sumar)
     * @param {object} client - Cliente de la transacción
     */
    async updateStock(id, deltaCantidad, client) {
        await client.query(
            "UPDATE productos SET stock = stock - $1 WHERE id_producto = $2",
            [deltaCantidad, id]
        );
    }
};

const ventaRepository = {
    /**
     * Verifica si una venta existe (para transacciones).
     */
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query(
            "SELECT id_venta FROM ventas WHERE id_venta = $1",
            [id]
        );
        return result.rows[0];
    }
};

const historialInventarioRepository = {
    /**
     * Crea un nuevo registro en el historial (requiere client).
     */
    async create(movimiento, client) {
        const { id_producto, cambio, motivo, fecha, id_usuario } = movimiento;
        await client.query(
            `INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_producto, cambio, motivo, fecha, id_usuario]
        );
    }
};

// Exportar todos los repositorios necesarios para el servicio
module.exports = {
    detalleVentaRepository,
    productoRepository,
    ventaRepository,
    historialInventarioRepository
};