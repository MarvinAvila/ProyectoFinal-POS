const db = require('../config/database');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const Producto = require('../models/Producto');
const ModelMapper = require('../utils/modelMapper');
const helpers = require('../utils/helpers');

const productoController = {
    async getAll(req, res) {
        const client = await db.getClient();
        try {
            const { 
                q, 
                categoria, 
                proveedor, 
                con_stock_minimo,
                por_caducar,
                page = 1, 
                limit = 50,
                sortBy = 'nombre',
                sortOrder = 'ASC'
            } = req.query;
            
            const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);
            
            const searchTerm = q ? QueryBuilder.sanitizeSearchTerm(q) : null;
            
            const params = [];
            const whereConditions = ['p.activo = true'];
            let paramIndex = 1;

            // Filtros de búsqueda
            if (searchTerm) {
                whereConditions.push(`(p.nombre ILIKE $${paramIndex} OR p.codigo_barra ILIKE $${paramIndex})`);
                params.push(`%${searchTerm}%`);
                paramIndex++;
            }
            
            if (categoria && !isNaN(categoria)) {
                const categoriaId = QueryBuilder.validateId(categoria);
                whereConditions.push(`p.id_categoria = $${paramIndex}`);
                params.push(categoriaId);
                paramIndex++;
            }

            if (proveedor && !isNaN(proveedor)) {
                const proveedorId = QueryBuilder.validateId(proveedor);
                whereConditions.push(`p.id_proveedor = $${paramIndex}`);
                params.push(proveedorId);
                paramIndex++;
            }

            if (con_stock_minimo === 'true') {
                whereConditions.push(`p.stock <= p.stock_minimo`);
            }

            if (por_caducar === 'true') {
                whereConditions.push(`p.fecha_caducidad IS NOT NULL AND p.fecha_caducidad <= CURRENT_DATE + INTERVAL '30 days'`);
            }

            // Validar ordenamiento
            const validSortFields = ['nombre', 'precio_venta', 'stock', 'fecha_creacion', 'fecha_caducidad'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'nombre';
            const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
            params.push(limitNum, offset);

            const sql = `
                SELECT p.*, 
                       c.nombre as categoria_nombre, 
                       pr.nombre as proveedor_nombre,
                       (p.precio_venta - p.precio_compra) as ganancia_unitaria,
                       (p.precio_venta - p.precio_compra) / NULLIF(p.precio_compra, 0) * 100 as margen_ganancia
                FROM productos p
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                ${whereSQL}
                ORDER BY p.${sortField} ${order}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            
            const result = await client.query(sql, params);

            // Contar total para paginación
            const countSQL = `SELECT COUNT(*) FROM productos p ${whereSQL}`;
            const countResult = await client.query(countSQL, params.slice(0, params.length - 2));
            const total = parseInt(countResult.rows[0].count);

            const productos = ModelMapper.toProductoList(result.rows);

            // Enriquecer con información del modelo
            const productosEnriquecidos = productos.map(producto => {
                const productoModel = new Producto(
                    producto.id_producto,
                    producto.nombre,
                    producto.descripcion,
                    producto.codigo_barra,
                    producto.precio_compra,
                    producto.precio_venta,
                    producto.stock,
                    producto.stock_minimo,
                    producto.unidad,
                    producto.id_categoria,
                    producto.id_proveedor,
                    producto.fecha_caducidad,
                    producto.activo,
                    producto.fecha_creacion
                );

                return {
                    ...producto,
                    necesita_reposicion: productoModel.necesitaReposicion(),
                    por_caducar: productoModel.estaPorCaducar(),
                    estado_stock: productoModel.getEstadoStock(),
                    dias_para_caducar: productoModel.diasParaCaducar()
                };
            });

            logger.api("Listado de productos obtenido", {
                total: productos.length,
                con_alerta_stock: productosEnriquecidos.filter(p => p.necesita_reposicion).length,
                por_caducar: productosEnriquecidos.filter(p => p.por_caducar).length
            });

            return responseHelper.success(res, {
                productos: productosEnriquecidos,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                },
                filtros: {
                    search: q,
                    categoria,
                    proveedor,
                    con_stock_minimo,
                    por_caducar
                }
            });

        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de categoría o proveedor inválido', 400);
            }
            logger.error("Error en productoController.getAll", error);
            return responseHelper.error(res, "Error obteniendo productos", 500, error);
        } finally {
            client.release();
        }
    },

    async getById(req, res) {
        const client = await db.getClient();
        try {
            const id = QueryBuilder.validateId(req.params.id);

            const result = await client.query(
                `SELECT p.*, 
                        c.nombre as categoria_nombre, 
                        pr.nombre as proveedor_nombre,
                        pr.contacto as proveedor_contacto
                 FROM productos p
                 LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                 LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                 WHERE p.id_producto = $1 AND p.activo = true`,
                [id]
            );
            
            if (result.rows.length === 0) {
                return responseHelper.notFound(res, "Producto");
            }

            const producto = ModelMapper.toProducto(result.rows[0]);
            const productoModel = new Producto(
                producto.id_producto,
                producto.nombre,
                producto.descripcion,
                producto.codigo_barra,
                producto.precio_compra,
                producto.precio_venta,
                producto.stock,
                producto.stock_minimo,
                producto.unidad,
                producto.id_categoria,
                producto.id_proveedor,
                producto.fecha_caducidad,
                producto.activo,
                producto.fecha_creacion
            );

            // Información enriquecida
            const productoEnriquecido = {
                ...producto,
                categoria_nombre: result.rows[0].categoria_nombre,
                proveedor_nombre: result.rows[0].proveedor_nombre,
                proveedor_contacto: result.rows[0].proveedor_contacto,
                necesita_reposicion: productoModel.necesitaReposicion(),
                por_caducar: productoModel.estaPorCaducar(),
                margen_ganancia: productoModel.margenGanancia(),
                ganancia_unitaria: productoModel.calcularGanancia(),
                estado_stock: productoModel.getEstadoStock(),
                dias_para_caducar: productoModel.diasParaCaducar(),
                es_rentable: productoModel.esRentable()
            };

            logger.api("Producto obtenido por ID", { producto_id: id });

            return responseHelper.success(res, productoEnriquecido);

        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de producto inválido', 400);
            }
            logger.error("Error en productoController.getById", error);
            return responseHelper.error(res, "Error obteniendo producto", 500, error);
        } finally {
            client.release();
        }
    },

    // 🟣 Crear producto (sin stock_minimo)
async create(req, res) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { 
      id_categoria, 
      id_proveedor, 
      nombre, 
      codigo_barra, 
      precio_compra, 
      precio_venta, 
      stock, 
      unidad, 
      fecha_caducidad 
    } = req.body;

    // Sanitizar entrada
    const productoData = {
      nombre: helpers.sanitizeInput(nombre),
      codigo_barra: codigo_barra || `BC${Date.now()}${Math.floor(Math.random() * 1000)}`,
      precio_compra: parseFloat(precio_compra),
      precio_venta: parseFloat(precio_venta),
      stock: parseFloat(stock) || 0,
      unidad: unidad || 'unidad',
      fecha_caducidad: fecha_caducidad || null,
      id_categoria: id_categoria ? QueryBuilder.validateId(id_categoria) : null,
      id_proveedor: id_proveedor ? QueryBuilder.validateId(id_proveedor) : null
    };

    // Validar usando el modelo
    const validationErrors = Producto.validate(productoData);
    if (validationErrors.length > 0) {
      await client.query('ROLLBACK');
      return responseHelper.error(res, 'Errores de validación', 400, {
        errors: validationErrors
      });
    }

    // Verificar código de barras único
    if (codigo_barra) {
      const codigoExistente = await client.query(
        'SELECT id_producto FROM productos WHERE codigo_barra = $1',
        [productoData.codigo_barra]
      );
      if (codigoExistente.rows.length > 0) {
        await client.query('ROLLBACK');
        return responseHelper.conflict(res, 'Ya existe un producto con ese código de barras');
      }
    }

    // Verificar categoría si se proporciona
    if (id_categoria) {
      const categoriaExists = await client.query(
        'SELECT id_categoria FROM categorias WHERE id_categoria = $1',
        [id_categoria]
      );
      if (categoriaExists.rows.length === 0) {
        await client.query('ROLLBACK');
        return responseHelper.notFound(res, 'Categoría');
      }
    }

    // Verificar proveedor si se proporciona
    if (id_proveedor) {
      const proveedorExists = await client.query(
        'SELECT id_proveedor FROM proveedores WHERE id_proveedor = $1',
        [id_proveedor]
      );
      if (proveedorExists.rows.length === 0) {
        await client.query('ROLLBACK');
        return responseHelper.notFound(res, 'Proveedor');
      }
    }

    // ✅ INSERT sin stock_minimo
    const result = await client.query(
      `INSERT INTO productos (
          id_categoria, id_proveedor, nombre, codigo_barra, 
          precio_compra, precio_venta, stock, unidad, fecha_caducidad
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        productoData.id_categoria,
        productoData.id_proveedor,
        productoData.nombre,
        productoData.codigo_barra,
        productoData.precio_compra,
        productoData.precio_venta,
        productoData.stock,
        productoData.unidad,
        productoData.fecha_caducidad
      ]
    );

    await client.query('COMMIT');

    const nuevoProducto = ModelMapper.toProducto(result.rows[0]);

    logger.audit("Producto creado", req.user?.id_usuario, "CREATE", {
      producto_id: nuevoProducto.id_producto,
      nombre: nuevoProducto.nombre,
      precio_venta: nuevoProducto.precio_venta,
      stock_inicial: nuevoProducto.stock
    });
    // ✅ Respuesta compatible con Flutter
    return res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      data: nuevoProducto
    });

    //return responseHelper.success(res, nuevoProducto, "Producto creado exitosamente", 201);

  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error.message === 'ID inválido') {
      return responseHelper.error(res, 'ID de categoría o proveedor inválido', 400);
    }
    
    logger.error("Error en productoController.create", error);
    return responseHelper.error(res, "Error creando producto", 500, error);
  } finally {
    client.release();
  }
},
// 🟣 Actualizar producto (sin stock_minimo)
async update(req, res) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const id = QueryBuilder.validateId(req.params.id);
    const updates = req.body;

    // Verificar que el producto existe
    const productoExistente = await client.query(
      'SELECT * FROM productos WHERE id_producto = $1',
      [id]
    );

    if (productoExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return responseHelper.notFound(res, 'Producto');
    }

    // Preparar datos actuales
    const productoActual = productoExistente.rows[0];
    const productoData = { ...productoActual };

    // Aplicar updates validados (sin stock_minimo)
    if (updates.nombre !== undefined) productoData.nombre = helpers.sanitizeInput(updates.nombre);
    if (updates.codigo_barra !== undefined) productoData.codigo_barra = updates.codigo_barra;
    if (updates.precio_compra !== undefined) productoData.precio_compra = parseFloat(updates.precio_compra);
    if (updates.precio_venta !== undefined) productoData.precio_venta = parseFloat(updates.precio_venta);
    if (updates.stock !== undefined) productoData.stock = parseFloat(updates.stock);
    if (updates.unidad !== undefined) productoData.unidad = updates.unidad;
    if (updates.fecha_caducidad !== undefined) productoData.fecha_caducidad = updates.fecha_caducidad;
    if (updates.id_categoria !== undefined)
      productoData.id_categoria = updates.id_categoria ? QueryBuilder.validateId(updates.id_categoria) : null;
    if (updates.id_proveedor !== undefined)
      productoData.id_proveedor = updates.id_proveedor ? QueryBuilder.validateId(updates.id_proveedor) : null;

    // Validar con el modelo
    const validationErrors = Producto.validate(productoData);
    if (validationErrors.length > 0) {
      await client.query('ROLLBACK');
      return responseHelper.error(res, 'Errores de validación', 400, { errors: validationErrors });
    }

    // Verificar código de barras único si se cambia
    if (updates.codigo_barra && updates.codigo_barra !== productoActual.codigo_barra) {
      const codigoExistente = await client.query(
        'SELECT id_producto FROM productos WHERE codigo_barra = $1 AND id_producto != $2',
        [updates.codigo_barra, id]
      );
      if (codigoExistente.rows.length > 0) {
        await client.query('ROLLBACK');
        return responseHelper.conflict(res, 'Ya existe otro producto con ese código de barras');
      }
    }

    // Construir query dinámica
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(field => {
      if (['nombre', 'codigo_barra', 'unidad', 'fecha_caducidad'].includes(field)) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(productoData[field]);
        paramIndex++;
      } else if (['precio_compra', 'precio_venta', 'stock'].includes(field)) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(parseFloat(updates[field]));
        paramIndex++;
      } else if (field === 'id_categoria') {
        setClauses.push(`id_categoria = $${paramIndex}`);
        values.push(updates[field] ? QueryBuilder.validateId(updates[field]) : null);
        paramIndex++;
      } else if (field === 'id_proveedor') {
        setClauses.push(`id_proveedor = $${paramIndex}`);
        values.push(updates[field] ? QueryBuilder.validateId(updates[field]) : null);
        paramIndex++;
      }
    });

    if (setClauses.length === 0) {
      await client.query('ROLLBACK');
      return responseHelper.error(res, 'No se proporcionaron campos válidos para actualizar', 400);
    }

    values.push(id);
    const setSQL = setClauses.join(', ');

    const result = await client.query(
      `UPDATE productos SET ${setSQL}, fecha_actualizacion = CURRENT_TIMESTAMP 
       WHERE id_producto = $${paramIndex} RETURNING *`,
      values
    );

    await client.query('COMMIT');

    const productoActualizado = ModelMapper.toProducto(result.rows[0]);

    logger.audit("Producto actualizado", req.user?.id_usuario, "UPDATE", {
      producto_id: id,
      campos_actualizados: Object.keys(updates)
    });
      // ✅ Respuesta compatible con Flutter
    return res.status(200).json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: productoActualizado
    });
    //return responseHelper.success(res, productoActualizado, "Producto actualizado exitosamente");

  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error.message === 'ID inválido') {
      return responseHelper.error(res, 'ID de categoría o proveedor inválido', 400);
    }
    
    logger.error("Error en productoController.update", error);
    return responseHelper.error(res, "Error actualizando producto", 500, error);
  } finally {
    client.release();
  }
},


    async delete(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const id = QueryBuilder.validateId(req.params.id);

            // Verificar que el producto existe
            const productoExistente = await client.query(
                'SELECT * FROM productos WHERE id_producto = $1',
                [id]
            );

            if (productoExistente.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Producto');
            }

            // Verificar si hay ventas asociadas
            const ventasAsociadas = await client.query(
                'SELECT COUNT(*) FROM detalle_venta WHERE id_producto = $1',
                [id]
            );

            const countVentas = parseInt(ventasAsociadas.rows[0].count);
            if (countVentas > 0) {
                // En lugar de eliminar, desactivar el producto
                await client.query(
                    'UPDATE productos SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = $1',
                    [id]
                );
                
                await client.query('COMMIT');

                logger.audit("Producto desactivado", req.user?.id_usuario, "UPDATE", {
                    producto_id: id,
                    motivo: 'Tiene ventas asociadas',
                    ventas_asociadas: countVentas
                });

                return responseHelper.success(res, null, 'Producto desactivado (tenía ventas asociadas)');
            }

            // Eliminar relaciones en producto_oferta
            await client.query('DELETE FROM producto_oferta WHERE id_producto = $1', [id]);

            // Eliminar producto
            await client.query('DELETE FROM productos WHERE id_producto = $1', [id]);

            await client.query('COMMIT');

            logger.audit("Producto eliminado", req.user?.id_usuario, "DELETE", {
                producto_id: id,
                nombre: productoExistente.rows[0].nombre
            });

            return responseHelper.success(res, null, 'Producto eliminado exitosamente');

        } catch (error) {
            await client.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de producto inválido', 400);
            }
            
            logger.error("Error en productoController.delete", error);
            return responseHelper.error(res, "Error eliminando producto", 500, error);
        } finally {
            client.release();
        }
    },

    async getStats(req, res) {
        const client = await db.getClient();
        try {
            const stats = await client.query(`
                SELECT 
                    COUNT(*) as total_productos,
                    SUM(CASE WHEN stock <= stock_minimo THEN 1 ELSE 0 END) as productos_bajo_stock,
                    SUM(CASE WHEN fecha_caducidad IS NOT NULL AND fecha_caducidad <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as productos_por_caducar,
                    AVG(precio_venta - precio_compra) as ganancia_promedio,
                    SUM(stock * precio_compra) as valor_inventario
                FROM productos 
                WHERE activo = true
            `);

            const categoriasStats = await client.query(`
                SELECT c.nombre, COUNT(p.id_producto) as cantidad_productos
                FROM categorias c
                LEFT JOIN productos p ON c.id_categoria = p.id_categoria AND p.activo = true
                GROUP BY c.id_categoria, c.nombre
                ORDER BY cantidad_productos DESC
            `);

            logger.api("Estadísticas de productos obtenidas", {
                usuario: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                general: stats.rows[0],
                por_categoria: categoriasStats.rows
            });

        } catch (error) {
            logger.error("Error en productoController.getStats", error);
            return responseHelper.error(res, "Error obteniendo estadísticas", 500, error);
        } finally {
            client.release();
        }
    }
};

module.exports = productoController;