const db = require('../config/database');
const Alerta = require('../models/Alerta');

/**
 * Repositorio para manejar las operaciones de Alertas en la BD.
 * Nota: Los métodos que no necesitan transacción usan 'db.query'.
 * Los métodos que SÍ necesitan transacción (create, update, delete)
 * deben recibir el 'client' como argumento.
 */
const alertaRepository = {

    /**
     * Obtiene todas las alertas con filtros y paginación.
     */
    async findAll({ tipo, atendida, limit, offset }) {
        const whereConditions = [];
        const params = [];
        let paramIndex = 1;

        if (tipo) {
            whereConditions.push(`a.tipo = $${paramIndex}`);
            params.push(tipo);
            paramIndex++;
        }

        if (atendida !== undefined) {
            whereConditions.push(`a.atendida = $${paramIndex}`);
            params.push(atendida === 'true');
            paramIndex++;
        }

        const whereSQL = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const paginationSQL = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        // Query para los datos
        const dataQuery = `
            SELECT a.*, p.nombre AS producto_nombre, p.codigo_barra, p.stock, p.fecha_caducidad
            FROM alertas a
            JOIN productos p ON a.id_producto = p.id_producto
            ${whereSQL}
            AND (
              (a.tipo = 'stock_bajo' AND p.stock <= 5)
              OR (a.tipo = 'caducidad' AND p.fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days')
              OR (a.tipo NOT IN ('stock_bajo', 'caducidad'))
            )
            ORDER BY a.fecha DESC
            ${paginationSQL}`;

        const dataPromise = db.query(dataQuery, params);

        // Query para el conteo total (sin paginación)
        const countQuery = `
            SELECT COUNT(a.*)::int AS total 
            FROM alertas a
            JOIN productos p ON a.id_producto = p.id_producto
            ${whereSQL}
            AND (
              (a.tipo = 'stock_bajo' AND p.stock <= 5)
              OR (a.tipo = 'caducidad' AND p.fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days')
              OR (a.tipo NOT IN ('stock_bajo', 'caducidad'))
            )`;
        
        const countPromise = db.query(countQuery, params.slice(0, -2)); // Quita limit y offset

        // Ejecuta ambas consultas en paralelo
        const [dataResult, countResult] = await Promise.all([dataPromise, countPromise]);

        const alertas = dataResult.rows.map(row => Alerta.fromDatabaseRow(row));
        const total = countResult.rows[0].total;

        return { alertas, total };
    },

    /**
     * Obtiene solo las alertas pendientes (sin paginación)
     */
    async findPendientes() {
        const result = await db.query(
            `SELECT a.*, p.nombre as producto_nombre, p.codigo_barra, p.stock, p.fecha_caducidad
             FROM alertas a
             JOIN productos p ON a.id_producto = p.id_producto
             WHERE a.atendida = FALSE
             ORDER BY 
               CASE WHEN a.tipo = 'caducidad' THEN 1 ELSE 2 END,
               a.fecha DESC`
        );
        return result.rows.map(row => Alerta.fromDatabaseRow(row));
    },

    /**
     * Busca una alerta por su ID
     */
    async findById(id) {
        const result = await db.query(
            `SELECT a.*, p.nombre as producto_nombre, p.codigo_barra, p.stock, p.fecha_caducidad
             FROM alertas a
             JOIN productos p ON a.id_producto = p.id_producto
             WHERE a.id_alerta = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return Alerta.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Busca una alerta simple por ID (para transacciones)
     */
    async findByIdSimple(id, client) {
        const runner = client || db;
        const result = await runner.query('SELECT * FROM alertas WHERE id_alerta = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return Alerta.fromDatabaseRow(result.rows[0]);
    },
    
    /**
     * Busca una alerta pendiente por ID de producto (para transacciones)
     */
    async findPendienteByProductoId(productoId, client) {
        const runner = client || db;
        const result = await runner.query(
            'SELECT id_alerta FROM alertas WHERE id_producto = $1 AND tipo = $2 AND atendida = FALSE',
            [productoId, 'stock_bajo']
        );
        return result.rows[0];
    },

    /**
     * Marca una alerta como atendida (requiere client)
     */
    async marcarAtendida(id, client) {
        const result = await client.query(
            'UPDATE alertas SET atendida = TRUE, fecha_atendida = CURRENT_TIMESTAMP WHERE id_alerta = $1 RETURNING *',
            [id]
        );
        return Alerta.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Crea una nueva alerta (requiere client)
     */
    async create(alertaData, client) {
        const { id_producto, tipo, mensaje, fecha, atendida } = alertaData;
        const result = await client.query(
            `INSERT INTO alertas (id_producto, tipo, mensaje, fecha, atendida)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_producto, tipo, mensaje, fecha, atendida]
        );
        return Alerta.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Elimina una alerta (requiere client)
     */
    async delete(id, client) {
        await client.query('DELETE FROM alertas WHERE id_alerta = $1', [id]);
    },

    /**
     * Obtiene las estadísticas de alertas
     */
    async getEstadisticas(dias) {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_alertas,
                COUNT(*) FILTER (WHERE atendida = TRUE) as alertas_atendidas,
                COUNT(*) FILTER (WHERE atendida = FALSE) as alertas_pendientes,
                COUNT(*) FILTER (WHERE tipo = 'caducidad') as alertas_caducidad,
                COUNT(*) FILTER (WHERE tipo = 'stock_bajo') as alertas_stock_bajo
            FROM alertas
            WHERE fecha >= CURRENT_DATE - INTERVAL '${dias} days'`;
        
        const porDiaQuery = `
            SELECT 
                DATE(fecha) as fecha,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE tipo = 'caducidad') as caducidad,
                COUNT(*) FILTER (WHERE tipo = 'stock_bajo') as stock_bajo
            FROM alertas
            WHERE fecha >= CURRENT_DATE - INTERVAL '15 days'
            GROUP BY DATE(fecha)
            ORDER BY fecha DESC`;

        const topProductosQuery = `
            SELECT 
                p.nombre as producto_nombre,
                COUNT(a.id_alerta) as total_alertas,
                COUNT(a.id_alerta) FILTER (WHERE a.tipo = 'caducidad') as alertas_caducidad,
                COUNT(a.id_alerta) FILTER (WHERE a.tipo = 'stock_bajo') as alertas_stock
            FROM productos p
            JOIN alertas a ON p.id_producto = a.id_producto
            WHERE a.fecha >= CURRENT_DATE - INTERVAL '${dias} days'
            GROUP BY p.id_producto, p.nombre
            ORDER BY total_alertas DESC
            LIMIT 10`;

        const [statsResult, porDiaResult, topProductosResult] = await Promise.all([
            db.query(statsQuery),
            db.query(porDiaQuery),
            db.query(topProductosQuery)
        ]);

        return {
            general: {
                total_alertas: parseInt(statsResult.rows[0].total_alertas) || 0,
                alertas_atendidas: parseInt(statsResult.rows[0].alertas_atendidas) || 0,
                alertas_pendientes: parseInt(statsResult.rows[0].alertas_pendientes) || 0,
                alertas_caducidad: parseInt(statsResult.rows[0].alertas_caducidad) || 0,
                alertas_stock_bajo: parseInt(statsResult.rows[0].alertas_stock_bajo) || 0
            },
            alertas_por_dia: porDiaResult.rows,
            productos_con_mas_alertas: topProductosResult.rows
        };
    }
};

/**
 * Repositorio para Productos (solo lo necesario para alertas)
 * Deberías crear un 'src/repositories/productoRepository.js' completo
 */
const productoRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query(
            'SELECT id_producto, nombre, stock FROM productos WHERE id_producto = $1',
            [id]
        );
        return result.rows[0];
    }
};


module.exports = {
    alertaRepository,
    productoRepository // Exportamos el mini-repo de producto
};