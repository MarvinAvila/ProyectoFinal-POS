const db = require("../config/database");
const Venta = require("../models/Venta");
const DetalleVenta = require("../models/DetalleVenta");
const HistorialInventario = require("../models/HistorialInventario");
const Producto = require("../models/Producto");
const ModelMapper = require("../utils/modelMapper");
const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const QueryBuilder = require("../utils/queryBuilder");
const helpers = require("../utils/helpers");

const ventaController = {
  async getAll(req, res) {
    try {
      const { fecha_inicio, fecha_fin, id_usuario, page = 1, limit = 50 } = req.query;
      const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);
      
      const params = [];
      const where = [];
      let idx = 1;

      // Filtro por fecha
      if (fecha_inicio) {
        where.push(`v.fecha >= $${idx}`);
        params.push(fecha_inicio);
        idx++;
      }

      if (fecha_fin) {
        where.push(`v.fecha <= $${idx}`);
        params.push(fecha_fin + ' 23:59:59'); // Incluir todo el día
        idx++;
      }

      // Filtro por usuario
      if (id_usuario) {
        const usuarioId = QueryBuilder.validateId(id_usuario);
        where.push(`v.id_usuario = $${idx}`);
        params.push(usuarioId);
        idx++;
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const sql = `
        SELECT v.*, 
               u.nombre as usuario_nombre,
               COUNT(dv.id_detalle) as total_detalles,
               SUM(dv.cantidad) as total_productos
        FROM ventas v
        LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
        LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
        ${whereSQL}
        GROUP BY v.id_venta, u.nombre
        ORDER BY v.fecha DESC 
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      
      params.push(limitNum, offset);
      
      const result = await db.query(sql, params);
      const ventas = ModelMapper.toVentaList(result.rows);

      // Agregar información adicional a cada venta
      ventas.forEach(venta => {
        const row = result.rows.find(r => r.id_venta === venta.id_venta);
        venta.usuario_nombre = row?.usuario_nombre || null;
        venta.total_detalles = row ? parseInt(row.total_detalles) : 0;
        venta.total_productos = row ? parseInt(row.total_productos) : 0;
      });

      // Contar total para paginación
      const countSQL = `SELECT COUNT(*) FROM ventas v ${whereSQL}`;
      const countResult = await db.query(countSQL, params.slice(0, params.length - 2));
      const total = parseInt(countResult.rows[0].count);

      // Calcular estadísticas
      const statsSQL = `
        SELECT 
          COUNT(*) as total_ventas,
          SUM(total) as ingresos_totales,
          AVG(total) as promedio_venta
        FROM ventas v
        ${whereSQL}
      `;
      const statsResult = await db.query(statsSQL, params.slice(0, params.length - 2));
      const estadisticas = {
        total_ventas: parseInt(statsResult.rows[0].total_ventas) || 0,
        ingresos_totales: parseFloat(statsResult.rows[0].ingresos_totales) || 0,
        promedio_venta: parseFloat(statsResult.rows[0].promedio_venta) || 0
      };

      logger.database('Ventas obtenidas exitosamente', {
        count: ventas.length,
        total,
        filtros: { fecha_inicio, fecha_fin, id_usuario }
      });

      return responseHelper.success(res, {
        ventas,
        estadisticas,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de usuario inválido', 400);
      }
      logger.error('Error en getAll ventas:', error);
      return responseHelper.error(res, 'Error obteniendo ventas', 500, error);
    }
  },

  async getById(req, res) {
    try {
      const id = QueryBuilder.validateId(req.params.id);
      
      // Obtener venta principal
      const ventaResult = await db.query(`
        SELECT v.*, u.nombre as usuario_nombre
        FROM ventas v
        LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
        WHERE v.id_venta = $1
      `, [id]);
      
      if (ventaResult.rows.length === 0) {
        return responseHelper.notFound(res, 'Venta');
      }

      const venta = ModelMapper.toVenta(ventaResult.rows[0]);
      venta.usuario_nombre = ventaResult.rows[0].usuario_nombre;

      // Obtener detalles de la venta
      const detallesResult = await db.query(`
        SELECT dv.*, p.nombre as producto_nombre, p.codigo_barra
        FROM detalle_venta dv
        JOIN productos p ON dv.id_producto = p.id_producto
        WHERE dv.id_venta = $1
        ORDER BY dv.id_detalle
      `, [id]);

      venta.detalles = ModelMapper.toDetalleVentaList(detallesResult.rows);

      // Obtener comprobante si existe
      const comprobanteResult = await db.query(`
        SELECT * FROM comprobantes WHERE id_venta = $1
      `, [id]);

      if (comprobanteResult.rows.length > 0) {
        venta.comprobante = comprobanteResult.rows[0];
      }

      logger.database('Venta obtenida por ID', { id });

      return responseHelper.success(res, venta);

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de venta inválido', 400);
      }
      logger.error('Error en getById venta:', error);
      return responseHelper.error(res, 'Error obteniendo venta', 500, error);
    }
  },

  async create(req, res) {
    const transaction = await db.getClient();
    
    try {
      await transaction.query('BEGIN');

      const { id_usuario, detalles, forma_pago = "efectivo" } = req.body;

      // Validaciones básicas
      if (!id_usuario) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'El ID de usuario es obligatorio', 400);
      }

      if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'La venta debe tener al menos un producto', 400);
      }

      // Validar usuario
      const usuarioId = QueryBuilder.validateId(id_usuario);
      const usuarioExists = await transaction.query(
        'SELECT id_usuario FROM usuarios WHERE id_usuario = $1',
        [usuarioId]
      );

      if (usuarioExists.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Usuario');
      }

      // Crear instancia de venta
      const venta = Venta.crearNueva(usuarioId, forma_pago);

      // Validar y procesar detalles
      for (const detalleData of detalles) {
        if (!detalleData.id_producto || !detalleData.cantidad || !detalleData.precio_unitario) {
          await transaction.query('ROLLBACK');
          return responseHelper.error(res, 'Cada detalle debe tener id_producto, cantidad y precio_unitario', 400);
        }

        const productoId = QueryBuilder.validateId(detalleData.id_producto);
        const cantidad = parseFloat(detalleData.cantidad);
        const precioUnitario = parseFloat(detalleData.precio_unitario);

        if (cantidad <= 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.error(res, 'La cantidad debe ser mayor a 0', 400);
        }

        if (precioUnitario <= 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.error(res, 'El precio unitario debe ser mayor a 0', 400);
        }

        // Verificar stock del producto
        const productoResult = await transaction.query(`
          SELECT nombre, stock, precio_venta 
          FROM productos 
          WHERE id_producto = $1
        `, [productoId]);

        if (productoResult.rows.length === 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.notFound(res, `Producto con ID ${productoId}`);
        }

        const producto = productoResult.rows[0];
        if (parseFloat(producto.stock) < cantidad) {
          await transaction.query('ROLLBACK');
          return responseHelper.error(
            res, 
            `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Solicitado: ${cantidad}`,
            400
          );
        }

        // Crear detalle
        const detalle = DetalleVenta.crearNuevo(null, productoId, cantidad, precioUnitario);
        venta.agregarDetalle(detalle);
      }

      // Calcular totales
      venta.calcularTotales();

      // Insertar venta
      const ventaResult = await transaction.query(`
        INSERT INTO ventas (fecha, id_usuario, forma_pago, subtotal, iva, total)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [venta.fecha, venta.id_usuario, venta.forma_pago, venta.subtotal, venta.iva, venta.total]);

      const ventaInsertada = ModelMapper.toVenta(ventaResult.rows[0]);
      const idVenta = ventaInsertada.id_venta;

      // Insertar detalles y actualizar stock
      for (const detalle of venta.detalles) {
        // Insertar detalle
        const detalleResult = await transaction.query(`
          INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [idVenta, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]);

        // Actualizar stock del producto
        await transaction.query(`
          UPDATE productos 
          SET stock = stock - $1 
          WHERE id_producto = $2
        `, [detalle.cantidad, detalle.id_producto]);

        // Registrar en historial de inventario
        await transaction.query(`
          INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
          VALUES ($1, $2, $3, $4, $5)
        `, [detalle.id_producto, -detalle.cantidad, 'venta', new Date(), usuarioId]);
      }

      await transaction.query('COMMIT');

      // Obtener venta completa con detalles
      const ventaCompleta = await this.obtenerVentaCompleta(idVenta);

      logger.audit('Venta creada', usuarioId, 'CREATE', {
        venta_id: idVenta,
        total: ventaCompleta.total,
        total_productos: ventaCompleta.detalles.length,
        forma_pago: ventaCompleta.forma_pago
      });

      return responseHelper.success(res, ventaCompleta, 'Venta registrada exitosamente', 201);

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID inválido en los datos proporcionados', 400);
      }
      
      logger.error('Error en create venta:', error);
      return responseHelper.error(res, 'Error registrando venta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async delete(req, res) {
    const transaction = await db.getClient();
    
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);

      // Verificar que la venta existe
      const ventaExistente = await transaction.query(
        'SELECT * FROM ventas WHERE id_venta = $1',
        [id]
      );

      if (ventaExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Venta');
      }

      const venta = ModelMapper.toVenta(ventaExistente.rows[0]);

      // Obtener detalles para revertir stock
      const detallesResult = await transaction.query(
        'SELECT * FROM detalle_venta WHERE id_venta = $1',
        [id]
      );

      // Revertir stock de cada producto
      for (const detalleRow of detallesResult.rows) {
        const detalle = ModelMapper.toDetalleVenta(detalleRow);
        
        await transaction.query(`
          UPDATE productos 
          SET stock = stock + $1 
          WHERE id_producto = $2
        `, [detalle.cantidad, detalle.id_producto]);

        // Registrar reversión en historial
        await transaction.query(`
          INSERT INTO historial_inventario (id_producto, cambio, motivo, fecha, id_usuario)
          VALUES ($1, $2, $3, $4, $5)
        `, [detalle.id_producto, detalle.cantidad, 'cancelacion_venta', new Date(), venta.id_usuario]);
      }

      // Eliminar detalles
      await transaction.query('DELETE FROM detalle_venta WHERE id_venta = $1', [id]);

      // Eliminar comprobantes si existen
      await transaction.query('DELETE FROM comprobantes WHERE id_venta = $1', [id]);

      // Eliminar venta
      await transaction.query('DELETE FROM ventas WHERE id_venta = $1', [id]);

      await transaction.query('COMMIT');

      logger.audit('Venta eliminada', req.user?.id_usuario, 'DELETE', {
        venta_id: id,
        usuario_original: venta.id_usuario,
        total: venta.total
      });

      return responseHelper.success(res, null, 'Venta eliminada exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de venta inválido', 400);
      }
      
      logger.error('Error en delete venta:', error);
      return responseHelper.error(res, 'Error eliminando venta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async getEstadisticas(req, res) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      
      const params = [];
      const where = [];
      let idx = 1;

      if (fecha_inicio) {
        where.push(`v.fecha >= $${idx}`);
        params.push(fecha_inicio);
        idx++;
      }

      if (fecha_fin) {
        where.push(`v.fecha <= $${idx}`);
        params.push(fecha_fin + ' 23:59:59');
        idx++;
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

      // Estadísticas generales
      const statsResult = await db.query(`
        SELECT 
          COUNT(*) as total_ventas,
          SUM(total) as ingresos_totales,
          AVG(total) as promedio_venta,
          MIN(total) as venta_minima,
          MAX(total) as venta_maxima
        FROM ventas v
        ${whereSQL}
      `, params);

      // Ventas por día
      const ventasPorDia = await db.query(`
        SELECT 
          DATE(fecha) as fecha,
          COUNT(*) as cantidad_ventas,
          SUM(total) as ingresos_dia
        FROM ventas
        ${whereSQL}
        GROUP BY DATE(fecha)
        ORDER BY fecha DESC
        LIMIT 30
      `, params);

      // Productos más vendidos
      const productosPopulares = await db.query(`
        SELECT 
          p.nombre,
          p.codigo_barra,
          SUM(dv.cantidad) as total_vendido,
          SUM(dv.subtotal) as ingresos_producto
        FROM detalle_venta dv
        JOIN productos p ON dv.id_producto = p.id_producto
        JOIN ventas v ON dv.id_venta = v.id_venta
        ${whereSQL ? 'WHERE ' + whereSQL.replace(/v\./g, 'v.') : ''}
        GROUP BY p.id_producto, p.nombre, p.codigo_barra
        ORDER BY total_vendido DESC
        LIMIT 10
      `, params);

      const estadisticas = {
        general: {
          total_ventas: parseInt(statsResult.rows[0].total_ventas) || 0,
          ingresos_totales: parseFloat(statsResult.rows[0].ingresos_totales) || 0,
          promedio_venta: parseFloat(statsResult.rows[0].promedio_venta) || 0,
          venta_minima: parseFloat(statsResult.rows[0].venta_minima) || 0,
          venta_maxima: parseFloat(statsResult.rows[0].venta_maxima) || 0
        },
        ventas_por_dia: ventasPorDia.rows,
        productos_populares: productosPopulares.rows
      };

      logger.database('Estadísticas de ventas obtenidas', { filtros: { fecha_inicio, fecha_fin } });

      return responseHelper.success(res, estadisticas);

    } catch (error) {
      logger.error('Error obteniendo estadísticas de ventas:', error);
      return responseHelper.error(res, 'Error obteniendo estadísticas', 500, error);
    }
  },

  // Método helper para obtener venta completa
  async obtenerVentaCompleta(idVenta) {
    const ventaResult = await db.query(`
      SELECT v.*, u.nombre as usuario_nombre
      FROM ventas v
      LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
      WHERE v.id_venta = $1
    `, [idVenta]);

    if (ventaResult.rows.length === 0) return null;

    const venta = ModelMapper.toVenta(ventaResult.rows[0]);
    venta.usuario_nombre = ventaResult.rows[0].usuario_nombre;

    const detallesResult = await db.query(`
      SELECT dv.*, p.nombre as producto_nombre
      FROM detalle_venta dv
      JOIN productos p ON dv.id_producto = p.id_producto
      WHERE dv.id_venta = $1
    `, [idVenta]);

    venta.detalles = ModelMapper.toDetalleVentaList(detallesResult.rows);

    return venta;
  },

  async topProductos(req, res) {
    try {
      const query = `
        SELECT 
          p.id_producto,
          p.nombre AS producto,
          SUM(dv.cantidad) AS unidades_vendidas,
          SUM(dv.subtotal) AS total_vendido
        FROM detalle_venta dv
        JOIN productos p ON p.id_producto = dv.id_producto
        GROUP BY p.id_producto, p.nombre
        ORDER BY total_vendido DESC
        LIMIT 10;
      `;
      const { rows } = await db.query(query);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error("Error al obtener top productos:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el top de productos",
      });
    }
  },
 async ventasDelDia(req, res) {
  try {
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

    // 🔹 Consulta para obtener la lista de ventas del día
    const ventasQuery = `
      SELECT 
        v.id_venta,
        v.fecha,
        v.forma_pago,
        v.total,
        u.nombre AS usuario_nombre
      FROM ventas v
      LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
      WHERE v.fecha >= $1 AND v.fecha < $2
      ORDER BY v.fecha DESC
    `;

    const ventasResult = await db.query(ventasQuery, [inicioDia, finDia]);
    const ventas = ventasResult.rows;

    // 🔹 Consulta para los totales del día
    const totalQuery = `
      SELECT 
        COUNT(*) AS total_ventas,
        COALESCE(SUM(total), 0) AS ingresos_totales
      FROM ventas
      WHERE fecha >= $1 AND fecha < $2
    `;

    const totalResult = await db.query(totalQuery, [inicioDia, finDia]);
    const resumen = totalResult.rows[0];

    // 🔹 Respuesta unificada para el frontend
    return res.json({
      success: true,
      data: {
        total_ventas: parseInt(resumen.total_ventas),
        ingresos_totales: parseFloat(resumen.ingresos_totales),
        ventas, // 👈 lista detallada de ventas del día
      },
    });

  } catch (error) {
    console.error('Error al obtener ventas del día:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ventas del día',
    });
  }
},


};


module.exports = ventaController;