// src/repositories/ofertaRepository.js
const db = require('../config/database');
const Oferta = require('../models/Oferta');
const ProductoOferta = require('../models/ProductoOferta');
const ModelMapper = require('../utils/modelMapper');
const QueryBuilder = require('../utils/queryBuilder');

/**
 * Repositorio para manejar las operaciones de Ofertas en la BD.
 */
const ofertaRepository = {

    /**
     * Busca ofertas con filtros y paginación.
     * Nota: El filtro de 'estado' (Activa, Expirada) se aplica en el servicio.
     */
    async findAll({ whereSQL, params, limit, offset }) {
        const dataSql = `
            SELECT o.*, COUNT(po.id_producto) as total_productos
            FROM ofertas o 
            LEFT JOIN producto_oferta po ON o.id_oferta = po.id_oferta
            ${whereSQL}
            GROUP BY o.id_oferta 
            ORDER BY o.fecha_inicio DESC 
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `SELECT COUNT(*) FROM ofertas o ${whereSQL}`;

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params)
        ]);

        const ofertas = dataResult.rows.map(row => Oferta.fromDatabaseRow(row));
        const total = parseInt(countResult.rows[0].count);
        
        return { ofertas, total };
    },

    /**
     * Busca una oferta por ID, incluyendo conteo de productos.
     */
    async findById(id) {
        const result = await db.query(`
            SELECT o.*, COUNT(po.id_producto) as total_productos
            FROM ofertas o 
            LEFT JOIN producto_oferta po ON o.id_oferta = po.id_oferta
            WHERE o.id_oferta = $1
            GROUP BY o.id_oferta
        `, [id]);
        
        if (result.rows.length === 0) return null;
        return Oferta.fromDatabaseRow(result.rows[0]);
    },
    
    /**
     * Busca una oferta por ID (simple, para transacciones).
     */
    async findByIdSimple(id, client) {
        const runner = client || db;
        const result = await runner.query('SELECT * FROM ofertas WHERE id_oferta = $1', [id]);
        if (result.rows.length === 0) return null;
        return Oferta.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Busca productos asociados a una oferta (paginado).
     */
    async findProductosByOfertaId(id_oferta, { limit, offset }) {
        const dataSql = `
            SELECT po.*, p.nombre as producto_nombre, p.precio_venta as precio_original,
                   p.stock, p.codigo_barra
            FROM producto_oferta po
            JOIN productos p ON po.id_producto = p.id_producto
            WHERE po.id_oferta = $1
            ORDER BY p.nombre
            LIMIT $2 OFFSET $3
        `;
        const countSql = "SELECT COUNT(*) FROM producto_oferta WHERE id_oferta = $1";

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [id_oferta, limit, offset]),
            db.query(countSql, [id_oferta])
        ]);

        const productos = dataResult.rows.map(row => ProductoOferta.fromDatabaseRow(row));
        const total = parseInt(countResult.rows[0].count);
        return { productos, total };
    },

    /**
     * Busca una oferta por su nombre (sensible a mayúsculas/minúsculas).
     */
    async findByName(nombre, client) {
        const runner = client || db;
        const result = await runner.query('SELECT id_oferta FROM ofertas WHERE nombre ILIKE $1', [nombre]);
        return result.rows[0];
    },

    /**
     * Busca una oferta por nombre, excluyendo un ID (para validación de actualización).
     */
    async findByNameAndNotId(nombre, id, client) {
        const runner = client || db;
        const result = await runner.query(
            'SELECT id_oferta FROM ofertas WHERE nombre ILIKE $1 AND id_oferta != $2',
            [nombre, id]
        );
        return result.rows[0];
    },

    /**
     * Crea una nueva oferta (requiere client de transacción).
     */
    async create(oferta, client) {
        const { nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo } = oferta;
        const result = await client.query(
            `INSERT INTO ofertas (nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo]
        );
        return Oferta.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Actualiza una oferta (requiere client de transacción).
     */
    async update(id, updates, client) {
        const { sql, params } = QueryBuilder.buildUpdateQuery('ofertas', updates, 'id_oferta', id);
        const result = await client.query(sql, params);
        return Oferta.fromDatabaseRow(result.rows[0]);
    },

    /**
     * Cuenta los productos asociados a una oferta.
     */
    async countProductosAsociados(id_oferta, client) {
        const runner = client || db;
        const result = await runner.query('SELECT COUNT(*) FROM producto_oferta WHERE id_oferta = $1', [id_oferta]);
        return parseInt(result.rows[0].count);
    },

    /**
     * Elimina una oferta (requiere client de transacción).
     */
    async delete(id, client) {
        await client.query('DELETE FROM ofertas WHERE id_oferta = $1', [id]);
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
        await client.query(
            "INSERT INTO producto_oferta (id_producto, id_oferta) VALUES ($1, $2)",
            [id_producto, id_oferta]
        );
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

// --- Repositorio mínimo para dependencias ---
// Usaremos el que ya definimos en productoRepository.js, pero lo re-declaramos aquí por claridad
const productoRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT id_producto, nombre FROM productos WHERE id_producto = $1", [id]);
        return result.rows[0];
    }
};


module.exports = {
    ofertaRepository,
    productoRepository // Exportamos el mini-repo de producto
};