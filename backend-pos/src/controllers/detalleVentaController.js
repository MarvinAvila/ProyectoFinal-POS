const db = require('../config/database');
const DetalleVenta = require('../models/DetalleVenta');
const HistorialInventario = require('../models/HistorialInventario');
const ModelMapper = require('../utils/modelMapper');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

const detalleVentaController = {
  async getAll(req, res) {
    try {
      const { id_venta, id_producto } = req.query;
      const { page, limit, offset } = helpers.getPaginationParams(req.query);
      
      const params = [];
      const where = [];
      let idx = 1;

      if (id_venta) {
        const ventaId = QueryBuilder.validateId(id_venta);
        where.push(`dv.id_venta = $${idx}`);
        params.push(ventaId);
        idx++;
      }

      if (id_producto) {
        const productoId = QueryBuilder.validateId(id_producto);
        where.push(`dv.id_producto = $${idx}`);
        params.push(productoId);
        idx++;
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
      
      const sql = `
        SELECT dv.*, 
               p.nombre as producto_nombre,
               v.total as venta_total,
               v.fecha as venta_fecha
        FROM detalle_venta dv
        LEFT JOIN productos p ON dv.id_producto = p.id_producto
        LEFT JOIN ventas v ON dv.id_venta = v.id_venta
        ${whereSQL} 
        ORDER BY dv.id_detalle DESC 
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      
      params.push(limit, offset);
      
      const result = await db.query(sql, params);
      const detalles = ModelMapper.toDetalleVentaList(result.rows);

      // Contar total para paginación
      const countSQL = `SELECT COUNT(*) FROM detalle_venta dv ${whereSQL}`;
      const countResult = await db.query(countSQL, params.slice(0, params.length - 2));
      const total = parseInt(countResult.rows[0].count);

      logger.database('Detalles de venta obtenidos exitosamente', {
        count: detalles.length,
        total,
        filtros: { id_venta, id_producto }
      });

      return responseHelper.success(res, {
        detalles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID inválido en parámetros de búsqueda', 400);
      }
      logger.error('Error en getAll detalles de venta:', error);
      return responseHelper.error(res, 'Error obteniendo detalles de venta', 500, error);
    }
  },

  async getById(req, res) {
    try {
      const id = QueryBuilder.validateId(req.params.id);
      
      const result = await db.query(`
        SELECT dv.*, 
               p.nombre as producto_nombre,
               p.codigo_barra,
               v.total as venta_total,
               v.fecha as venta_fecha,
               u.nombre as usuario_nombre
        FROM detalle_venta dv
        LEFT JOIN productos p ON dv.id_producto = p.id_producto
        LEFT JOIN ventas v ON dv.id_venta = v.id_venta
        LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
        WHERE dv.id_detalle = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return responseHelper.notFound(res, 'Detalle de venta');
      }

      const detalle = ModelMapper.toDetalleVenta(result.rows[0]);
      
      logger.database('Detalle de venta obtenido por ID', { id });

      return responseHelper.success(res, detalle);

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de detalle inválido', 400);
      }
      logger.error('Error en getById detalle de venta:', error);
      return responseHelper.error(res, 'Error obteniendo detalle de venta', 500, error);
    }
  },

  async create(req, res) {
    const transaction = await db.connect();
    
    try {
      await transaction.query('BEGIN');
      
      const { id_venta, id_producto, cantidad, precio_unitario } = req.body;

      // Validar datos requeridos
      if (!id_venta || !id_producto || cantidad == null || precio_unitario == null) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Faltan datos obligatorios: id_venta, id_producto, cantidad, precio_unitario', 400);
      }

      // Validar IDs
      const ventaId = QueryBuilder.validateId(id_venta);
      const productoId = QueryBuilder.validateId(id_producto);
      const cantidadNum = parseFloat(cantidad);
      const precioNum = parseFloat(precio_unitario);

      if (cantidadNum <= 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'La cantidad debe ser mayor a 0', 400);
      }

      if (precioNum <= 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'El precio unitario debe ser mayor a 0', 400);
      }

      // Verificar que la venta existe
      const ventaExistente = await transaction.query(
        'SELECT id_venta FROM ventas WHERE id_venta = $1',
        [ventaId]
      );

      if (ventaExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Venta');
      }

      // Verificar que el producto existe y tiene stock suficiente
      const productoExistente = await transaction.query(
        'SELECT nombre, stock FROM productos WHERE id_producto = $1',
        [productoId]
      );

      if (productoExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Producto');
      }

      const producto = productoExistente.rows[0];
      if (parseFloat(producto.stock) < cantidadNum) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, `Stock insuficiente. Disponible: ${producto.stock}`, 400);
      }

      // Crear instancia del detalle
      const detalle = DetalleVenta.crearNuevo(ventaId, productoId, cantidadNum, precioNum);
      
      // Validar el detalle
      const validationErrors = DetalleVenta.validate?.(detalle) || [];
      if (validationErrors.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Errores de validación en el detalle', 400, {
          errors: validationErrors
        });
      }

      // Insertar detalle
      const insertResult = await transaction.query(
        `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [detalle.id_venta, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
      );

      // Actualizar stock del producto (si no hay trigger)
      await transaction.query(
        'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2',
        [cantidadNum, productoId]
      );

      // Registrar en historial de inventario
      const movimiento = HistorialInventario.crearVenta(
        productoId, 
        cantidadNum, 
        req.user?.id_usuario || null
      );
      
      await transaction.query(
        `INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
         VALUES ($1, $2, $3, $4, $5)`,
        [movimiento.id_producto, movimiento.cambio, movimiento.motivo, movimiento.fecha, movimiento.id_usuario]
      );

      await transaction.query('COMMIT');
      
      const detalleCreado = ModelMapper.toDetalleVenta(insertResult.rows[0]);
      detalleCreado.producto_nombre = producto.nombre;

      logger.audit('Detalle de venta creado', req.user?.id_usuario, 'CREATE', {
        detalle_id: detalleCreado.id_detalle,
        venta_id: ventaId,
        producto_id: productoId,
        cantidad: cantidadNum,
        subtotal: detalleCreado.subtotal
      });

      return responseHelper.success(res, detalleCreado, 'Detalle de venta creado exitosamente', 201);

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID inválido en los datos proporcionados', 400);
      }
      
      logger.error('Error en create detalle de venta:', error);
      return responseHelper.error(res, 'Error creando detalle de venta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async update(req, res) {
    const transaction = await db.connect();
    
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const { id_producto: newProducto, cantidad: newCantidad, precio_unitario: newPrecio } = req.body;

      // Obtener detalle actual
      const currentResult = await transaction.query(
        'SELECT * FROM detalle_venta WHERE id_detalle = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Detalle de venta');
      }

      const oldDetalle = ModelMapper.toDetalleVenta(currentResult.rows[0]);
      const idVenta = oldDetalle.id_venta;
      const oldProducto = oldDetalle.id_producto;
      const oldCantidad = parseFloat(oldDetalle.cantidad);
      
      const precioUnitario = newPrecio != null ? parseFloat(newPrecio) : oldDetalle.precio_unitario;
      const cantidadFinal = newCantidad != null ? parseFloat(newCantidad) : oldCantidad;
      const productoFinal = newProducto != null ? QueryBuilder.validateId(newProducto) : oldProducto;

      if (precioUnitario <= 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'El precio unitario debe ser mayor a 0', 400);
      }

      if (cantidadFinal <= 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'La cantidad debe ser mayor a 0', 400);
      }

      const subtotal = cantidadFinal * precioUnitario;

      // Lógica de actualización de stock
      if (productoFinal === oldProducto) {
        // Mismo producto: ajustar por delta
        const delta = cantidadFinal - oldCantidad;
        
        if (delta !== 0) {
          // Verificar stock suficiente si se aumenta la cantidad
          if (delta > 0) {
            const productoStock = await transaction.query(
              'SELECT stock FROM productos WHERE id_producto = $1',
              [oldProducto]
            );
            
            if (productoStock.rows.length === 0) {
              await transaction.query('ROLLBACK');
              return responseHelper.notFound(res, 'Producto');
            }

            const stockActual = parseFloat(productoStock.rows[0].stock);
            if (stockActual < delta) {
              await transaction.query('ROLLBACK');
              return responseHelper.error(res, `Stock insuficiente para el ajuste. Disponible: ${stockActual}`, 400);
            }
          }

          await transaction.query(
            'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2',
            [delta, oldProducto]
          );

          const movimiento = HistorialInventario.crearMovimiento(
            oldProducto,
            -delta,
            'ajuste_detalle_venta',
            req.user?.id_usuario || null
          );

          await transaction.query(
            `INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
             VALUES ($1, $2, $3, $4, $5)`,
            [movimiento.id_producto, movimiento.cambio, movimiento.motivo, movimiento.fecha, movimiento.id_usuario]
          );
        }
      } else {
        // Producto diferente: revertir viejo y aplicar nuevo
        // Verificar que el nuevo producto existe y tiene stock
        const nuevoProducto = await transaction.query(
          'SELECT nombre, stock FROM productos WHERE id_producto = $1',
          [productoFinal]
        );

        if (nuevoProducto.rows.length === 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.notFound(res, 'Nuevo producto');
        }

        if (parseFloat(nuevoProducto.rows[0].stock) < cantidadFinal) {
          await transaction.query('ROLLBACK');
          return responseHelper.error(res, `Stock insuficiente en el nuevo producto. Disponible: ${nuevoProducto.rows[0].stock}`, 400);
        }

        // Revertir producto viejo
        await transaction.query(
          'UPDATE productos SET stock = stock + $1 WHERE id_producto = $2',
          [oldCantidad, oldProducto]
        );

        await transaction.query(
          `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
           VALUES ($1, $2, $3, $4)`,
          [oldProducto, oldCantidad, 'revertir_cambio_detalle', req.user?.id_usuario || null]
        );

        // Aplicar producto nuevo
        await transaction.query(
          'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2',
          [cantidadFinal, productoFinal]
        );

        await transaction.query(
          `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
           VALUES ($1, $2, $3, $4)`,
          [productoFinal, -cantidadFinal, 'aplicar_cambio_detalle', req.user?.id_usuario || null]
        );
      }

      // Actualizar detalle
      const updateResult = await transaction.query(
        `UPDATE detalle_venta
         SET id_producto = $1, cantidad = $2, precio_unitario = $3, subtotal = $4
         WHERE id_detalle = $5
         RETURNING *`,
        [productoFinal, cantidadFinal, precioUnitario, subtotal, id]
      );

      await transaction.query('COMMIT');

      const detalleActualizado = ModelMapper.toDetalleVenta(updateResult.rows[0]);

      logger.audit('Detalle de venta actualizado', req.user?.id_usuario, 'UPDATE', {
        detalle_id: id,
        cambios: { producto: productoFinal !== oldProducto, cantidad: cantidadFinal !== oldCantidad }
      });

      return responseHelper.success(res, detalleActualizado, 'Detalle de venta actualizado exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID inválido en los datos proporcionados', 400);
      }
      
      logger.error('Error en update detalle de venta:', error);
      return responseHelper.error(res, 'Error actualizando detalle de venta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async delete(req, res) {
    const transaction = await db.connect();
    
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);

      // Obtener detalle actual
      const currentResult = await transaction.query(
        'SELECT * FROM detalle_venta WHERE id_detalle = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Detalle de venta');
      }

      const oldDetalle = ModelMapper.toDetalleVenta(currentResult.rows[0]);

      // Revertir stock
      await transaction.query(
        'UPDATE productos SET stock = stock + $1 WHERE id_producto = $2',
        [oldDetalle.cantidad, oldDetalle.id_producto]
      );

      // Registrar en historial
      const movimiento = HistorialInventario.crearMovimiento(
        oldDetalle.id_producto,
        oldDetalle.cantidad,
        'eliminar_detalle_venta',
        req.user?.id_usuario || null
      );

      await transaction.query(
        `INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
         VALUES ($1, $2, $3, $4, $5)`,
        [movimiento.id_producto, movimiento.cambio, movimiento.motivo, movimiento.fecha, movimiento.id_usuario]
      );

      // Eliminar detalle
      await transaction.query('DELETE FROM detalle_venta WHERE id_detalle = $1', [id]);

      await transaction.query('COMMIT');

      logger.audit('Detalle de venta eliminado', req.user?.id_usuario, 'DELETE', {
        detalle_id: id,
        producto_id: oldDetalle.id_producto,
        cantidad_revertida: oldDetalle.cantidad
      });

      return responseHelper.success(res, null, 'Detalle de venta eliminado exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de detalle inválido', 400);
      }
      
      logger.error('Error en delete detalle de venta:', error);
      return responseHelper.error(res, 'Error eliminando detalle de venta', 500, error);
    } finally {
      transaction.release();
    }
  },

async getByVenta(req, res) {
    try {
      const id_venta = QueryBuilder.validateId(req.params.id_venta);
      const { page, limit, offset } = helpers.getPaginationParams(req.query);
      
      const result = await db.query(`
        SELECT dv.*, 
               p.nombre as producto_nombre,
               p.codigo_barra,
               p.precio_compra,
               c.nombre as categoria_nombre
        FROM detalle_venta dv
        LEFT JOIN productos p ON dv.id_producto = p.id_producto
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE dv.id_venta = $1
        ORDER BY dv.id_detalle
        LIMIT $2 OFFSET $3
      `, [id_venta, limit, offset]);
      
      const detalles = ModelMapper.toDetalleVentaList(result.rows);

      // Contar total
      const countResult = await db.query(
        'SELECT COUNT(*) FROM detalle_venta WHERE id_venta = $1',
        [id_venta]
      );
      const total = parseInt(countResult.rows[0].count);

      logger.database('Detalles de venta obtenidos por venta ID', { 
        venta_id: id_venta, 
        count: detalles.length 
      });

      return responseHelper.success(res, {
        detalles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de venta inválido', 400);
      }
      logger.error('Error en getByVenta:', error);
      return responseHelper.error(res, 'Error obteniendo detalles por venta', 500, error);
    }
  },

  async getByProducto(req, res) {
    try {
      const id_producto = QueryBuilder.validateId(req.params.id_producto);
      const { fecha_inicio, fecha_fin } = req.query;
      const { page, limit, offset } = helpers.getPaginationParams(req.query);
      
      const params = [id_producto];
      let whereClause = 'WHERE dv.id_producto = $1';
      let paramIndex = 2;

      if (fecha_inicio) {
        whereClause += ` AND v.fecha >= $${paramIndex}`;
        params.push(fecha_inicio);
        paramIndex++;
      }

      if (fecha_fin) {
        whereClause += ` AND v.fecha <= $${paramIndex}`;
        params.push(fecha_fin);
        paramIndex++;
      }

      params.push(limit, offset);

      const result = await db.query(`
        SELECT dv.*, 
               v.fecha as venta_fecha,
               v.total as venta_total,
               u.nombre as vendedor_nombre
        FROM detalle_venta dv
        LEFT JOIN ventas v ON dv.id_venta = v.id_venta
        LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
        ${whereClause}
        ORDER BY v.fecha DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, params);
      
      const detalles = ModelMapper.toDetalleVentaList(result.rows);

      // Contar total
      const countResult = await db.query(`
        SELECT COUNT(*) 
        FROM detalle_venta dv
        LEFT JOIN ventas v ON dv.id_venta = v.id_venta
        ${whereClause}
      `, params.slice(0, params.length - 2));
      
      const total = parseInt(countResult.rows[0].count);

      // Estadísticas del producto
      const statsResult = await db.query(`
        SELECT 
          COUNT(DISTINCT dv.id_venta) as total_ventas,
          SUM(dv.cantidad) as total_vendido,
          SUM(dv.subtotal) as ingresos_totales,
          AVG(dv.precio_unitario) as precio_promedio
        FROM detalle_venta dv
        LEFT JOIN ventas v ON dv.id_venta = v.id_venta
        ${whereClause}
      `, params.slice(0, params.length - 2));

      logger.database('Detalles de venta obtenidos por producto ID', { 
        producto_id: id_producto, 
        count: detalles.length 
      });

      return responseHelper.success(res, {
        detalles,
        estadisticas: statsResult.rows[0],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de producto inválido', 400);
      }
      logger.error('Error en getByProducto:', error);
      return responseHelper.error(res, 'Error obteniendo detalles por producto', 500, error);
    }
  },

  async createMultiple(req, res) {
    const transaction = await db.connect();
    
    try {
      await transaction.query('BEGIN');
      
      const { id_venta, detalles } = req.body;

      // Validaciones básicas
      if (!id_venta || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Datos inválidos para crear múltiples detalles', 400);
      }

      const ventaId = QueryBuilder.validateId(id_venta);

      // Verificar que la venta existe
      const ventaExistente = await transaction.query(
        'SELECT id_venta FROM ventas WHERE id_venta = $1',
        [ventaId]
      );

      if (ventaExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Venta');
      }

      const detallesCreados = [];
      const errores = [];

      // Procesar cada detalle
      for (let i = 0; i < detalles.length; i++) {
        const detalleData = detalles[i];
        
        try {
          const { id_producto, cantidad, precio_unitario } = detalleData;

          // Validar datos del detalle
          if (!id_producto || cantidad == null || precio_unitario == null) {
            errores.push(`Detalle ${i + 1}: Faltan datos obligatorios`);
            continue;
          }

          const productoId = QueryBuilder.validateId(id_producto);
          const cantidadNum = parseFloat(cantidad);
          const precioNum = parseFloat(precio_unitario);

          if (cantidadNum <= 0) {
            errores.push(`Detalle ${i + 1}: La cantidad debe ser mayor a 0`);
            continue;
          }

          if (precioNum <= 0) {
            errores.push(`Detalle ${i + 1}: El precio unitario debe ser mayor a 0`);
            continue;
          }

          // Verificar stock
          const producto = await transaction.query(
            'SELECT nombre, stock FROM productos WHERE id_producto = $1',
            [productoId]
          );

          if (producto.rows.length === 0) {
            errores.push(`Detalle ${i + 1}: Producto no encontrado`);
            continue;
          }

          if (parseFloat(producto.rows[0].stock) < cantidadNum) {
            errores.push(`Detalle ${i + 1}: Stock insuficiente. Disponible: ${producto.rows[0].stock}`);
            continue;
          }

          // Crear detalle
          const detalle = DetalleVenta.crearNuevo(ventaId, productoId, cantidadNum, precioNum);
          
          const insertResult = await transaction.query(
            `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [detalle.id_venta, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
          );

          // Actualizar stock
          await transaction.query(
            'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2',
            [cantidadNum, productoId]
          );

          // Registrar en historial
          await transaction.query(
            `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
             VALUES ($1, $2, $3, $4)`,
            [productoId, -cantidadNum, 'venta_multiple', req.user?.id_usuario || null]
          );

          const detalleCreado = ModelMapper.toDetalleVenta(insertResult.rows[0]);
          detalleCreado.producto_nombre = producto.rows[0].nombre;
          detallesCreados.push(detalleCreado);

        } catch (error) {
          errores.push(`Detalle ${i + 1}: ${error.message}`);
        }
      }

      // Si hay errores, hacer rollback
      if (errores.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Errores al crear detalles', 400, { errores });
      }

      await transaction.query('COMMIT');

      logger.audit('Múltiples detalles de venta creados', req.user?.id_usuario, 'CREATE', {
        venta_id: ventaId,
        total_detalles: detallesCreados.length,
        productos: detallesCreados.map(d => d.id_producto)
      });

      return responseHelper.success(res, {
        detalles: detallesCreados,
        total: detallesCreados.length
      }, 'Detalles de venta creados exitosamente', 201);

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de venta inválido', 400);
      }
      
      logger.error('Error en createMultiple detalles de venta:', error);
      return responseHelper.error(res, 'Error creando múltiples detalles de venta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async patch(req, res) {
    const transaction = await db.connect();
    
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const { cantidad, precio_unitario, comentario } = req.body;

      // Obtener detalle actual
      const currentResult = await transaction.query(
        'SELECT * FROM detalle_venta WHERE id_detalle = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Detalle de venta');
      }

      const oldDetalle = ModelMapper.toDetalleVenta(currentResult.rows[0]);
      const updates = {};
      const cambios = [];

      // Aplicar actualizaciones parciales
      if (cantidad !== undefined) {
        const cantidadNum = parseFloat(cantidad);
        if (cantidadNum <= 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.error(res, 'La cantidad debe ser mayor a 0', 400);
        }
        updates.cantidad = cantidadNum;
        cambios.push('cantidad');
      }

      if (precio_unitario !== undefined) {
        const precioNum = parseFloat(precio_unitario);
        if (precioNum <= 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.error(res, 'El precio unitario debe ser mayor a 0', 400);
        }
        updates.precio_unitario = precioNum;
        cambios.push('precio_unitario');
      }

      if (comentario !== undefined) {
        updates.comentario = comentario;
        cambios.push('comentario');
      }

      // Si no hay cambios
      if (Object.keys(updates).length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'No se proporcionaron campos para actualizar', 400);
      }

      // Calcular nuevo subtotal si cambió cantidad o precio
      if (updates.cantidad !== undefined || updates.precio_unitario !== undefined) {
        const nuevaCantidad = updates.cantidad !== undefined ? updates.cantidad : oldDetalle.cantidad;
        const nuevoPrecio = updates.precio_unitario !== undefined ? updates.precio_unitario : oldDetalle.precio_unitario;
        updates.subtotal = nuevaCantidad * nuevoPrecio;
      }

      // Manejar actualización de stock si cambió la cantidad
      if (updates.cantidad !== undefined) {
        const delta = updates.cantidad - oldDetalle.cantidad;
        
        if (delta !== 0) {
          // Verificar stock suficiente si se aumenta la cantidad
          if (delta > 0) {
            const productoStock = await transaction.query(
              'SELECT stock FROM productos WHERE id_producto = $1',
              [oldDetalle.id_producto]
            );
            
            const stockActual = parseFloat(productoStock.rows[0].stock);
            if (stockActual < delta) {
              await transaction.query('ROLLBACK');
              return responseHelper.error(res, `Stock insuficiente para el ajuste. Disponible: ${stockActual}`, 400);
            }
          }

          await transaction.query(
            'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2',
            [delta, oldDetalle.id_producto]
          );

          await transaction.query(
            `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
             VALUES ($1, $2, $3, $4)`,
            [oldDetalle.id_producto, -delta, 'ajuste_parcial_detalle', req.user?.id_usuario || null]
          );
        }
      }

      // Construir query de actualización dinámica
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(field => {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      });

      values.push(id);

      const updateResult = await transaction.query(
        `UPDATE detalle_venta SET ${setClauses.join(', ')} 
         WHERE id_detalle = $${paramIndex} RETURNING *`,
        values
      );

      await transaction.query('COMMIT');

      const detalleActualizado = ModelMapper.toDetalleVenta(updateResult.rows[0]);

      logger.audit('Detalle de venta actualizado parcialmente', req.user?.id_usuario, 'UPDATE', {
        detalle_id: id,
        campos_actualizados: cambios
      });

      return responseHelper.success(res, detalleActualizado, 'Detalle de venta actualizado exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de detalle inválido', 400);
      }
      
      logger.error('Error en patch detalle de venta:', error);
      return responseHelper.error(res, 'Error actualizando detalle de venta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async reporteVentasProductos(req, res) {
    try {
      const { fecha_inicio, fecha_fin, id_categoria, agrupar_por = 'producto' } = req.query;
      
      const params = [];
      let whereClause = 'WHERE dv.id_detalle IS NOT NULL';
      let groupByClause = '';
      let selectFields = '';

      // Construir filtros
      if (fecha_inicio) {
        params.push(fecha_inicio);
        whereClause += ` AND v.fecha >= $${params.length}`;
      }

      if (fecha_fin) {
        params.push(fecha_fin);
        whereClause += ` AND v.fecha <= $${params.length}`;
      }

      if (id_categoria) {
        const categoriaId = QueryBuilder.validateId(id_categoria);
        params.push(categoriaId);
        whereClause += ` AND p.id_categoria = $${params.length}`;
      }

      // Construir agrupación
      switch (agrupar_por) {
        case 'dia':
          selectFields = `TO_CHAR(v.fecha, 'YYYY-MM-DD') as periodo,`;
          groupByClause = "GROUP BY TO_CHAR(v.fecha, 'YYYY-MM-DD')";
          break;
        case 'semana':
          selectFields = `TO_CHAR(v.fecha, 'IYYY-IW') as periodo,`;
          groupByClause = "GROUP BY TO_CHAR(v.fecha, 'IYYY-IW')";
          break;
        case 'mes':
          selectFields = `TO_CHAR(v.fecha, 'YYYY-MM') as periodo,`;
          groupByClause = "GROUP BY TO_CHAR(v.fecha, 'YYYY-MM')";
          break;
        case 'categoria':
          selectFields = `c.nombre as categoria_nombre, c.id_categoria,`;
          groupByClause = 'GROUP BY c.id_categoria, c.nombre';
          break;
        default: // producto
          selectFields = `p.nombre as producto_nombre, p.id_producto,`;
          groupByClause = 'GROUP BY p.id_producto, p.nombre';
      }

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
      
      logger.database('Reporte de ventas por productos generado', {
        agrupar_por,
        total_registros: result.rows.length
      });

      return responseHelper.success(res, {
        reporte: result.rows,
        parametros: { fecha_inicio, fecha_fin, id_categoria, agrupar_por },
        total_registros: result.rows.length
      });

    } catch (error) {
      logger.error('Error en reporteVentasProductos:', error);
      return responseHelper.error(res, 'Error generando reporte de ventas por productos', 500, error);
    }
  },

  async reporteTopProductos(req, res) {
    try {
      const { limite = 10, periodo = '30d', ordenar_por = 'ingresos' } = req.query;
      
      const limit = Math.min(parseInt(limite) || 10, 50);
      let fechaFiltro = '';
      const params = [];

      // Determinar filtro de fecha según período
      switch (periodo) {
        case '7d':
          fechaFiltro = 'v.fecha >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '90d':
          fechaFiltro = 'v.fecha >= CURRENT_DATE - INTERVAL \'90 days\'';
          break;
        case 'ytd':
          fechaFiltro = 'EXTRACT(YEAR FROM v.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)';
          break;
        default: // 30d
          fechaFiltro = 'v.fecha >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      // Determinar ordenamiento
      let orderBy = '';
      switch (ordenar_por) {
        case 'cantidad':
          orderBy = 'total_vendido DESC';
          break;
        case 'utilidad':
          orderBy = 'utilidad_total DESC';
          break;
        default: // ingresos
          orderBy = 'ingresos_totales DESC';
      }

      params.push(limit);

      const sql = `
        SELECT 
          p.id_producto,
          p.nombre as producto_nombre,
          p.codigo_barra,
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

      const result = await db.query(sql, params);
      
      logger.database('Reporte de top productos generado', {
        limite: limit,
        periodo,
        ordenar_por
      });

      return responseHelper.success(res, {
        top_productos: result.rows,
        parametros: { limite: limit, periodo, ordenar_por },
        total_productos: result.rows.length
      });

    } catch (error) {
      logger.error('Error en reporteTopProductos:', error);
      return responseHelper.error(res, 'Error generando reporte de top productos', 500, error);
    }
  },

  async validarStock(req, res) {
    try {
      const { id_producto, cantidad, id_venta } = req.body;

      const productoId = QueryBuilder.validateId(id_producto);
      const cantidadNum = parseFloat(cantidad);

      if (cantidadNum <= 0) {
        return responseHelper.error(res, 'La cantidad debe ser mayor a 0', 400);
      }

      // Verificar producto
      const productoResult = await db.query(
        'SELECT nombre, stock FROM productos WHERE id_producto = $1',
        [productoId]
      );

      if (productoResult.rows.length === 0) {
        return responseHelper.notFound(res, 'Producto');
      }

      const producto = productoResult.rows[0];
      const stockDisponible = parseFloat(producto.stock);
      let stockReservado = 0;

      // Si se proporciona id_venta, excluir los detalles de esa venta del cálculo
      if (id_venta) {
        const ventaId = QueryBuilder.validateId(id_venta);
        
        const detallesVenta = await db.query(
          `SELECT SUM(cantidad) as cantidad_reservada 
           FROM detalle_venta 
           WHERE id_venta = $1 AND id_producto = $2`,
          [ventaId, productoId]
        );

        if (detallesVenta.rows[0].cantidad_reservada) {
          stockReservado = parseFloat(detallesVenta.rows[0].cantidad_reservada);
        }
      }

      const stockRealDisponible = stockDisponible + stockReservado;
      const suficiente = stockRealDisponible >= cantidadNum;

      logger.database('Validación de stock realizada', {
        producto_id: productoId,
        cantidad_solicitada: cantidadNum,
        stock_disponible: stockRealDisponible,
        suficiente
      });

      return responseHelper.success(res, {
        producto: {
          id: productoId,
          nombre: producto.nombre,
          stock_disponible: stockDisponible
        },
        validacion: {
          cantidad_solicitada: cantidadNum,
          stock_real_disponible: stockRealDisponible,
          suficiente,
          diferencia: stockRealDisponible - cantidadNum
        },
        detalles: {
          stock_reservado: stockReservado,
          excluye_venta: !!id_venta
        }
      });

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de producto inválido', 400);
      }
      logger.error('Error en validarStock:', error);
      return responseHelper.error(res, 'Error validando stock', 500, error);
    }
  }

};

module.exports = detalleVentaController;