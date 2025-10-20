const db = require('../config/database');
const Proveedor = require('../models/Proveedor');
const ModelMapper = require('../utils/modelMapper');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

const proveedorController = {
  async getAll(req, res) {
    try {
      const { q, activo, page = 1, limit = 50 } = req.query;
      const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);

      const params = [];
      const where = [];
      let idx = 1;

      // 🔍 Filtro de texto (ya sin campo contacto)
      if (q) {
        const searchTerm = QueryBuilder.sanitizeSearchTerm(q);
        where.push(`(p.nombre ILIKE $${idx} OR p.direccion ILIKE $${idx})`);
        params.push(searchTerm);
        idx++;
      }

      // Filtro por estado activo (si existe ese campo)
      if (activo !== undefined) {
        const activoBool = activo === 'true' || activo === '1';
        where.push(`p.activo = $${idx}`);
        params.push(activoBool);
        idx++;
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const sql = `
        SELECT p.*, 
               COUNT(pr.id_producto) as total_productos
        FROM proveedores p 
        LEFT JOIN productos pr ON p.id_proveedor = pr.id_proveedor
        ${whereSQL}
        GROUP BY p.id_proveedor 
        ORDER BY p.nombre ASC 
        LIMIT $${idx} OFFSET $${idx + 1}
      `;

      params.push(limitNum, offset);
      const result = await db.query(sql, params);
      const proveedores = ModelMapper.toProveedorList(result.rows);

      proveedores.forEach(proveedor => {
        const row = result.rows.find(r => r.id_proveedor === proveedor.id_proveedor);
        proveedor.total_productos = row ? parseInt(row.total_productos) : 0;
      });

      const countSQL = `SELECT COUNT(*) FROM proveedores p ${whereSQL}`;
      const countResult = await db.query(countSQL, params.slice(0, params.length - 2));
      const total = parseInt(countResult.rows[0].count);

      logger.database('Proveedores obtenidos exitosamente', {
        count: proveedores.length,
        total,
        filtros: { q, activo }
      });

      return responseHelper.success(res, {
        proveedores,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      logger.error('Error en getAll proveedores:', error);
      return responseHelper.error(res, 'Error obteniendo proveedores', 500, error);
    }
  },

  async getById(req, res) {
    try {
      const id = QueryBuilder.validateId(req.params.id);

      const result = await db.query(`
        SELECT p.*, 
               COUNT(pr.id_producto) as total_productos
        FROM proveedores p 
        LEFT JOIN productos pr ON p.id_proveedor = pr.id_proveedor
        WHERE p.id_proveedor = $1
        GROUP BY p.id_proveedor
      `, [id]);

      if (result.rows.length === 0) {
        return responseHelper.notFound(res, 'Proveedor');
      }

      const proveedor = ModelMapper.toProveedor(result.rows[0]);
      proveedor.total_productos = parseInt(result.rows[0].total_productos);

      if (req.query.includeProductos === 'true') {
        const productosResult = await db.query(`
          SELECT pr.*, c.nombre as categoria_nombre
          FROM productos pr
          LEFT JOIN categorias c ON pr.id_categoria = c.id_categoria
          WHERE pr.id_proveedor = $1
          ORDER BY pr.nombre
        `, [id]);

        proveedor.productos = ModelMapper.toProductoList(productosResult.rows);
      }

      logger.database('Proveedor obtenido por ID', { id });
      return responseHelper.success(res, proveedor);

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de proveedor inválido', 400);
      }
      logger.error('Error en getById proveedor:', error);
      return responseHelper.error(res, 'Error obteniendo proveedor', 500, error);
    }
  },

  async create(req, res) {
    const transaction = await db.getClient();
    try {
      await transaction.query('BEGIN');

      const { nombre, telefono, direccion, email } = req.body;

      if (!nombre || !nombre.trim()) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'El nombre del proveedor es obligatorio', 400);
      }

      const nombreSanitizado = helpers.sanitizeInput(nombre);
      const direccionSanitizada = direccion ? helpers.sanitizeInput(direccion) : null;
      const telefonoSanitizado = telefono ? helpers.sanitizeInput(telefono) : null;
      const emailSanitizado = email ? helpers.sanitizeInput(email) : null;

      if (emailSanitizado && !helpers.isValidEmail(emailSanitizado)) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'El formato del email no es válido', 400);
      }

      const proveedor = new Proveedor(
        null,
        nombreSanitizado,
        telefonoSanitizado,
        emailSanitizado,
        direccionSanitizada
      );

      const validationErrors = Proveedor.validate(proveedor);
      if (validationErrors.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Errores de validación en el proveedor', 400, {
          errors: validationErrors
        });
      }

      const proveedorExistente = await transaction.query(
        'SELECT id_proveedor FROM proveedores WHERE nombre ILIKE $1',
        [nombreSanitizado]
      );
      if (proveedorExistente.rows.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.conflict(res, 'Ya existe un proveedor con ese nombre');
      }

      const result = await transaction.query(
        `INSERT INTO proveedores (nombre, telefono, email, direccion)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [proveedor.nombre, proveedor.telefono, proveedor.email, proveedor.direccion]
      );

      await transaction.query('COMMIT');

      const proveedorCreado = ModelMapper.toProveedor(result.rows[0]);

      logger.audit('Proveedor creado', req.user?.id_usuario, 'CREATE', {
        proveedor_id: proveedorCreado.id_proveedor,
        nombre: proveedorCreado.nombre
      });

      return responseHelper.success(res, proveedorCreado, 'Proveedor creado exitosamente', 201);

    } catch (error) {
      await transaction.query('ROLLBACK');
      logger.error('Error en create proveedor:', error);
      return responseHelper.error(res, 'Error creando proveedor', 500, error);
    } finally {
      transaction.release();
    }
  },

  async update(req, res) {
    const transaction = await db.getClient();
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const { nombre, telefono, direccion, email } = req.body;

      const proveedorExistente = await transaction.query(
        'SELECT * FROM proveedores WHERE id_proveedor = $1',
        [id]
      );

      if (proveedorExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Proveedor');
      }

      const updates = {};
      if (nombre !== undefined) updates.nombre = helpers.sanitizeInput(nombre);
      if (telefono !== undefined) updates.telefono = telefono ? helpers.sanitizeInput(telefono) : null;
      if (direccion !== undefined) updates.direccion = direccion ? helpers.sanitizeInput(direccion) : null;
      if (email !== undefined) updates.email = email ? helpers.sanitizeInput(email) : null;

      if (Object.keys(updates).length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'No hay campos para actualizar', 400);
      }

      if (updates.email && !helpers.isValidEmail(updates.email)) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'El formato del email no es válido', 400);
      }

      if (updates.nombre) {
        const nombreExistente = await transaction.query(
          'SELECT id_proveedor FROM proveedores WHERE nombre ILIKE $1 AND id_proveedor != $2',
          [updates.nombre, id]
        );

        if (nombreExistente.rows.length > 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.conflict(res, 'Ya existe otro proveedor con ese nombre');
        }
      }

      const proveedorActual = proveedorExistente.rows[0];
      const proveedorTemp = new Proveedor(
        id,
        updates.nombre || proveedorActual.nombre,
        updates.telefono !== undefined ? updates.telefono : proveedorActual.telefono,
        updates.email !== undefined ? updates.email : proveedorActual.email,
        updates.direccion !== undefined ? updates.direccion : proveedorActual.direccion
      );

      const validationErrors = Proveedor.validate(proveedorTemp);
      if (validationErrors.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Errores de validación en el proveedor', 400, {
          errors: validationErrors
        });
      }

      const { sql, params } = QueryBuilder.buildUpdateQuery('proveedores', updates, 'id_proveedor', id);
      const result = await transaction.query(sql, params);
      await transaction.query('COMMIT');

      const proveedorActualizado = ModelMapper.toProveedor(result.rows[0]);

      logger.audit('Proveedor actualizado', req.user?.id_usuario, 'UPDATE', {
        proveedor_id: id,
        cambios: Object.keys(updates)
      });

      return responseHelper.success(res, proveedorActualizado, 'Proveedor actualizado exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de proveedor inválido', 400);
      }

      logger.error('Error en update proveedor:', error);
      return responseHelper.error(res, 'Error actualizando proveedor', 500, error);
    } finally {
      transaction.release();
    }
  },

  async delete(req, res) {
    const transaction = await db.getClient();
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const proveedorExistente = await transaction.query('SELECT * FROM proveedores WHERE id_proveedor = $1', [id]);

      if (proveedorExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Proveedor');
      }

      const productosAsociados = await transaction.query(
        'SELECT COUNT(*) FROM productos WHERE id_proveedor = $1',
        [id]
      );

      const countProductos = parseInt(productosAsociados.rows[0].count);
      if (countProductos > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(
          res,
          `No se puede eliminar el proveedor porque tiene ${countProductos} producto(s) asociado(s)`,
          409
        );
      }

      await transaction.query('DELETE FROM proveedores WHERE id_proveedor = $1', [id]);
      await transaction.query('COMMIT');

      logger.audit('Proveedor eliminado', req.user?.id_usuario, 'DELETE', {
        proveedor_id: id,
        nombre: proveedorExistente.rows[0].nombre
      });

      return responseHelper.success(res, null, 'Proveedor eliminado exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de proveedor inválido', 400);
      }

      logger.error('Error en delete proveedor:', error);
      return responseHelper.error(res, 'Error eliminando proveedor', 500, error);
    } finally {
      transaction.release();
    }
  },

  async getProductos(req, res) {
    try {
      const id = QueryBuilder.validateId(req.params.id);
      const { page = 1, limit = 50 } = req.query;
      const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);

      const proveedorExistente = await db.query('SELECT * FROM proveedores WHERE id_proveedor = $1', [id]);
      if (proveedorExistente.rows.length === 0) {
        return responseHelper.notFound(res, 'Proveedor');
      }

      const productosResult = await db.query(`
        SELECT p.*, c.nombre as categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE p.id_proveedor = $1
        ORDER BY p.nombre
        LIMIT $2 OFFSET $3
      `, [id, limitNum, offset]);

      const productos = ModelMapper.toProductoList(productosResult.rows);

      const countResult = await db.query(
        'SELECT COUNT(*) FROM productos WHERE id_proveedor = $1',
        [id]
      );

      const total = parseInt(countResult.rows[0].count);

      logger.database('Productos de proveedor obtenidos', {
        proveedor_id: id,
        count: productos.length,
        total
      });

      return responseHelper.success(res, {
        proveedor: ModelMapper.toProveedor(proveedorExistente.rows[0]),
        productos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de proveedor inválido', 400);
      }

      logger.error('Error obteniendo productos del proveedor:', error);
      return responseHelper.error(res, 'Error obteniendo productos del proveedor', 500, error);
    }
  },

  async getEstadisticas(req, res) {
    try {
      const id = QueryBuilder.validateId(req.params.id);

      const proveedorExistente = await db.query(
        'SELECT * FROM proveedores WHERE id_proveedor = $1',
        [id]
      );

      if (proveedorExistente.rows.length === 0) {
        return responseHelper.notFound(res, 'Proveedor');
      }

      const estadisticas = await db.query(`
        SELECT 
          COUNT(*) as total_productos,
          SUM(stock) as total_stock,
          AVG(precio_compra) as precio_compra_promedio,
          AVG(precio_venta) as precio_venta_promedio
        FROM productos 
        WHERE id_proveedor = $1
      `, [id]);

      const productosBajoStock = await db.query(`
        SELECT COUNT(*) as productos_bajo_stock
        FROM productos 
        WHERE id_proveedor = $1 AND stock <= 5
      `, [id]);

      const productosPorCaducar = await db.query(`
        SELECT COUNT(*) as productos_por_caducar
        FROM productos 
        WHERE id_proveedor = $1 AND fecha_caducidad IS NOT NULL 
        AND fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days'
      `, [id]);

      const stats = {
        total_productos: parseInt(estadisticas.rows[0].total_productos) || 0,
        total_stock: parseFloat(estadisticas.rows[0].total_stock) || 0,
        precio_compra_promedio: parseFloat(estadisticas.rows[0].precio_compra_promedio) || 0,
        precio_venta_promedio: parseFloat(estadisticas.rows[0].precio_venta_promedio) || 0,
        productos_bajo_stock: parseInt(productosBajoStock.rows[0].productos_bajo_stock) || 0,
        productos_por_caducar: parseInt(productosPorCaducar.rows[0].productos_por_caducar) || 0
      };

      logger.database('Estadísticas de proveedor obtenidas', { proveedor_id: id });

      return responseHelper.success(res, {
        proveedor: ModelMapper.toProveedor(proveedorExistente.rows[0]),
        estadisticas: stats
      });

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de proveedor inválido', 400);
      }

      logger.error('Error obteniendo estadísticas del proveedor:', error);
      return responseHelper.error(res, 'Error obteniendo estadísticas del proveedor', 500, error);
    }
  }
};

module.exports = proveedorController;
