const db = require('../config/database');
const Categoria = require('../models/Categoria');
const ModelMapper = require('../utils/modelMapper');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

const categoriaController = {
    async getAll(req, res) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const searchTerm = QueryBuilder.sanitizeSearchTerm(req.query.q);
            
            let sql = `
                SELECT c.*, 
                       COUNT(p.id_producto) as total_productos
                FROM categorias c 
                LEFT JOIN productos p ON c.id_categoria = p.id_categoria
            `;
            let params = [];
            
            if (searchTerm) {
                sql += ` WHERE c.nombre ILIKE $1 OR c.descripcion ILIKE $1`;
                params.push(searchTerm);
            }
            
            sql += ` GROUP BY c.id_categoria 
                     ORDER BY c.nombre 
                     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            
            params.push(limit, offset);
            
            const result = await db.query(sql, params);
            const categorias = ModelMapper.toCategoriaList(result.rows);
            
            // Agregar total de productos a cada categoría
            categorias.forEach(categoria => {
                const row = result.rows.find(r => r.id_categoria === categoria.id_categoria);
                categoria.total_productos = row ? parseInt(row.total_productos) : 0;
            });
            
            // Contar total para paginación
            const countResult = await db.query(
                'SELECT COUNT(*) FROM categorias' + (searchTerm ? ' WHERE nombre ILIKE $1 OR descripcion ILIKE $1' : ''),
                searchTerm ? [searchTerm] : []
            );
            const total = parseInt(countResult.rows[0].count);
            
            logger.database('Categorías obtenidas exitosamente', {
                count: categorias.length,
                total,
                page,
                limit
            });
            
            return responseHelper.success(res, {
                categorias,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            logger.error('Error en getAll categorías:', error);
            return responseHelper.error(res, 'Error obteniendo categorías', 500, error);
        }
    },

    async getById(req, res) {
        try {
            const id = QueryBuilder.validateId(req.params.id);
            
            const result = await db.query(`
                SELECT c.*, 
                       COUNT(p.id_producto) as total_productos
                FROM categorias c 
                LEFT JOIN productos p ON c.id_categoria = p.id_categoria
                WHERE c.id_categoria = $1 
                GROUP BY c.id_categoria
            `, [id]);
            
            if (result.rows.length === 0) {
                return responseHelper.notFound(res, 'Categoría');
            }
            
            const categoria = ModelMapper.toCategoria(result.rows[0]);
            categoria.total_productos = parseInt(result.rows[0].total_productos);
            
            logger.database('Categoría obtenida por ID', { id });
            
            return responseHelper.success(res, categoria);
            
        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría inválido', 400);
            }
            logger.error('Error en getById categoría:', error);
            return responseHelper.error(res, 'Error obteniendo categoría', 500, error);
        }
    },

    async create(req, res) {
        try {
            const { nombre, descripcion } = req.body;
            
            // Validar datos requeridos
            if (!nombre || !nombre.trim()) {
                return responseHelper.error(res, 'El nombre de la categoría es obligatorio', 400);
            }
            
            // Sanitizar entrada
            const nombreSanitizado = helpers.sanitizeInput(nombre);
            const descripcionSanitizada = descripcion ? helpers.sanitizeInput(descripcion) : null;
            
            // Validar usando el modelo
            const categoriaTemp = new Categoria(null, nombreSanitizado, descripcionSanitizada);
            const validationErrors = Categoria.validate(categoriaTemp);
            
            if (validationErrors.length > 0) {
                return responseHelper.error(res, 'Errores de validación', 400, {
                    errors: validationErrors
                });
            }
            
            // Verificar si ya existe una categoría con el mismo nombre
            const existente = await db.query(
                'SELECT id_categoria FROM categorias WHERE nombre ILIKE $1',
                [nombreSanitizado]
            );
            
            if (existente.rows.length > 0) {
                return responseHelper.conflict(res, 'Ya existe una categoría con ese nombre');
            }
            
            const result = await db.query(
                'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
                [nombreSanitizado, descripcionSanitizada]
            );
            
            const categoria = ModelMapper.toCategoria(result.rows[0]);
            
            logger.audit('Categoría creada', req.user?.id_usuario, 'CREATE', {
                categoria_id: categoria.id_categoria,
                nombre: categoria.nombre
            });
            
            return responseHelper.success(res, categoria, 'Categoría creada exitosamente', 201);
            
        } catch (error) {
            logger.error('Error en create categoría:', error);
            return responseHelper.error(res, 'Error creando categoría', 500, error);
        }
    },

    async update(req, res) {
        try {
            const id = QueryBuilder.validateId(req.params.id);
            const { nombre, descripcion } = req.body;
            
            // Verificar que la categoría existe
            const existente = await db.query(
                'SELECT * FROM categorias WHERE id_categoria = $1',
                [id]
            );
            
            if (existente.rows.length === 0) {
                return responseHelper.notFound(res, 'Categoría');
            }
            
            // Preparar updates
            const updates = {};
            if (nombre !== undefined) {
                updates.nombre = helpers.sanitizeInput(nombre);
            }
            if (descripcion !== undefined) {
                updates.descripcion = descripcion ? helpers.sanitizeInput(descripcion) : null;
            }
            
            if (Object.keys(updates).length === 0) {
                return responseHelper.error(res, 'No hay campos para actualizar', 400);
            }
            
            // Validar nombre único si se está actualizando
            if (updates.nombre) {
                const nombreExistente = await db.query(
                    'SELECT id_categoria FROM categorias WHERE nombre ILIKE $1 AND id_categoria != $2',
                    [updates.nombre, id]
                );
                
                if (nombreExistente.rows.length > 0) {
                    return responseHelper.conflict(res, 'Ya existe otra categoría con ese nombre');
                }
            }
            
            // Validar usando el modelo
            const categoriaActual = existente.rows[0];
            const categoriaTemp = new Categoria(
                id, 
                updates.nombre || categoriaActual.nombre, 
                updates.descripcion !== undefined ? updates.descripcion : categoriaActual.descripcion
            );
            
            const validationErrors = Categoria.validate(categoriaTemp);
            if (validationErrors.length > 0) {
                return responseHelper.error(res, 'Errores de validación', 400, {
                    errors: validationErrors
                });
            }
            
            const { sql, params } = QueryBuilder.buildUpdateQuery(
                'categorias', 
                updates, 
                'id_categoria', 
                id
            );
            
            const result = await db.query(sql, params);
            const categoria = ModelMapper.toCategoria(result.rows[0]);
            
            logger.audit('Categoría actualizada', req.user?.id_usuario, 'UPDATE', {
                categoria_id: id,
                cambios: Object.keys(updates)
            });
            
            return responseHelper.success(res, categoria, 'Categoría actualizada exitosamente');
            
        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría inválido', 400);
            }
            logger.error('Error en update categoría:', error);
            return responseHelper.error(res, 'Error actualizando categoría', 500, error);
        }
    },

    async delete(req, res) {
        try {
            const id = QueryBuilder.validateId(req.params.id);
            
            // Verificar que la categoría existe
            const existente = await db.query(
                'SELECT * FROM categorias WHERE id_categoria = $1',
                [id]
            );
            
            if (existente.rows.length === 0) {
                return responseHelper.notFound(res, 'Categoría');
            }
            
            // Verificar si hay productos asociados
            const productosAsociados = await db.query(
                'SELECT COUNT(*) FROM productos WHERE id_categoria = $1',
                [id]
            );
            
            const countProductos = parseInt(productosAsociados.rows[0].count);
            if (countProductos > 0) {
                return responseHelper.error(
                    res, 
                    `No se puede eliminar la categoría porque tiene ${countProductos} producto(s) asociado(s)`, 
                    409
                );
            }
            
            const result = await db.query(
                'DELETE FROM categorias WHERE id_categoria = $1 RETURNING *',
                [id]
            );
            
            logger.audit('Categoría eliminada', req.user?.id_usuario, 'DELETE', {
                categoria_id: id,
                nombre: result.rows[0].nombre
            });
            
            return responseHelper.success(res, null, 'Categoría eliminada exitosamente');
            
        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría inválido', 400);
            }
            logger.error('Error en delete categoría:', error);
            return responseHelper.error(res, 'Error eliminando categoría', 500, error);
        }
    },

    async getProductos(req, res) {
        try {
            const id = QueryBuilder.validateId(req.params.id);
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            
            // Verificar que la categoría existe
            const categoriaExistente = await db.query(
                'SELECT * FROM categorias WHERE id_categoria = $1',
                [id]
            );
            
            if (categoriaExistente.rows.length === 0) {
                return responseHelper.notFound(res, 'Categoría');
            }
            
            const productosResult = await db.query(`
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p 
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                WHERE p.id_categoria = $1 
                ORDER BY p.nombre 
                LIMIT $2 OFFSET $3
            `, [id, limit, offset]);
            
            const totalResult = await db.query(
                'SELECT COUNT(*) FROM productos WHERE id_categoria = $1',
                [id]
            );
            
            const total = parseInt(totalResult.rows[0].count);
            const productos = ModelMapper.toProductoList(productosResult.rows);
            
            logger.database('Productos de categoría obtenidos', {
                categoria_id: id,
                count: productos.length,
                total
            });
            
            return responseHelper.success(res, {
                categoria: ModelMapper.toCategoria(categoriaExistente.rows[0]),
                productos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría inválido', 400);
            }
            logger.error('Error obteniendo productos de categoría:', error);
            return responseHelper.error(res, 'Error obteniendo productos de la categoría', 500, error);
        }
    },

    async patch(req, res) {
        const transaction = await db.connect();
        try {
            await transaction.query('BEGIN');

            const id = QueryBuilder.validateId(req.params.id);
            const updates = req.body;

            // Verificar que la categoría existe
            const categoriaExistente = await transaction.query(
                'SELECT * FROM categorias WHERE id_categoria = $1',
                [id]
            );

            if (categoriaExistente.rows.length === 0) {
                await transaction.query('ROLLBACK');
                return responseHelper.notFound(res, 'Categoría');
            }

            // Filtrar updates válidos
            const camposPermitidos = ['nombre', 'descripcion', 'activo', 'color', 'icono'];
            const updatesFiltrados = {};
            
            for (const [key, value] of Object.entries(updates)) {
                if (camposPermitidos.includes(key) && value !== undefined) {
                    updatesFiltrados[key] = key === 'nombre' || key === 'descripcion' ? 
                        helpers.sanitizeInput(value) : value;
                }
            }

            if (Object.keys(updatesFiltrados).length === 0) {
                await transaction.query('ROLLBACK');
                return responseHelper.error(res, 'No hay campos válidos para actualizar', 400);
            }

            // Validar nombre único si se está actualizando
            if (updatesFiltrados.nombre) {
                const nombreExistente = await transaction.query(
                    'SELECT id_categoria FROM categorias WHERE nombre ILIKE $1 AND id_categoria != $2',
                    [updatesFiltrados.nombre, id]
                );
                
                if (nombreExistente.rows.length > 0) {
                    await transaction.query('ROLLBACK');
                    return responseHelper.conflict(res, 'Ya existe otra categoría con ese nombre');
                }
            }

            const { sql, params } = QueryBuilder.buildUpdateQuery(
                'categorias', 
                updatesFiltrados, 
                'id_categoria', 
                id
            );

            const result = await transaction.query(sql, params);
            await transaction.query('COMMIT');

            const categoriaActualizada = ModelMapper.toCategoria(result.rows[0]);

            logger.audit('Categoría actualizada (PATCH)', req.user?.id_usuario, 'UPDATE', {
                categoria_id: id,
                cambios: Object.keys(updatesFiltrados)
            });

            return responseHelper.success(res, categoriaActualizada, 'Categoría actualizada exitosamente');

        } catch (error) {
            await transaction.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría inválido', 400);
            }
            
            logger.error('Error en patch categoría:', error);
            return responseHelper.error(res, 'Error actualizando categoría', 500, error);
        } finally {
            transaction.release();
        }
    },

    async moverProductos(req, res) {
        const transaction = await db.connect();
        try {
            await transaction.query('BEGIN');

            const idOrigen = QueryBuilder.validateId(req.params.id);
            const { categoria_destino_id, productos_ids } = req.body;

            const idDestino = QueryBuilder.validateId(categoria_destino_id);

            // Verificar que ambas categorías existen
            const [categoriaOrigen, categoriaDestino] = await Promise.all([
                transaction.query('SELECT * FROM categorias WHERE id_categoria = $1', [idOrigen]),
                transaction.query('SELECT * FROM categorias WHERE id_categoria = $1', [idDestino])
            ]);

            if (categoriaOrigen.rows.length === 0) {
                await transaction.query('ROLLBACK');
                return responseHelper.notFound(res, 'Categoría origen');
            }

            if (categoriaDestino.rows.length === 0) {
                await transaction.query('ROLLBACK');
                return responseHelper.notFound(res, 'Categoría destino');
            }

            if (idOrigen === idDestino) {
                await transaction.query('ROLLBACK');
                return responseHelper.error(res, 'La categoría origen y destino no pueden ser la misma', 400);
            }

            // Verificar que los productos existen y pertenecen a la categoría origen
            const placeholders = productos_ids.map((_, i) => `$${i + 1}`).join(',');
            const productosResult = await transaction.query(
                `SELECT id_producto, nombre FROM productos 
                 WHERE id_producto IN (${placeholders}) AND id_categoria = $${productos_ids.length + 1}`,
                [...productos_ids, idOrigen]
            );

            if (productosResult.rows.length !== productos_ids.length) {
                await transaction.query('ROLLBACK');
                return responseHelper.error(res, 'Algunos productos no existen o no pertenecen a la categoría origen', 400);
            }

            // Mover productos
            await transaction.query(
                `UPDATE productos SET id_categoria = $1 
                 WHERE id_producto IN (${placeholders})`,
                [idDestino, ...productos_ids]
            );

            await transaction.query('COMMIT');

            logger.audit('Productos movidos entre categorías', req.user?.id_usuario, 'MOVE_PRODUCTS', {
                categoria_origen_id: idOrigen,
                categoria_destino_id: idDestino,
                productos_movidos: productos_ids.length,
                productos_ids: productos_ids
            });

            return responseHelper.success(res, {
                productos_movidos: productos_ids.length,
                categoria_origen: ModelMapper.toCategoria(categoriaOrigen.rows[0]),
                categoria_destino: ModelMapper.toCategoria(categoriaDestino.rows[0])
            }, `${productos_ids.length} producto(s) movido(s) exitosamente`);

        } catch (error) {
            await transaction.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría inválido', 400);
            }
            
            logger.error('Error moviendo productos de categoría:', error);
            return responseHelper.error(res, 'Error moviendo productos entre categorías', 500, error);
        } finally {
            transaction.release();
        }
    },

    async getEstadisticas(req, res) {
        try {
            // Estadísticas globales de categorías
            const estadisticasResult = await db.query(`
                SELECT 
                    COUNT(*) as total_categorias,
                    COUNT(*) FILTER (WHERE activo = true) as categorias_activas,
                    SUM(total_productos) as total_productos_categorizados
                FROM (
                    SELECT c.id_categoria, c.activo, COUNT(p.id_producto) as total_productos
                    FROM categorias c
                    LEFT JOIN productos p ON c.id_categoria = p.id_categoria
                    GROUP BY c.id_categoria, c.activo
                ) as categorias_con_productos
            `);

            // Categorías con más productos
            const categoriasPopulares = await db.query(`
                SELECT 
                    c.id_categoria,
                    c.nombre,
                    COUNT(p.id_producto) as total_productos,
                    COALESCE(SUM(p.stock), 0) as total_stock,
                    COALESCE(AVG(p.precio_venta), 0) as precio_promedio
                FROM categorias c
                LEFT JOIN productos p ON c.id_categoria = p.id_categoria
                GROUP BY c.id_categoria, c.nombre
                ORDER BY total_productos DESC
                LIMIT 10
            `);

            // Productos sin categoría
            const productosSinCategoria = await db.query(`
                SELECT COUNT(*) as total
                FROM productos 
                WHERE id_categoria IS NULL
            `);

            const estadisticas = {
                globales: {
                    total_categorias: parseInt(estadisticasResult.rows[0].total_categorias) || 0,
                    categorias_activas: parseInt(estadisticasResult.rows[0].categorias_activas) || 0,
                    total_productos_categorizados: parseInt(estadisticasResult.rows[0].total_productos_categorizados) || 0,
                    productos_sin_categoria: parseInt(productosSinCategoria.rows[0].total) || 0
                },
                categorias_populares: categoriasPopulares.rows.map(row => ({
                    id_categoria: row.id_categoria,
                    nombre: row.nombre,
                    total_productos: parseInt(row.total_productos),
                    total_stock: parseFloat(row.total_stock),
                    precio_promedio: parseFloat(row.precio_promedio)
                }))
            };

            logger.database('Estadísticas de categorías obtenidas', {
                usuario: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            logger.error('Error obteniendo estadísticas de categorías:', error);
            return responseHelper.error(res, 'Error obteniendo estadísticas', 500, error);
        }
    },

    async getEstadisticasCategoria(req, res) {
        try {
            const id = QueryBuilder.validateId(req.params.id);

            // Verificar que la categoría existe
            const categoriaExistente = await db.query(
                'SELECT * FROM categorias WHERE id_categoria = $1',
                [id]
            );

            if (categoriaExistente.rows.length === 0) {
                return responseHelper.notFound(res, 'Categoría');
            }

            // Estadísticas de productos en la categoría
            const estadisticasProductos = await db.query(`
                SELECT 
                    COUNT(*) as total_productos,
                    COALESCE(SUM(stock), 0) as total_stock,
                    COALESCE(AVG(precio_compra), 0) as precio_compra_promedio,
                    COALESCE(AVG(precio_venta), 0) as precio_venta_promedio,
                    COUNT(*) FILTER (WHERE stock <= 5) as productos_bajo_stock,
                    COUNT(*) FILTER (WHERE fecha_caducidad IS NOT NULL AND fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days') as productos_por_caducar
                FROM productos 
                WHERE id_categoria = $1
            `, [id]);

            // Valor total del inventario en esta categoría
            const valorInventario = await db.query(`
                SELECT COALESCE(SUM(stock * precio_compra), 0) as valor_total
                FROM productos 
                WHERE id_categoria = $1
            `, [id]);

            const estadisticas = {
                categoria: ModelMapper.toCategoria(categoriaExistente.rows[0]),
                productos: {
                    total: parseInt(estadisticasProductos.rows[0].total_productos) || 0,
                    total_stock: parseFloat(estadisticasProductos.rows[0].total_stock) || 0,
                    precio_compra_promedio: parseFloat(estadisticasProductos.rows[0].precio_compra_promedio) || 0,
                    precio_venta_promedio: parseFloat(estadisticasProductos.rows[0].precio_venta_promedio) || 0,
                    productos_bajo_stock: parseInt(estadisticasProductos.rows[0].productos_bajo_stock) || 0,
                    productos_por_caducar: parseInt(estadisticasProductos.rows[0].productos_por_caducar) || 0
                },
                inventario: {
                    valor_total: parseFloat(valorInventario.rows[0].valor_total) || 0
                }
            };

            logger.database('Estadísticas de categoría específica obtenidas', {
                categoria_id: id,
                usuario: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría inválido', 400);
            }
            
            logger.error('Error obteniendo estadísticas de categoría específica:', error);
            return responseHelper.error(res, 'Error obteniendo estadísticas de la categoría', 500, error);
        }
    }
};

module.exports = categoriaController;