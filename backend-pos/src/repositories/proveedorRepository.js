// src/repositories/proveedorRepository.js
const db = require('../config/database');
const Proveedor = require('../models/Proveedor');
const Producto = require('../models/Producto'); // Asumimos que existe
const ModelMapper = require('../utils/modelMapper');
const QueryBuilder = require('../utils/queryBuilder');

/**
 * Repositorio para manejar las operaciones de Proveedores en la BD.
 */
const proveedorRepository = {

    /**
     * Busca proveedores con filtros, paginación y conteo de productos.
     */
    async findAll({ whereSQL, params, limit, offset }) {
        const dataSql = `
            SELECT p.*, COUNT(pr.id_producto) as total_productos
            FROM proveedores p 
            LEFT JOIN productos pr ON p.id_proveedor = pr.id_proveedor
            ${whereSQL}
            GROUP BY p.id_proveedor 
            ORDER BY p.nombre ASC 
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `SELECT COUNT(*) FROM proveedores p ${whereSQL}`;

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params)
        ]);

        const proveedores = ModelMapper.toProveedorList(dataResult.rows);
        // Agregar el conteo de productos a cada objeto
        proveedores.forEach(proveedor => {
            const row = dataResult.rows.find(r => r.id_proveedor === proveedor.id_proveedor);
            proveedor.total_productos = row ? parseInt(row.total_productos) : 0;
        });

        const total = parseInt(countResult.rows[0].count);
        return { proveedores, total };
    },

    /**
     * Busca un proveedor por ID, incluyendo conteo de productos.
     */
    async findByIdWithStats(id) {
        const result = await db.query(`
            SELECT p.*, COUNT(pr.id_producto) as total_productos
            FROM proveedores p 
            LEFT JOIN productos pr ON p.id_proveedor = pr.id_proveedor
            WHERE p.id_proveedor = $1
            GROUP BY p.id_proveedor
        `, [id]);
        
        if (result.rows.length === 0) return null;
        
        const proveedor = ModelMapper.toProveedor(result.rows[0]);
        proveedor.total_productos = parseInt(result.rows[0].total_productos);
        return proveedor;
    },

    /**
     * Busca un proveedor por ID (simple, para transacciones).
     */
    async findByIdSimple(id, client) {
        const runner = client || db;
        const result = await runner.query('SELECT * FROM proveedores WHERE id_proveedor = $1', [id]);
        if (result.rows.length === 0) return null;
        return ModelMapper.toProveedor(result.rows[0]);
    },

    /**
     * Busca todos los productos de un proveedor (sin paginación).
     */
    async findProductosByProveedorId(id_proveedor) {
        const result = await db.query(`
            SELECT pr.*, c.nombre as categoria_nombre
            FROM productos pr
            LEFT JOIN categorias c ON pr.id_categoria = c.id_categoria
            WHERE pr.id_proveedor = $1
            ORDER BY pr.nombre
        `, [id_proveedor]);
        return ModelMapper.toProductoList(result.rows);
    },

    /**
     * Busca productos de un proveedor (paginado).
     */
    async findPaginatedProductosByProveedorId(id_proveedor, { limit, offset }) {
        const dataSql = `
            SELECT p.*, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.id_proveedor = $1
            ORDER BY p.nombre
            LIMIT $2 OFFSET $3
        `;
        const countSql = "SELECT COUNT(*) FROM productos WHERE id_proveedor = $1";

        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [id_proveedor, limit, offset]),
            db.query(countSql, [id_proveedor])
        ]);

        const productos = ModelMapper.toProductoList(dataResult.rows);
        const total = parseInt(countResult.rows[0].count);
        return { productos, total };
    },

    /**
     * Busca un proveedor por su nombre (sensible a mayúsculas/minúsculas).
     */
    async findByName(nombre, client) {
        const runner = client || db;
        const result = await runner.query(
            'SELECT id_proveedor FROM proveedores WHERE nombre ILIKE $1',
            [nombre]
        );
        return result.rows[0];
    },

    /**
     * Busca un proveedor por nombre, excluyendo un ID (para validación de actualización).
     */
    async findByNameAndNotId(nombre, id, client) {
        const runner = client || db;
        const result = await runner.query(
            'SELECT id_proveedor FROM proveedores WHERE nombre ILIKE $1 AND id_proveedor != $2',
            [nombre, id]
        );
        return result.rows[0];
    },

    /**
     * Crea un nuevo proveedor (requiere client de transacción).
     */
    async create(proveedor, client) {
        const { nombre, telefono, email, direccion } = proveedor;
        const result = await client.query(
            `INSERT INTO proveedores (nombre, telefono, email, direccion)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, telefono, email, direccion]
        );
        return ModelMapper.toProveedor(result.rows[0]);
    },

    /**
     * Actualiza un proveedor (requiere client de transacción).
     */
    async update(id, updates, client) {
        const { sql, params } = QueryBuilder.buildUpdateQuery('proveedores', updates, 'id_proveedor', id);
        const result = await client.query(sql, params);
        return ModelMapper.toProveedor(result.rows[0]);
    },

    /**
     * Cuenta los productos asociados a un proveedor.
     */
    async countProductosByProveedorId(id_proveedor, client) {
        const runner = client || db;
        const result = await runner.query(
            'SELECT COUNT(*) FROM productos WHERE id_proveedor = $1',
            [id_proveedor]
        );
        return parseInt(result.rows[0].count);
    },

    /**
     * Elimina un proveedor (requiere client de transacción).
     */
    async delete(id, client) {
        await client.query('DELETE FROM proveedores WHERE id_proveedor = $1', [id]);
    },

    /**
     * Obtiene estadísticas de productos para un proveedor.
     */
    async getEstadisticas(id_proveedor) {
        const statsQuery = db.query(`
            SELECT 
              COUNT(*) as total_productos,
              SUM(stock) as total_stock,
              AVG(precio_compra) as precio_compra_promedio,
              AVG(precio_venta) as precio_venta_promedio
            FROM productos 
            WHERE id_proveedor = $1
        `, [id_proveedor]);

        const bajoStockQuery = db.query(`
            SELECT COUNT(*) as productos_bajo_stock
            FROM productos 
            WHERE id_proveedor = $1 AND stock <= 5
        `, [id_proveedor]);

        const porCaducarQuery = db.query(`
            SELECT COUNT(*) as productos_por_caducar
            FROM productos 
            WHERE id_proveedor = $1 AND fecha_caducidad IS NOT NULL 
            AND fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days'
        `, [id_proveedor]);

        const [statsResult, bajoStockResult, porCaducarResult] = await Promise.all([
            statsQuery, bajoStockQuery, porCaducarQuery
        ]);

        return {
            ...statsResult.rows[0],
            ...bajoStockResult.rows[0],
            ...porCaducarResult.rows[0]
        };
    }
};

module.exports = proveedorRepository;