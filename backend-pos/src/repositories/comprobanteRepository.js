// src/repositories/comprobanteRepository.js

const db = require('../config/database');
const Comprobante = require('../models/Comprobante');
const helpers = require('../utils/helpers');

/**
 * Repositorio para operaciones de la tabla 'ventas'
 * (Necesario para la lógica de 'comprobantes')
 */
const ventaRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query(
            `SELECT v.*, u.nombre as usuario_nombre
             FROM ventas v
             LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
             WHERE v.id_venta = $1`,
            [id]
        );
        return result.rows[0]; // Devuelve la fila cruda
    },
    
    async findDetallesByVentaId(id_venta, client) {
        const runner = client || db;
        const result = await runner.query(
            `SELECT dv.*, p.nombre as producto_nombre, p.codigo_barra
             FROM detalle_venta dv
             JOIN productos p ON dv.id_producto = p.id_producto
             WHERE dv.id_venta = $1`,
            [id_venta]
        );
        return result.rows; // Devuelve las filas crudas
    }
};

/**
 * Repositorio para operaciones de la tabla 'comprobantes'
 */
const comprobanteRepository = {
    
    /**
     * Busca todos los comprobantes de una venta específica.
     */
    async findByVentaId(id_venta) {
        const result = await db.query(
            `SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
             FROM comprobantes c
             JOIN ventas v ON c.id_venta = v.id_venta
             LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
             WHERE c.id_venta = $1
             ORDER BY c.generado_en DESC`,
            [id_venta]
        );
        return result.rows.map(row => Comprobante.fromDatabaseRow(row));
    },

    /**
     * Busca un comprobante por su ID.
     */
    async findById(id) {
         const result = await db.query(
            `SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
             FROM comprobantes c
             JOIN ventas v ON c.id_venta = v.id_venta
             LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
             WHERE c.id_comprobante = $1`,
            [id]
        );
        if (result.rows.length === 0) return null;
        return Comprobante.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Crea un nuevo comprobante (requiere client).
     */
    async create(comprobanteData, client) {
        const { id_venta, tipo, contenido, generado_en } = comprobanteData;
        const result = await client.query(
            `INSERT INTO comprobantes (id_venta, tipo, contenido, generado_en)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id_venta, tipo, contenido, generado_en]
        );
        return Comprobante.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Busca todos los comprobantes con filtros y paginación.
     */
    async findAll({ tipo, fecha_inicio, fecha_fin }, { limit, offset }) {
        const params = [];
        const where = [];
        let idx = 1;

        if (tipo) {
            where.push(`c.tipo = $${idx++}`);
            params.push(tipo);
        }
        if (fecha_inicio) {
            where.push(`c.generado_en >= $${idx++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            where.push(`c.generado_en <= $${idx++}`);
            params.push(fecha_fin + ' 23:59:59');
        }

        const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const paginationSQL = `LIMIT $${idx++} OFFSET $${idx++}`;
        const dataParams = [...params, limit, offset];
        const countParams = params;

        const dataQuery = db.query(
            `SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
             FROM comprobantes c
             JOIN ventas v ON c.id_venta = v.id_venta
             LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
             ${whereSQL}
             ORDER BY c.generado_en DESC
             ${paginationSQL}`,
            dataParams
        );

        const countQuery = db.query(`SELECT COUNT(*) FROM comprobantes c ${whereSQL}`, countParams);
        
        const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);
        
        const comprobantes = dataResult.rows.map(row => Comprobante.fromDatabaseRow(row));
        const total = parseInt(countResult.rows[0].count);

        return { comprobantes, total };
    },

    /**
     * Busca comprobantes por tipo con paginación.
     */
    async findByTipo(tipo, { limit, offset }) {
        const dataQuery = db.query(
            `SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
             FROM comprobantes c
             JOIN ventas v ON c.id_venta = v.id_venta
             LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
             WHERE c.tipo = $1
             ORDER BY c.generado_en DESC
             LIMIT $2 OFFSET $3`,
            [tipo, limit, offset]
        );

        const countQuery = db.query('SELECT COUNT(*) FROM comprobantes WHERE tipo = $1', [tipo]);
        
        const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

        const comprobantes = dataResult.rows.map(row => Comprobante.fromDatabaseRow(row));
        const total = parseInt(countResult.rows[0].count);

        return { comprobantes, total };
    },

    /**
     * Elimina un comprobante (requiere client).
     */
    async delete(id, client) {
        const result = await client.query(
            'DELETE FROM comprobantes WHERE id_comprobante = $1 RETURNING *', 
            [id]
        );
        return Comprobante.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Obtiene estadísticas de comprobantes.
     */
    async getEstadisticas({ fecha_inicio, fecha_fin }) {
        const params = [];
        const where = [];
        let idx = 1;

        if (fecha_inicio) {
            where.push(`generado_en >= $${idx++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            where.push(`generado_en <= $${idx++}`);
            params.push(fecha_fin + ' 23:59:59');
        }

        const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const statsPorTipoQuery = db.query(
            `SELECT tipo, COUNT(*) as cantidad, AVG(LENGTH(contenido)) as tamanio_promedio
             FROM comprobantes
             ${whereSQL}
             GROUP BY tipo
             ORDER BY cantidad DESC`,
            params
        );
        
        const comprobantesPorDiaQuery = db.query(
            `SELECT DATE(generado_en) as fecha, COUNT(*) as total,
                    COUNT(*) FILTER (WHERE tipo = 'ticket') as tickets,
                    COUNT(*) FILTER (WHERE tipo = 'factura') as facturas
             FROM comprobantes
             WHERE generado_en >= CURRENT_DATE - INTERVAL '30 days'
             GROUP BY DATE(generado_en)
             ORDER BY fecha DESC`
        );
        
        const [statsPorTipo, comprobantesPorDia] = await Promise.all([
            statsPorTipoQuery, comprobantesPorDiaQuery
        ]);

        return { statsPorTipo: statsPorTipo.rows, comprobantesPorDia: comprobantesPorDia.rows };
    }
};

module.exports = {
    comprobanteRepository,
    ventaRepository // Exportamos el mini-repo de ventas
};