const db = require("../config/database");
const Usuario = require("../models/Usuario");
const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const QueryBuilder = require("../utils/queryBuilder");
const helpers = require("../utils/helpers");

const usuarioController = {
  async getAll(req, res) {
    const client = await db.connect();
    try {
      const { 
        q, 
        rol, 
        activo, 
        page = 1, 
        limit = 20,
        sortBy = 'creado_en',
        sortOrder = 'DESC'
      } = req.query;
      
      const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);
      
      const searchTerm = q ? QueryBuilder.sanitizeSearchTerm(q) : null;
      
      const whereClauses = [];
      const params = [];
      let idx = 1;

      // Filtros de búsqueda
      if (searchTerm) {
        whereClauses.push(`(nombre ILIKE $${idx} OR correo ILIKE $${idx})`);
        params.push(`%${searchTerm}%`);
        idx++;
      }
      
      if (rol) {
        const rolesValidos = ['admin', 'gerente', 'cajero', 'dueno'];
        if (!rolesValidos.includes(rol)) {
          return responseHelper.error(res, `Rol inválido. Válidos: ${rolesValidos.join(', ')}`, 400);
        }
        whereClauses.push(`rol = $${idx}`);
        params.push(rol);
        idx++;
      }
      
      if (activo !== undefined) {
        const activoBool = activo === 'true' || activo === '1';
        whereClauses.push(`activo = $${idx}`);
        params.push(activoBool);
        idx++;
      }

      // Validar ordenamiento
      const validSortFields = ['nombre', 'correo', 'rol', 'creado_en', 'ultimo_login'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'creado_en';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

      // Obtener total
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM usuarios ${whereSQL}`, 
        params
      );
      const total = countRes.rows[0].total;

      // Obtener datos
      params.push(limitNum, offset);
      const dataRes = await client.query(
        `SELECT id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login
         FROM usuarios
         ${whereSQL}
         ORDER BY ${sortField} ${order}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        params
      );

      const usuarios = dataRes.rows.map(row => Usuario.fromDatabaseRow(row));
      
      // Enriquecer con información del modelo
      const usuariosConInfo = usuarios.map(usuario => ({
        ...usuario.toJSON(),
        es_administrador: usuario.esAdministrador(),
        puede_asignar_roles: usuario.getRolesAsignables().length > 0,
        estado: usuario.activo ? 'Activo' : 'Inactivo'
      }));

      logger.api("Listado de usuarios obtenido exitosamente", {
        total: total,
        page: pageNum,
        limit: limitNum,
        resultados: usuarios.length,
        usuarioConsulta: req.user?.id_usuario
      });

      return responseHelper.success(res, {
        usuarios: usuariosConInfo,
        pagination: { 
          total, 
          page: pageNum, 
          limit: limitNum, 
          pages: Math.ceil(total / limitNum) 
        },
        filtros: { q, rol, activo }
      });

    } catch (error) {
      logger.error("Error en usuarioController.getAll", error);
      return responseHelper.error(res, "Error obteniendo usuarios", 500, error);
    } finally {
      client.release();
    }
  },

  async getById(req, res) {
    const client = await db.connect();
    try {
      const id = QueryBuilder.validateId(req.params.id);

      const result = await client.query(
        `SELECT id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login
         FROM usuarios 
         WHERE id_usuario = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return responseHelper.notFound(res, "Usuario");
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);
      
      // Obtener estadísticas del usuario si se solicita
      if (req.query.includeStats === 'true') {
        const statsResult = await client.query(
          `SELECT 
             COUNT(*) as total_ventas,
             COALESCE(SUM(v.total), 0) as total_ventas_monto,
             COUNT(DISTINCT DATE(v.fecha)) as dias_trabajados
           FROM ventas v 
           WHERE v.id_usuario = $1`,
          [id]
        );
        
        usuario.estadisticas = {
          total_ventas: parseInt(statsResult.rows[0].total_ventas) || 0,
          total_ventas_monto: parseFloat(statsResult.rows[0].total_ventas_monto) || 0,
          dias_trabajados: parseInt(statsResult.rows[0].dias_trabajados) || 0
        };
      }

      logger.api("Usuario obtenido por ID", {
        usuarioId: id,
        usuarioConsulta: req.user?.id_usuario
      });

      return responseHelper.success(res, usuario.toJSON());

    } catch (error) {
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de usuario inválido', 400);
      }
      logger.error("Error en usuarioController.getById", error);
      return responseHelper.error(res, "Error obteniendo usuario", 500, error);
    } finally {
      client.release();
    }
  },

  async create(req, res) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const { nombre, correo, contrasena, rol } = req.body;
      
      // Validar datos requeridos
      if (!nombre || !correo || !contrasena) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'Nombre, correo y contraseña son obligatorios', 400);
      }

      // Sanitizar entrada
      const usuarioData = {
        nombre: helpers.sanitizeInput(nombre),
        correo: helpers.sanitizeInput(correo).toLowerCase(),
        contrasena: contrasena,
        rol: rol || 'cajero'
      };

      // Validar usando el modelo
      const validationErrors = Usuario.validate(usuarioData);
      if (validationErrors.length > 0) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'Errores de validación', 400, {
          errors: validationErrors
        });
      }

      // Verificar que el correo no exista
      const correoExistente = await client.query(
        'SELECT id_usuario FROM usuarios WHERE correo = $1',
        [usuarioData.correo]
      );
      
      if (correoExistente.rows.length > 0) {
        await client.query('ROLLBACK');
        return responseHelper.conflict(res, 'Ya existe un usuario con ese correo electrónico');
      }

      // Validar rol
      const rolesValidos = ['admin', 'gerente', 'cajero', 'dueno'];
      if (!rolesValidos.includes(usuarioData.rol)) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, `Rol inválido. Válidos: ${rolesValidos.join(', ')}`, 400);
      }

      // Crear hash de contraseña
      const contrasenaHash = await Usuario.hashContrasena(usuarioData.contrasena);

      const result = await client.query(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) 
         VALUES ($1, $2, $3, $4)
         RETURNING id_usuario, nombre, correo, rol, activo, creado_en`,
        [usuarioData.nombre, usuarioData.correo, contrasenaHash, usuarioData.rol]
      );

      await client.query('COMMIT');

      const usuarioCreado = Usuario.fromDatabaseRow(result.rows[0]);
      
      logger.audit("Usuario creado exitosamente", req.user?.id_usuario, "CREATE", {
        nuevoUsuarioId: usuarioCreado.id_usuario,
        rol: usuarioCreado.rol,
        correo: usuarioCreado.correo
      });

      return responseHelper.success(res, 
        usuarioCreado.toJSON(), 
        "Usuario creado exitosamente", 
        201
      );

    } catch (error) {
      await client.query('ROLLBACK');
      
      logger.error("Error en usuarioController.create", {
        error: error.message,
        datosSolicitud: { 
          nombre: req.body.nombre,
          correo: req.body.correo,
          rol: req.body.rol 
        },
        usuarioCreador: req.user?.id_usuario
      });
      
      if (error.code === "23505") {
        return responseHelper.conflict(res, "El correo electrónico ya está registrado");
      }
      
      return responseHelper.error(res, "Error creando usuario", 500, error);
    } finally {
      client.release();
    }
  },

  async update(req, res) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const { nombre, correo, rol, activo } = req.body;

      // Verificar que el usuario existe
      const usuarioExistente = await client.query(
        'SELECT * FROM usuarios WHERE id_usuario = $1',
        [id]
      );

      if (usuarioExistente.rows.length === 0) {
        await client.query('ROLLBACK');
        return responseHelper.notFound(res, 'Usuario');
      }

      const usuarioActual = usuarioExistente.rows[0];
      const updates = {};

      // Preparar updates validados
      if (nombre !== undefined) {
        updates.nombre = helpers.sanitizeInput(nombre);
      }

      if (correo !== undefined) {
        const nuevoCorreo = helpers.sanitizeInput(correo).toLowerCase();
        if (nuevoCorreo !== usuarioActual.correo) {
          // Verificar que el nuevo correo no exista
          const correoExistente = await client.query(
            'SELECT id_usuario FROM usuarios WHERE correo = $1 AND id_usuario != $2',
            [nuevoCorreo, id]
          );
          
          if (correoExistente.rows.length > 0) {
            await client.query('ROLLBACK');
            return responseHelper.conflict(res, 'Ya existe otro usuario con ese correo electrónico');
          }
          updates.correo = nuevoCorreo;
        }
      }

      if (rol !== undefined) {
        const rolesValidos = ['admin', 'gerente', 'cajero', 'dueno'];
        if (!rolesValidos.includes(rol)) {
          await client.query('ROLLBACK');
          return responseHelper.error(res, `Rol inválido. Válidos: ${rolesValidos.join(', ')}`, 400);
        }
        updates.rol = rol;
      }

      if (activo !== undefined) {
        updates.activo = activo === true || activo === 'true';
      }

      if (Object.keys(updates).length === 0) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'No se proporcionaron campos válidos para actualizar', 400);
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

      const result = await client.query(
        `UPDATE usuarios SET ${setClauses.join(', ')}, actualizado_en = CURRENT_TIMESTAMP 
         WHERE id_usuario = $${paramIndex} 
         RETURNING id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login`,
        values
      );

      await client.query('COMMIT');

      const usuarioActualizado = Usuario.fromDatabaseRow(result.rows[0]);

      logger.audit("Usuario actualizado", req.user?.id_usuario, "UPDATE", {
        usuarioId: id,
        campos_actualizados: Object.keys(updates)
      });

      return responseHelper.success(res, 
        usuarioActualizado.toJSON(), 
        "Usuario actualizado exitosamente"
      );

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de usuario inválido', 400);
      }
      
      logger.error("Error en usuarioController.update", error);
      return responseHelper.error(res, "Error actualizando usuario", 500, error);
    } finally {
      client.release();
    }
  },

  async setActive(req, res) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const { activo } = req.body;

      if (activo === undefined) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'El campo "activo" es requerido', 400);
      }

      // Verificar que el usuario existe
      const usuarioExistente = await client.query(
        'SELECT * FROM usuarios WHERE id_usuario = $1',
        [id]
      );

      if (usuarioExistente.rows.length === 0) {
        await client.query('ROLLBACK');
        return responseHelper.notFound(res, 'Usuario');
      }

      const activoBool = activo === true || activo === 'true';

      // No permitir desactivarse a sí mismo
      if (parseInt(id) === parseInt(req.user.id_usuario) && !activoBool) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'No puedes desactivar tu propia cuenta', 400);
      }

      const result = await client.query(
        `UPDATE usuarios SET activo = $1, actualizado_en = CURRENT_TIMESTAMP 
         WHERE id_usuario = $2 
         RETURNING id_usuario, nombre, correo, rol, activo, creado_en`,
        [activoBool, id]
      );

      await client.query('COMMIT');

      const usuarioActualizado = Usuario.fromDatabaseRow(result.rows[0]);

      logger.audit("Estado de usuario actualizado", req.user?.id_usuario, "UPDATE", {
        usuarioId: id,
        nuevoEstado: activoBool ? 'activado' : 'desactivado'
      });

      return responseHelper.success(res, 
        usuarioActualizado.toJSON(), 
        `Usuario ${activoBool ? 'activado' : 'desactivado'} exitosamente`
      );

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de usuario inválido', 400);
      }
      
      logger.error("Error en usuarioController.setActive", error);
      return responseHelper.error(res, "Error actualizando estado del usuario", 500, error);
    } finally {
      client.release();
    }
  },

  async delete(req, res) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);

      // Verificar que el usuario existe
      const usuarioExistente = await client.query(
        'SELECT * FROM usuarios WHERE id_usuario = $1',
        [id]
      );

      if (usuarioExistente.rows.length === 0) {
        await client.query('ROLLBACK');
        return responseHelper.notFound(res, 'Usuario');
      }

      // No permitir eliminarse a sí mismo
      if (parseInt(id) === parseInt(req.user.id_usuario)) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'No puedes eliminar tu propia cuenta', 400);
      }

      // Verificar si el usuario tiene ventas asociadas
      const ventasAsociadas = await client.query(
        'SELECT COUNT(*) FROM ventas WHERE id_usuario = $1',
        [id]
      );

      const countVentas = parseInt(ventasAsociadas.rows[0].count);
      if (countVentas > 0) {
        // En lugar de eliminar, desactivar el usuario
        await client.query(
          'UPDATE usuarios SET activo = false, actualizado_en = CURRENT_TIMESTAMP WHERE id_usuario = $1',
          [id]
        );
        
        await client.query('COMMIT');

        logger.audit("Usuario desactivado (tenía ventas asociadas)", req.user?.id_usuario, "UPDATE", {
          usuarioId: id,
          ventas_asociadas: countVentas
        });

        return responseHelper.success(res, null, 'Usuario desactivado (tenía ventas asociadas)');
      }

      // Eliminar usuario
      await client.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);

      await client.query('COMMIT');

      logger.audit("Usuario eliminado", req.user?.id_usuario, "DELETE", {
        usuarioId: id,
        nombre: usuarioExistente.rows[0].nombre
      });

      return responseHelper.success(res, null, 'Usuario eliminado exitosamente');

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de usuario inválido', 400);
      }
      
      logger.error("Error en usuarioController.delete", error);
      return responseHelper.error(res, "Error eliminando usuario", 500, error);
    } finally {
      client.release();
    }
  },

  async changePassword(req, res) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const id = QueryBuilder.validateId(req.params.id);
      const { contrasena_actual, nueva_contrasena } = req.body;

      if (!contrasena_actual || !nueva_contrasena) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'Contraseña actual y nueva contraseña son requeridas', 400);
      }

      // Verificar que el usuario existe
      const usuarioExistente = await client.query(
        'SELECT * FROM usuarios WHERE id_usuario = $1',
        [id]
      );

      if (usuarioExistente.rows.length === 0) {
        await client.query('ROLLBACK');
        return responseHelper.notFound(res, 'Usuario');
      }

      const usuario = Usuario.fromDatabaseRow(usuarioExistente.rows[0]);

      // Verificar contraseña actual (solo si no es el propio usuario cambiando su contraseña)
      if (parseInt(id) !== parseInt(req.user.id_usuario)) {
        // Solo administradores pueden cambiar contraseñas de otros sin verificar la actual
        if (!req.user.rol.includes('admin') && !req.user.rol.includes('dueno')) {
          await client.query('ROLLBACK');
          return responseHelper.forbidden(res, 'No tienes permisos para cambiar contraseñas de otros usuarios');
        }
      } else {
        // El usuario está cambiando su propia contraseña, verificar la actual
        const contrasenaValida = await usuario.verificarContrasena(contrasena_actual);
        if (!contrasenaValida) {
          await client.query('ROLLBACK');
          return responseHelper.unauthorized(res, 'Contraseña actual incorrecta');
        }
      }

      // Validar nueva contraseña
      if (nueva_contrasena.length < 6) {
        await client.query('ROLLBACK');
        return responseHelper.error(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
      }

      // Generar nuevo hash
      const nuevaContrasenaHash = await Usuario.hashContrasena(nueva_contrasena);

      await client.query(
        'UPDATE usuarios SET contrasena_hash = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id_usuario = $2',
        [nuevaContrasenaHash, id]
      );

      await client.query('COMMIT');

      logger.audit("Contraseña de usuario cambiada", req.user?.id_usuario, "UPDATE", {
        usuarioId: id,
        cambio_propio: parseInt(id) === parseInt(req.user.id_usuario)
      });

      return responseHelper.success(res, null, 'Contraseña cambiada exitosamente');

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.message === 'ID inválido') {
        return responseHelper.error(res, 'ID de usuario inválido', 400);
      }
      
      logger.error("Error en usuarioController.changePassword", error);
      return responseHelper.error(res, "Error cambiando contraseña", 500, error);
    } finally {
      client.release();
    }
  }
};

module.exports = usuarioController;