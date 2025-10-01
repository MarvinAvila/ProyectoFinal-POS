const db = require("../config/database");
const Oferta = require("../models/Oferta");
const ProductoOferta = require("../models/ProductoOferta");
const ModelMapper = require("../utils/modelMapper");
const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const QueryBuilder = require("../utils/queryBuilder");
const helpers = require("../utils/helpers");

const ofertaController = {
  async getAll(req, res) {
    try {
      const { estado, activo, page = 1, limit = 50 } = req.query;
      const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);
      
      const params = [];
      const where = [];
      let idx = 1;

      // Filtro por estado
      if (estado) {
        const estadosValidos = ['ACTIVA', 'INACTIVA', 'PROGRAMADA', 'EXPIRADA'];
        if (!estadosValidos.includes(estado.toUpperCase())) {
          return responseHelper.error(res, `Estado inválido. Válidos: ${estadosValidos.join(', ')}`, 400);
        }
      }

      // Filtro por activo
      if (activo !== undefined) {
        const activoBool = activo === 'true' || activo === '1';
        where.push(`o.activo = $${idx}`);
        params.push(activoBool);
        idx++;
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const sql = `
        SELECT o.*, 
               COUNT(po.id_producto) as total_productos
        FROM ofertas o 
        LEFT JOIN producto_oferta po ON o.id_oferta = po.id_oferta
        ${whereSQL}
        GROUP BY o.id_oferta 
        ORDER BY o.fecha_inicio DESC 
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      
      params.push(limitNum, offset);
      
      const result = await db.query(sql, params);
      const ofertas = result.rows.map(row => Oferta.fromDatabaseRow(row));

      // Aplicar filtro por estado si se especificó
      let ofertasFiltradas = ofertas;
      if (estado) {
        ofertasFiltradas = ofertas.filter(oferta => 
          oferta.getEstado() === estado.toUpperCase()
        );
      }

      // Contar total para paginación
      const countSQL = `SELECT COUNT(*) FROM ofertas o ${whereSQL}`;
      const countResult = await db.query(countSQL, params.slice(0, params.length - 2));
      const total = parseInt(countResult.rows[0].count);

      logger.database('Ofertas obtenidas exitosamente', {
        count: ofertasFiltradas.length,
        total,
        filtros: { estado, activo }
      });

      return responseHelper.success(res, {
        ofertas: ofertasFiltradas,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      logger.error('Error en getAll ofertas:', error);
      return responseHelper.error(res, 'Error obteniendo ofertas', 500, error);
    }
  },

  async getById(req, res) {
    try {
      const id = QueryBuilder.validateId(req.params.id);
      
      const result = await db.query(`
        SELECT o.*, 
               COUNT(po.id_producto) as total_productos
        FROM ofertas o 
        LEFT JOIN producto_oferta po ON o.id_oferta = po.id_oferta
        WHERE o.id_oferta = $1
        GROUP BY o.id_oferta
      `, [id]);
      
      if (result.rows.length === 0) {
        return responseHelper.notFound(res, 'Oferta');
      }

      const oferta = Oferta.fromDatabaseRow(result.rows[0]);
      
      // Obtener productos asociados si se solicita
      if (req.query.includeProductos === 'true') {
        const productosResult = await db.query(`
          SELECT po.*, p.nombre as producto_nombre, p.precio_venta as precio_original
          FROM producto_oferta po
          JOIN productos p ON po.id_producto = p.id_producto
          WHERE po.id_oferta = $1
        `, [id]);
        
        oferta.productos_asociados = productosResult.rows.map(row => 
          ProductoOferta.fromDatabaseRow(row)
        );
      }

      logger.database('Oferta obtenida por ID', { id });

      return responseHelper.success(res, oferta);

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de oferta inválido', 400);
      }
      logger.error('Error en getById oferta:', error);
      return responseHelper.error(res, 'Error obteniendo oferta', 500, error);
    }
  },

  async create(req, res) {
    const transaction = await db.getClient();
    
    try {
      await transaction.query('BEGIN');
      
      const {
        nombre,
        descripcion,
        porcentaje_descuento,
        fecha_inicio,
        fecha_fin,
      } = req.body;

      // Sanitizar entrada
      const nombreSanitizado = helpers.sanitizeInput(nombre);
      const descripcionSanitizada = descripcion ? helpers.sanitizeInput(descripcion) : null;

      // Crear instancia de oferta
      const oferta = Oferta.crear(
        nombreSanitizado,
        descripcionSanitizada,
        parseFloat(porcentaje_descuento),
        new Date(fecha_inicio),
        new Date(fecha_fin)
      );

      // Validar oferta
      const validationErrors = Oferta.validate(oferta);
      if (validationErrors.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Errores de validación en la oferta', 400, {
          errors: validationErrors
        });
      }

      // Verificar nombre único
      const ofertaExistente = await transaction.query(
        'SELECT id_oferta FROM ofertas WHERE nombre ILIKE $1',
        [nombreSanitizado]
      );

      if (ofertaExistente.rows.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.conflict(res, 'Ya existe una oferta con ese nombre');
      }

      // Insertar oferta
      const result = await transaction.query(
        `INSERT INTO ofertas (nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          oferta.nombre,
          oferta.descripcion,
          oferta.porcentaje_descuento,
          oferta.fecha_inicio,
          oferta.fecha_fin,
          oferta.activo
        ]
      );

      await transaction.query('COMMIT');
      
      const ofertaCreada = Oferta.fromDatabaseRow(result.rows[0]);

      logger.audit('Oferta creada', req.user?.id_usuario, 'CREATE', {
        oferta_id: ofertaCreada.id_oferta,
        nombre: ofertaCreada.nombre,
        descuento: ofertaCreada.porcentaje_descuento
      });

      return responseHelper.success(res, ofertaCreada, 'Oferta creada exitosamente', 201);

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      logger.error('Error en create oferta:', error);
      return responseHelper.error(res, 'Error creando oferta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async update(req, res) {
    const transaction = await db.getClient();
    
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const {
        nombre,
        descripcion,
        porcentaje_descuento,
        fecha_inicio,
        fecha_fin,
        activo,
      } = req.body;

      // Verificar que la oferta existe
      const ofertaExistente = await transaction.query(
        'SELECT * FROM ofertas WHERE id_oferta = $1',
        [id]
      );

      if (ofertaExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Oferta');
      }

      // Preparar updates
      const updates = {};
      if (nombre !== undefined) updates.nombre = helpers.sanitizeInput(nombre);
      if (descripcion !== undefined) updates.descripcion = descripcion ? helpers.sanitizeInput(descripcion) : null;
      if (porcentaje_descuento !== undefined) updates.porcentaje_descuento = parseFloat(porcentaje_descuento);
      if (fecha_inicio !== undefined) updates.fecha_inicio = new Date(fecha_inicio);
      if (fecha_fin !== undefined) updates.fecha_fin = new Date(fecha_fin);
      if (activo !== undefined) updates.activo = activo;

      if (Object.keys(updates).length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'No hay campos para actualizar', 400);
      }

      // Validar nombre único si se está actualizando
      if (updates.nombre) {
        const nombreExistente = await transaction.query(
          'SELECT id_oferta FROM ofertas WHERE nombre ILIKE $1 AND id_oferta != $2',
          [updates.nombre, id]
        );
        
        if (nombreExistente.rows.length > 0) {
          await transaction.query('ROLLBACK');
          return responseHelper.conflict(res, 'Ya existe otra oferta con ese nombre');
        }
      }

      // Crear instancia temporal para validación
      const ofertaActual = ofertaExistente.rows[0];
      const ofertaTemp = new Oferta(
        id,
        updates.nombre || ofertaActual.nombre,
        updates.descripcion !== undefined ? updates.descripcion : ofertaActual.descripcion,
        updates.porcentaje_descuento || ofertaActual.porcentaje_descuento,
        updates.fecha_inicio || ofertaActual.fecha_inicio,
        updates.fecha_fin || ofertaActual.fecha_fin,
        updates.activo !== undefined ? updates.activo : ofertaActual.activo
      );

      // Validar oferta actualizada
      const validationErrors = Oferta.validate(ofertaTemp);
      if (validationErrors.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'Errores de validación en la oferta', 400, {
          errors: validationErrors
        });
      }

      const { sql, params } = QueryBuilder.buildUpdateQuery(
        'ofertas', 
        updates, 
        'id_oferta', 
        id
      );

      const result = await transaction.query(sql, params);
      await transaction.query('COMMIT');

      const ofertaActualizada = Oferta.fromDatabaseRow(result.rows[0]);

      logger.audit('Oferta actualizada', req.user?.id_usuario, 'UPDATE', {
        oferta_id: id,
        cambios: Object.keys(updates)
      });

      return responseHelper.success(res, ofertaActualizada, 'Oferta actualizada exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de oferta inválido', 400);
      }
      
      logger.error('Error en update oferta:', error);
      return responseHelper.error(res, 'Error actualizando oferta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async delete(req, res) {
    const transaction = await db.getClient();
    
    try {
      await transaction.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);

      // Verificar que la oferta existe
      const ofertaExistente = await transaction.query(
        'SELECT * FROM ofertas WHERE id_oferta = $1',
        [id]
      );

      if (ofertaExistente.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Oferta');
      }

      // Verificar si hay productos asociados
      const productosAsociados = await transaction.query(
        'SELECT COUNT(*) FROM producto_oferta WHERE id_oferta = $1',
        [id]
      );

      const countProductos = parseInt(productosAsociados.rows[0].count);
      if (countProductos > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(
          res, 
          `No se puede eliminar la oferta porque tiene ${countProductos} producto(s) asociado(s). Desasigne los productos primero.`, 
          409
        );
      }

      // Eliminar oferta
      await transaction.query('DELETE FROM ofertas WHERE id_oferta = $1', [id]);
      await transaction.query('COMMIT');

      logger.audit('Oferta eliminada', req.user?.id_usuario, 'DELETE', {
        oferta_id: id,
        nombre: ofertaExistente.rows[0].nombre
      });

      return responseHelper.success(res, null, 'Oferta eliminada exitosamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de oferta inválido', 400);
      }
      
      logger.error('Error en delete oferta:', error);
      return responseHelper.error(res, 'Error eliminando oferta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async asignarProducto(req, res) {
    const transaction = await db.getClient();
    
    try {
      await transaction.query('BEGIN');

      const { id_producto, id_oferta } = req.body;

      // Validar IDs
      const productoId = QueryBuilder.validateId(id_producto);
      const ofertaId = QueryBuilder.validateId(id_oferta);

      // Verificar que el producto existe
      const productoExists = await transaction.query(
        "SELECT id_producto, nombre FROM productos WHERE id_producto = $1",
        [productoId]
      );
      
      if (productoExists.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Producto');
      }

      // Verificar que la oferta existe
      const ofertaExists = await transaction.query(
        "SELECT id_oferta, nombre, activo FROM ofertas WHERE id_oferta = $1",
        [ofertaId]
      );
      
      if (ofertaExists.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Oferta');
      }

      // Verificar que la oferta está activa
      if (!ofertaExists.rows[0].activo) {
        await transaction.query('ROLLBACK');
        return responseHelper.error(res, 'No se pueden asignar productos a ofertas inactivas', 400);
      }

      // Verificar que no existe ya la relación
      const relacionExists = await transaction.query(
        "SELECT id_producto FROM producto_oferta WHERE id_producto = $1 AND id_oferta = $2",
        [productoId, ofertaId]
      );
      
      if (relacionExists.rows.length > 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.conflict(res, 'El producto ya está asignado a esta oferta');
      }

      // Crear relación usando el modelo
      const productoOferta = ProductoOferta.crear(productoId, ofertaId);
      
      // Insertar relación
      await transaction.query(
        "INSERT INTO producto_oferta (id_producto, id_oferta) VALUES ($1, $2)",
        [productoOferta.id_producto, productoOferta.id_oferta]
      );

      await transaction.query('COMMIT');

      logger.audit('Producto asignado a oferta', req.user?.id_usuario, 'ASSIGN_PRODUCT', {
        producto_id: productoId,
        oferta_id: ofertaId,
        producto_nombre: productoExists.rows[0].nombre,
        oferta_nombre: ofertaExists.rows[0].nombre
      });

      return responseHelper.success(res, null, 'Producto asignado a oferta correctamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID inválido en los datos proporcionados', 400);
      }
      
      if (error.code === '23505') {
        return responseHelper.conflict(res, 'La relación producto-oferta ya existe');
      }
      
      logger.error('Error en asignarProducto:', error);
      return responseHelper.error(res, 'Error asignando producto a oferta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async desasignarProducto(req, res) {
    const transaction = await db.getClient();
    
    try {
      await transaction.query('BEGIN');

      const { id_producto, id_oferta } = req.body;

      // Validar IDs
      const productoId = QueryBuilder.validateId(id_producto);
      const ofertaId = QueryBuilder.validateId(id_oferta);

      // Verificar que la relación existe
      const relacionExists = await transaction.query(
        "SELECT po.*, p.nombre as producto_nombre, o.nombre as oferta_nombre \
         FROM producto_oferta po \
         JOIN productos p ON po.id_producto = p.id_producto \
         JOIN ofertas o ON po.id_oferta = o.id_oferta \
         WHERE po.id_producto = $1 AND po.id_oferta = $2",
        [productoId, ofertaId]
      );
      
      if (relacionExists.rows.length === 0) {
        await transaction.query('ROLLBACK');
        return responseHelper.notFound(res, 'Relación producto-oferta');
      }

      // Eliminar relación
      await transaction.query(
        "DELETE FROM producto_oferta WHERE id_producto = $1 AND id_oferta = $2",
        [productoId, ofertaId]
      );

      await transaction.query('COMMIT');

      const relacion = relacionExists.rows[0];
      
      logger.audit('Producto desasignado de oferta', req.user?.id_usuario, 'UNASSIGN_PRODUCT', {
        producto_id: productoId,
        oferta_id: ofertaId,
        producto_nombre: relacion.producto_nombre,
        oferta_nombre: relacion.oferta_nombre
      });

      return responseHelper.success(res, null, 'Producto desasignado de la oferta correctamente');

    } catch (error) {
      await transaction.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID inválido en los datos proporcionados', 400);
      }
      
      logger.error('Error en desasignarProducto:', error);
      return responseHelper.error(res, 'Error desasignando producto de oferta', 500, error);
    } finally {
      transaction.release();
    }
  },

  async getProductosAsociados(req, res) {
    try {
      const id = QueryBuilder.validateId(req.params.id);
      const { page = 1, limit = 50 } = req.query;
      const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);

      // Verificar que la oferta existe
      const ofertaExists = await db.query(
        "SELECT id_oferta, nombre FROM ofertas WHERE id_oferta = $1",
        [id]
      );
      
      if (ofertaExists.rows.length === 0) {
        return responseHelper.notFound(res, 'Oferta');
      }

      // Obtener productos asociados
      const productosResult = await db.query(`
        SELECT po.*, 
               p.nombre as producto_nombre, 
               p.precio_venta as precio_original,
               p.stock,
               p.codigo_barra
        FROM producto_oferta po
        JOIN productos p ON po.id_producto = p.id_producto
        WHERE po.id_oferta = $1
        ORDER BY p.nombre
        LIMIT $2 OFFSET $3
      `, [id, limitNum, offset]);

      const productos = productosResult.rows.map(row => 
        ProductoOferta.fromDatabaseRow(row)
      );

      // Contar total
      const countResult = await db.query(
        "SELECT COUNT(*) FROM producto_oferta WHERE id_oferta = $1",
        [id]
      );
      
      const total = parseInt(countResult.rows[0].count);

      logger.database('Productos de oferta obtenidos', {
        oferta_id: id,
        count: productos.length,
        total
      });

      return responseHelper.success(res, {
        oferta: Oferta.fromDatabaseRow(ofertaExists.rows[0]),
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
        return responseHelper.error(res, 'ID de oferta inválido', 400);
      }
      
      logger.error('Error en getProductosAsociados:', error);
      return responseHelper.error(res, 'Error obteniendo productos de la oferta', 500, error);
    }
  }
};

module.exports = ofertaController;