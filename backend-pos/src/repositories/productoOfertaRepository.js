// src/repositories/productoOfertaRepository.js
const db = require('../config/database');
const ProductoOferta = require('../models/ProductoOferta');
const Producto = require('../models/Producto');
const Oferta = require('../models/Oferta');
const ModelMapper = require('../utils/modelMapper');

/**
 * Repositorio para manejar las operaciones de la tabla 'producto_oferta'.
 */
const productoOfertaRepository = {

    /**
     * Busca todas las relaciones producto-oferta, con filtros y paginación.
     */
    async findAll({ whereSQL, params, limit, offset }) {
        
        const dataSql = `
            SELECT po.*, p.nombre as producto_nombre, p.precio_venta, 
                   o.nombre as oferta_nombre, o.porcentaje_descuento, o.activo,
                   o.fecha_inicio, o.fecha_fin
            FROM producto_oferta po
            LEFT JOIN productos p ON p.id_producto = po.id_producto
            LEFT JOIN ofertas o ON o.id_oferta = po.id_oferta
            ${whereSQL}
            ORDER BY o.fecha_inicio DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `
            SELECT COUNT(*) 
            FROM producto_oferta po 
            LEFT JOIN ofertas o ON o.id_oferta = po.id_oferta 
            ${whereSQL}
        `;

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params)
        ]);

        const relaciones = dataResult.rows.map(row => ProductoOferta.fromDatabaseRow(row));
        const total = parseInt(countResult.rows[0].count);

        return { relaciones, total };
    },

    /**
     * Busca las ofertas de un producto, con filtros y paginación.
     */
    async findOffersByProductId({ whereSQL, params, limit, offset }) {
        
        const dataSql = `
            SELECT po.*, o.*, p.nombre as producto_nombre, p.precio_venta,
                   (p.precio_venta * (1 - o.porcentaje_descuento / 100)) as precio_oferta
            FROM producto_oferta po
            JOIN ofertas o ON o.id_oferta = po.id_oferta
            JOIN productos p ON p.id_producto = po.id_producto
            ${whereSQL}
            ORDER BY o.fecha_inicio DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `
            SELECT COUNT(*) 
            FROM producto_oferta po 
            JOIN ofertas o ON o.id_oferta = po.id_oferta 
            ${whereSQL}
        `;
        
        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params)
        ]);
        
        const relaciones = dataResult.rows.map(row => ProductoOferta.fromDatabaseRow(row));
        const total = parseInt(countResult.rows[0].count);

        return { relaciones, total };
    },

    /**
     * Busca los productos de una oferta, con filtros y paginación.
     */
    async findProductsByOfferId({ whereSQL, params, limit, offset }) {
        
        const dataSql = `
            SELECT po.*, p.*, o.nombre as oferta_nombre, o.porcentaje_descuento
                   ${params.includes('con_precio') ? ', (p.precio_venta * (1 - o.porcentaje_descuento / 100)) as precio_oferta' : ''}
            FROM producto_oferta po
            JOIN productos p ON p.id_producto = po.id_producto
            JOIN ofertas o ON o.id_oferta = po.id_oferta
            ${whereSQL}
            ORDER BY p.nombre
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `
            SELECT COUNT(*) 
            FROM producto_oferta po
            JOIN productos p ON p.id_producto = po.id_producto
            JOIN ofertas o ON o.id_oferta = po.id_oferta
            ${whereSQL}
        `;

        // Remover 'con_precio' de los params de SQL
        const sqlParams = params.filter(p => p !== 'con_precio');
        
        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...sqlParams, limit, offset]),
            db.query(countSql, sqlParams.slice(0, -2)) // Asumiendo que limit/offset no están en sqlParams aún
        ]);

        const relaciones = dataResult.rows.map(row => ProductoOferta.fromDatabaseRow(row));
        const total = parseInt(countResult.rows[0].count);
        
        return { relaciones, total };
    },

    /**
     * Busca solo las ofertas activas y vigentes para un producto.
     */
    async findActiveOffersByProductId(productoId) {
        const result = await db.query(`
            SELECT po.*, o.*, p.nombre as producto_nombre, p.precio_venta,
                   (p.precio_venta * (1 - o.porcentaje_descuento / 100)) as precio_oferta
            FROM producto_oferta po
            JOIN ofertas o ON o.id_oferta = po.id_oferta
            JOIN productos p ON p.id_producto = po.id_producto
            WHERE po.id_producto = $1 
              AND o.activo = true 
              AND o.fecha_inicio <= CURRENT_DATE 
              AND o.fecha_fin >= CURRENT_DATE
            ORDER BY o.porcentaje_descuento DESC
        `, [productoId]);
        
        return result.rows.map(row => ProductoOferta.fromDatabaseRow(row));
    },

    /**
     * Busca una relación producto-oferta (para transacciones).
     */
    async findRelacion(id_producto, id_oferta, client) {
        const runner = client || db;
        const result = await runner.query(
            "SELECT * FROM producto_oferta WHERE id_producto = $1 AND id_oferta = $2",
            [id_producto, id_oferta]
        );
        return result.rows[0];
    },
    
    /**
     * Busca una relación con JOINs (para log).
     */
    async findRelacionWithNames(id_producto, id_oferta, client) {
        const runner = client || db;
        const result = await runner.query(
           `SELECT po.*, p.nombre as producto_nombre, o.nombre as oferta_nombre 
            FROM producto_oferta po
            JOIN productos p ON po.id_producto = p.id_producto
            JOIN ofertas o ON po.id_oferta = o.id_oferta
            WHERE po.id_producto = $1 AND po.id_oferta = $2`,
            [id_producto, id_oferta]
        );
        return result.rows[0];
    },

    /**
     * Crea una relación producto-oferta (requiere client).
     */
    async createRelacion(id_producto, id_oferta, client) {
        const result = await client.query(
            "INSERT INTO producto_oferta (id_producto, id_oferta) VALUES ($1, $2) RETURNING *",
            [id_producto, id_oferta]
        );
        return result.rows[0];
    },

    /**
     * Elimina una relación producto-oferta (requiere client).
     */
    async deleteRelacion(id_producto, id_oferta, client) {
        await client.query(
            "DELETE FROM producto_oferta WHERE id_producto = $1 AND id_oferta = $2",
            [id_producto, id_oferta]
        );
    }
};

// --- Repositorios mínimos para dependencias ---
// (Estos deben existir gracias a los refactors anteriores)

const productoRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT id_producto, nombre FROM productos WHERE id_producto = $1", [id]);
        return result.rows[0];
    }
};

const ofertaRepository = {
    async findByIdSimple(id, client) {
        const runner = client || db;
        const result = await runner.query('SELECT * FROM ofertas WHERE id_oferta = $1', [id]);
        if (result.rows.length === 0) return null;
        return Oferta.fromDatabaseRow(result.rows[0]);
    }
};


module.exports = {
    productoOfertaRepository,
    productoRepository,
    ofertaRepository
};