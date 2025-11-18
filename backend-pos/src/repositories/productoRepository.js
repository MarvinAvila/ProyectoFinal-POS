// src/repositories/productoRepository.js
const db = require('../config/database');
const ModelMapper = require('../utils/modelMapper');
const QueryBuilder = require('../utils/queryBuilder');

/**
 * Repositorio para manejar las operaciones de Productos en la BD.
 */
const productoRepository = {

    /**
     * Busca productos con filtros, paginación y ordenamiento.
     * Retorna tanto los productos como el conteo total.
     */
    async findAll({ whereSQL, params, sortField, order, limit, offset }) {
        const dataSql = `
            SELECT p.*, c.nombre AS categoria_nombre, pr.nombre AS proveedor_nombre,
                   (p.precio_venta - p.precio_compra) AS ganancia_unitaria,
                   (p.precio_venta - p.precio_compra) / NULLIF(p.precio_compra, 0) * 100 AS margen_ganancia
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
            ${whereSQL}
            ORDER BY p.${sortField} ${order}
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const countSql = `SELECT COUNT(*) FROM productos p ${whereSQL}`;
        
        const [dataResult, countResult] = await Promise.all([
            db.query(dataSql, [...params, limit, offset]),
            db.query(countSql, params)
        ]);

        const productos = ModelMapper.toProductoList(dataResult.rows);
        const total = parseInt(countResult.rows[0].count);
        
        return { productos, total };
    },

    /**
     * Busca un producto por ID con JOINs.
     */
    async findById(id) {
        const result = await db.query(
            `SELECT p.*, 
                    c.nombre as categoria_nombre, 
                    pr.nombre as proveedor_nombre,
                    pr.telefono as proveedor_contacto 
             FROM productos p
             LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
             LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
             WHERE p.id_producto = $1 AND p.activo = true`,
            [id]
        );
        if (result.rows.length === 0) return null;
        return result.rows[0]; // Devuelve la fila cruda para que el servicio la enriquezca
    },
    
    /**
     * Busca un producto por ID (simple, para transacciones).
     */
    async findByIdSimple(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT * FROM productos WHERE id_producto = $1", [id]);
        if (result.rows.length === 0) return null;
        return ModelMapper.toProducto(result.rows[0]);
    },

    /**
     * Busca un producto por código de barras.
     */
    async findByBarcode(code) {
        const result = await db.query(
            `SELECT p.*, 
                    c.nombre as categoria_nombre, 
                    pr.nombre as proveedor_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
             LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
             WHERE (p.codigo_barra = $1 OR p.id_producto::text = $1) AND p.activo = true`,
            [code.trim()]
        );
        if (result.rows.length === 0) return null;
        return result.rows[0]; // Devuelve la fila cruda
    },

    /**
     * Busca un producto por código de barras (para validación).
     */
    async findByCode(codigo_barra, excludeId = null, client) {
        const runner = client || db;
        let query = "SELECT id_producto FROM productos WHERE codigo_barra = $1";
        const params = [codigo_barra];
        
        if (excludeId) {
            query += " AND id_producto != $2";
            params.push(excludeId);
        }
        
        const result = await runner.query(query, params);
        return result.rows[0];
    },

    /**
     * Crea un nuevo producto (requiere client).
     */
    async create(productoData, client) {
        const fields = [
            'id_categoria', 'id_proveedor', 'nombre', 'codigo_barra', 
            'precio_compra', 'precio_venta', 'stock', 'unidad', 'fecha_caducidad', 
            'imagen', 'codigo_barras_url', 'codigo_qr_url', 'codigos_public_ids'
        ];
        const { values, placeholders } = QueryBuilder.buildInsertQuery(productoData, fields);
        
        const sql = `INSERT INTO productos (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await client.query(sql, values);
        return ModelMapper.toProducto(result.rows[0]);
    },
    
    /**
     * Actualiza un producto (requiere client).
     */
    async update(id, updates, client) {
        updates.fecha_actualizacion = new Date(); // Añadir fecha de actualización
        const { sql, params } = QueryBuilder.buildUpdateQuery('productos', updates, 'id_producto', id);
        const result = await client.query(sql, params);
        return ModelMapper.toProducto(result.rows[0]);
    },

    /**
     * Cuenta las ventas asociadas a un producto.
     */
    async countVentas(id_producto, client) {
        const runner = client || db;
        const result = await runner.query("SELECT COUNT(*) FROM detalle_venta WHERE id_producto = $1", [id_producto]);
        return parseInt(result.rows[0].count);
    },

    /**
     * Desactiva un producto (Soft Delete) (requiere client).
     */
    async softDelete(id, client) {
        await client.query(
            "UPDATE productos SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = $1",
            [id]
        );
    },

    /**
     * Elimina las relaciones del producto en 'producto_oferta' (requiere client).
     */
    async deleteOfertas(id_producto, client) {
        await client.query("DELETE FROM producto_oferta WHERE id_producto = $1", [id_producto]);
    },

    /**
     * Elimina permanentemente un producto (requiere client).
     */
    async hardDelete(id_producto, client) {
        await client.query("DELETE FROM productos WHERE id_producto = $1", [id_producto]);
    },

    /**
     * Obtiene estadísticas generales de productos.
     */
    async getStatsGeneral() {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_productos,
                SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) as productos_bajo_stock,
                SUM(CASE WHEN fecha_caducidad IS NOT NULL AND fecha_caducidad <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as productos_por_caducar,
                AVG(precio_venta - precio_compra) as ganancia_promedio,
                SUM(stock * precio_compra) as valor_inventario
            FROM productos 
            WHERE activo = true
        `);
        return result.rows[0];
    },

    /**
     * Obtiene la cantidad de productos por categoría.
     */
    async getStatsPorCategoria() {
        const result = await db.query(`
            SELECT c.nombre, COUNT(p.id_producto) as cantidad_productos
            FROM categorias c
            LEFT JOIN productos p ON c.id_categoria = p.id_categoria AND p.activo = true
            GROUP BY c.id_categoria, c.nombre
            ORDER BY cantidad_productos DESC
        `);
        return result.rows;
    },

    /**
     * Obtiene solo los códigos de un producto por ID.
     */
    async findCodesById(id) {
        const result = await db.query(
            `SELECT codigo_barra, codigo_barras_url, codigo_qr_url, codigos_public_ids
             FROM productos WHERE id_producto = $1 AND activo = true`,
            [id]
        );
        return result.rows[0];
    }
};

// --- Repositorios mínimos para dependencias ---

const categoriaRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT id_categoria FROM categorias WHERE id_categoria = $1", [id]);
        return result.rows[0];
    }
};

const proveedorRepository = {
    async findById(id, client) {
        const runner = client || db;
        const result = await runner.query("SELECT id_proveedor FROM proveedores WHERE id_proveedor = $1", [id]);
        return result.rows[0];
    }
};

module.exports = {
    productoRepository,
    categoriaRepository,
    proveedorRepository
};