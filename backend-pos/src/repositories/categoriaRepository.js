// src/repositories/categoriaRepository.js

const db = require("../config/database");
const Categoria = require("../models/Categoria");
const Producto = require("../models/Producto"); // Asumimos que existe un Modelo Producto
const ModelMapper = require("../utils/modelMapper");
const QueryBuilder = require("../utils/queryBuilder");

/**
 * Repositorio para manejar las operaciones de Categorías en la BD.
 */
const categoriaRepository = {
  /**
   * Busca categorías con paginación y búsqueda.
   * Retorna tanto las categorías como el conteo total.
   */
  async findAll({ searchTerm, limit, offset }) {
    let dataSql = `
            SELECT c.*, COUNT(p.id_producto) as total_productos
            FROM categorias c 
            LEFT JOIN productos p ON c.id_categoria = p.id_categoria
        `;
    let countSql = `SELECT COUNT(*) FROM categorias`;

    const params = [];
    const countParams = [];

    if (searchTerm) {
      const whereClause = ` WHERE c.nombre ILIKE $1 OR c.descripcion ILIKE $1`;
      dataSql += whereClause;
      countSql += whereClause;
      params.push(searchTerm);
      countParams.push(searchTerm);
    }

    dataSql += ` GROUP BY c.id_categoria ORDER BY c.nombre LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Ejecutar ambas consultas en paralelo
    const [dataResult, countResult] = await Promise.all([
      db.query(dataSql, params),
      db.query(countSql, countParams),
    ]);

    // Mapear resultados
    const categorias = ModelMapper.toCategoriaList(dataResult.rows);
    categorias.forEach((categoria) => {
      const row = dataResult.rows.find(
        (r) => r.id_categoria === categoria.id_categoria
      );
      categoria.total_productos = row ? parseInt(row.total_productos) : 0;
    });
    const total = parseInt(countResult.rows[0].count);

    return { categorias, total };
  },

  /**
   * Busca una categoría por ID, incluyendo el conteo de productos.
   */
  async findById(id) {
    const result = await db.query(
      `
            SELECT c.*, COUNT(p.id_producto) as total_productos
            FROM categorias c 
            LEFT JOIN productos p ON c.id_categoria = p.id_categoria
            WHERE c.id_categoria = $1 
            GROUP BY c.id_categoria
        `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const categoria = ModelMapper.toCategoria(result.rows[0]);
    categoria.total_productos = parseInt(result.rows[0].total_productos);
    return categoria;
  },

  /**
   * Busca una categoría por su nombre (sensible a mayúsculas/minúsculas).
   */
  async findByName(nombre, client) {
    const runner = client || db;
    const result = await runner.query(
      "SELECT id_categoria FROM categorias WHERE nombre ILIKE $1",
      [nombre]
    );
    return result.rows[0];
  },

  /**
   * Busca una categoría por nombre, excluyendo un ID (para validación de actualización).
   */
  async findByNameAndNotId(nombre, id, client) {
    const runner = client || db;
    const result = await runner.query(
      "SELECT id_categoria FROM categorias WHERE nombre ILIKE $1 AND id_categoria != $2",
      [nombre, id]
    );
    return result.rows[0];
  },

  /**
   * Crea una nueva categoría (requiere client de transacción).
   */
  async create({ nombre, descripcion }, client) {
    const result = await client.query(
      "INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *",
      [nombre, descripcion]
    );
    return ModelMapper.toCategoria(result.rows[0]);
  },

  /**
   * Actualiza una categoría (requiere client de transacción).
   */
  async update(id, updates, client) {
    const { sql, params } = QueryBuilder.buildUpdateQuery(
      "categorias",
      updates,
      "id_categoria",
      id
    );
    const result = await client.query(sql, params);
    return ModelMapper.toCategoria(result.rows[0]);
  },

  /**
   * Cuenta los productos asociados a una categoría.
   */
  async countProductsByCategoriaId(id, client) {
    const runner = client || db;
    const result = await runner.query(
      "SELECT COUNT(*) FROM productos WHERE id_categoria = $1",
      [id]
    );
    return parseInt(result.rows[0].count);
  },

  /**
   * Elimina una categoría (requiere client de transacción).
   */
  async delete(id, client) {
    const result = await client.query(
      "DELETE FROM categorias WHERE id_categoria = $1 RETURNING *",
      [id]
    );
    return ModelMapper.toCategoria(result.rows[0]);
  },

  /**
   * Busca productos de una categoría con paginación.
   */
  async findProductosByCategoriaId(id, { limit, offset }) {
    const productsQuery = db.query(
      `
            SELECT p.*, c.nombre as categoria_nombre
            FROM productos p 
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.id_categoria = $1 
            ORDER BY p.nombre 
            LIMIT $2 OFFSET $3
        `,
      [id, limit, offset]
    );

    const countQuery = db.query(
      "SELECT COUNT(*) FROM productos WHERE id_categoria = $1",
      [id]
    );

    const [productosResult, totalResult] = await Promise.all([
      productsQuery,
      countQuery,
    ]);

    const productos = ModelMapper.toProductoList(productosResult.rows);
    const total = parseInt(totalResult.rows[0].count);

    return { productos, total };
  },

  /**
   * Verifica que los productos pertenecen a la categoría origen (requiere client).
   */
  async checkProductsInCategoria(productos_ids, idOrigen, client) {
    const placeholders = productos_ids.map((_, i) => `$${i + 1}`).join(",");
    const result = await client.query(
      `SELECT COUNT(*) FROM productos 
             WHERE id_producto IN (${placeholders}) AND id_categoria = $${
        productos_ids.length + 1
      }`,
      [...productos_ids, idOrigen]
    );
    return parseInt(result.rows[0].count) === productos_ids.length;
  },

  /**
   * Mueve productos a una nueva categoría (requiere client).
   */
  async moveProducts(idDestino, productos_ids, client) {
    const placeholders = productos_ids.map((_, i) => `$${i + 2}`).join(",");
    const result = await client.query(
      `UPDATE productos SET id_categoria = $1 
             WHERE id_producto IN (${placeholders}) RETURNING id_producto`,
      [idDestino, ...productos_ids]
    );
    return result.rowCount; // Devuelve el número de filas afectadas
  },

  /**
   * Obtiene estadísticas globales de categorías.
   */
  async getGlobalEstadisticas() {
    const statsQuery = db.query(`
            SELECT 
                COUNT(*) as total_categorias,
                COUNT(*) as categorias_activas, -- Simplemente cuenta todas como activas
                SUM(total_productos) as total_productos_categorizados
            FROM (
                SELECT c.id_categoria, COUNT(p.id_producto) as total_productos
                FROM categorias c
                LEFT JOIN productos p ON c.id_categoria = p.id_categoria
                GROUP BY c.id_categoria
            ) as categorias_con_productos
        `);

    const popularQuery = db.query(`
            SELECT c.id_categoria, c.nombre, COUNT(p.id_producto) as total_productos,
                   COALESCE(SUM(p.stock), 0) as total_stock,
                   COALESCE(AVG(p.precio_venta), 0) as precio_promedio
            FROM categorias c
            LEFT JOIN productos p ON c.id_categoria = p.id_categoria
            GROUP BY c.id_categoria, c.nombre
            ORDER BY total_productos DESC
            LIMIT 10
        `);

    const uncategorizedQuery = db.query(
      `SELECT COUNT(*) as total FROM productos WHERE id_categoria IS NULL`
    );

    const [statsResult, popularResult, uncategorizedResult] = await Promise.all(
      [statsQuery, popularQuery, uncategorizedQuery]
    );

    return {
      globales: statsResult.rows[0],
      categorias_populares: popularResult.rows,
      productos_sin_categoria: uncategorizedResult.rows[0].total,
    };
  },

  /**
   * Obtiene estadísticas para una categoría específica.
   */
  async getEstadisticasForCategoria(id) {
    const statsQuery = db.query(
      `
            SELECT 
                COUNT(*) as total_productos,
                COALESCE(SUM(stock), 0) as total_stock,
                COALESCE(AVG(precio_compra), 0) as precio_compra_promedio,
                COALESCE(AVG(precio_venta), 0) as precio_venta_promedio,
                COUNT(*) FILTER (WHERE stock <= 5) as productos_bajo_stock,
                COUNT(*) FILTER (WHERE fecha_caducidad IS NOT NULL AND fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days') as productos_por_caducar
            FROM productos 
            WHERE id_categoria = $1
        `,
      [id]
    );

    const valorQuery = db.query(
      `
            SELECT COALESCE(SUM(stock * precio_compra), 0) as valor_total
            FROM productos 
            WHERE id_categoria = $1
        `,
      [id]
    );

    const [statsResult, valorResult] = await Promise.all([
      statsQuery,
      valorQuery,
    ]);

    return {
      productos: statsResult.rows[0],
      inventario: valorResult.rows[0],
    };
  },
};

module.exports = categoriaRepository;
