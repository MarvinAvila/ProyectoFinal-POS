const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/database");
const Usuario = require("../models/Usuario");
const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const QueryBuilder = require("../utils/queryBuilder");
const helpers = require("../utils/helpers");

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_jwt_muy_segura";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Helper para generar token JWT
const generarToken = (usuario) => {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      session_id: crypto.randomBytes(16).toString("hex"), // Para invalidación específica
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Helper para generar token de recuperación
const generarTokenRecuperacion = () => {
  return crypto.randomBytes(32).toString("hex");
};

const authController = {
  // ==================== AUTENTICACIÓN BÁSICA ====================

  async login(req, res) {
    const client = await db.getClient();
    try {
      const { correo, contrasena } = req.body;

      // Validaciones básicas
      if (!correo || !contrasena) {
        return responseHelper.error(
          res,
          "Correo y contraseña son obligatorios",
          400
        );
      }

      // Buscar usuario en la base de datos
      const result = await client.query(
        "SELECT * FROM usuarios WHERE correo = $1",
        [correo.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        logger.security("Intento de login con correo no registrado", {
          correo: correo,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });
        return responseHelper.unauthorized(res, "Credenciales inválidas");
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);

      // Verificar si está activo
      if (!usuario.activo) {
        logger.security("Intento de login de usuario inactivo", {
          usuarioId: usuario.id_usuario,
          correo: usuario.correo,
          ip: req.ip,
        });
        return responseHelper.unauthorized(
          res,
          "Usuario inactivo. Contacta al administrador."
        );
      }

      // Verificar contraseña
      const contrasenaValida = await usuario.validatePassword(contrasena);

      if (!contrasenaValida) {
        logger.security("Intento de login con contraseña incorrecta", {
          usuarioId: usuario.id_usuario,
          correo: usuario.correo,
          ip: req.ip,
        });
        return responseHelper.unauthorized(res, "Credenciales inválidas");
      }

      // Generar token
      const token = generarToken(usuario);

      // Actualizar último login
      await client.query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = $1",
        [usuario.id_usuario]
      );

      logger.audit("Login exitoso", usuario.id_usuario, "LOGIN", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        rol: usuario.rol,
      });

      return responseHelper.success(
        res,
        {
          usuario: usuario.toJSON(),
          token: token,
          expiresIn: JWT_EXPIRES_IN,
          permisos: {
            puede_administrar: usuario.esAdministrador(),
            es_gerente_superior: usuario.esGerenteOSuperior(),
            roles_permitidos: usuario.getRolesAsignables(),
          },
        },
        "Login exitoso"
      );
    } catch (error) {
      logger.error("Error en authController.login", {
        error: error.message,
        correo: req.body.correo,
        ip: req.ip,
      });

      return responseHelper.error(
        res,
        "Error en el servidor durante el login",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getMe(req, res) {
    const client = await db.getClient();
    try {
      const result = await client.query(
        "SELECT id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login FROM usuarios WHERE id_usuario = $1 AND activo = true",
        [req.user.id_usuario]
      );

      if (result.rows.length === 0) {
        logger.security("Usuario no encontrado al verificar token", {
          usuarioId: req.user.id_usuario,
          ip: req.ip,
        });
        return responseHelper.unauthorized(
          res,
          "Usuario no encontrado o inactivo"
        );
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);

      const userInfo = {
        ...usuario.toJSON(),
        permisos: {
          puede_administrar: usuario.esAdministrador(),
          es_gerente_superior: usuario.esGerenteOSuperior(),
          roles_permitidos: usuario.getRolesAsignables(),
        },
        estadisticas: await authController.obtenerEstadisticasUsuario(
          usuario.id_usuario
        ),
      };

      logger.api("Información de usuario obtenida", {
        usuarioId: usuario.id_usuario,
        rol: usuario.rol,
      });

      return responseHelper.success(res, userInfo);
    } catch (error) {
      logger.error("Error en authController.getMe", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
        ip: req.ip,
      });

      return responseHelper.error(
        res,
        "Error obteniendo información del usuario",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async changePassword(req, res) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const { contrasena_actual, nueva_contrasena } = req.body;

      if (!contrasena_actual || !nueva_contrasena) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          "Contraseña actual y nueva contraseña son obligatorias",
          400
        );
      }

      const result = await client.query(
        "SELECT * FROM usuarios WHERE id_usuario = $1",
        [req.user.id_usuario]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return responseHelper.notFound(res, "Usuario");
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);

      // Verificar contraseña actual
      const contrasenaActualValida = await usuario.validatePassword(
        contrasena_actual
      );

      if (!contrasenaActualValida) {
        logger.security(
          "Intento de cambio de contraseña con contraseña actual incorrecta",
          {
            usuarioId: usuario.id_usuario,
            ip: req.ip,
          }
        );
        await client.query("ROLLBACK");
        return responseHelper.unauthorized(res, "Contraseña actual incorrecta");
      }

      // Validar nueva contraseña

      const validationErrors = Usuario.validarSoloContrasena(nueva_contrasena);
      if (validationErrors.length > 0) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          `Error en la nueva contraseña: ${validationErrors.join(", ")}`,
          400
        );
      }

      // Actualizar contraseña
      const nuevoHash = await bcrypt.hash(nueva_contrasena, BCRYPT_ROUNDS);
      await client.query(
        "UPDATE usuarios SET contrasena_hash = $1, actualizado_en = NOW() WHERE id_usuario = $2",
        [nuevoHash, usuario.id_usuario]
      );

      await client.query("COMMIT");

      logger.audit(
        "Contraseña cambiada exitosamente",
        usuario.id_usuario,
        "UPDATE_PASSWORD",
        {
          ip: req.ip,
          cambioPor: "usuario",
        }
      );

      return responseHelper.success(
        res,
        null,
        "Contraseña actualizada correctamente"
      );
    } catch (error) {
      await client.query("ROLLBACK");

      logger.error("Error en authController.changePassword", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
        ip: req.ip,
      });

      return responseHelper.error(
        res,
        "Error cambiando contraseña",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  // ==================== REGISTRO Y RECUPERACIÓN ====================

  async register(req, res) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const { nombre, correo, contrasena, rol = "vendedor" } = req.body;

      // Verificar que el correo no existe
      const usuarioExistente = await client.query(
        "SELECT id_usuario FROM usuarios WHERE correo = $1",
        [correo.toLowerCase()]
      );

      if (usuarioExistente.rows.length > 0) {
        await client.query("ROLLBACK");
        return responseHelper.conflict(
          res,
          "Ya existe un usuario con ese correo electrónico"
        );
      }

      // ✅ CORREGIDO: Crear objeto para validación
      const usuarioData = {
        nombre: helpers.sanitizeInput(nombre),
        correo: correo.toLowerCase(),
        contrasena: contrasena, // ← Incluir la contraseña
        rol: rol,
        activo: true,
      };

      // ✅ CORREGIDO: Validar datos del usuario
      const validationErrors = Usuario.validate(usuarioData);
      if (validationErrors.length > 0) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          `Errores de validación: ${validationErrors.join(", ")}`,
          400
        );
      }

      // ✅ CORREGIDO: Luego crear la instancia
      const usuario = new Usuario(
        null,
        usuarioData.nombre,
        usuarioData.correo,
        null, // hash se generará después
        usuarioData.rol,
        usuarioData.activo,
        new Date()
      );

      // Hash de contraseña
      const contrasenaHash = await bcrypt.hash(contrasena, BCRYPT_ROUNDS);

      // Insertar usuario
      const result = await client.query(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, creado_en)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          usuario.nombre,
          usuario.correo,
          contrasenaHash,
          usuario.rol,
          usuario.activo,
          usuario.creado_en,
        ]
      );

      await client.query("COMMIT");

      const usuarioCreado = Usuario.fromDatabaseRow(result.rows[0]);

      logger.audit(
        "Usuario registrado",
        req.user?.id_usuario || "sistema",
        "CREATE_USER",
        {
          usuarioId: usuarioCreado.id_usuario,
          correo: usuarioCreado.correo,
          rol: usuarioCreado.rol,
          registradoPor: req.user?.id_usuario || "sistema",
        }
      );

      return responseHelper.success(
        res,
        usuarioCreado.toJSON(),
        "Usuario registrado exitosamente",
        201
      );
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error en authController.register", {
        error: error.message,
        datos: req.body,
        usuario: req.user?.id_usuario,
      });
      return responseHelper.error(res, "Error registrando usuario", 500, error);
    } finally {
      client.release();
    }
  },

  async forgotPassword(req, res) {
    const client = await db.getClient();
    try {
      const { correo } = req.body;

      if (!correo) {
        return responseHelper.error(
          res,
          "El correo electrónico es requerido",
          400
        );
      }

      // Buscar usuario
      const result = await client.query(
        "SELECT id_usuario, nombre FROM usuarios WHERE correo = $1 AND activo = true",
        [correo.toLowerCase()]
      );

      if (result.rows.length === 0) {
        // Por seguridad, no revelar si el correo existe o no
        logger.security("Solicitud de recuperación para correo no encontrado", {
          correo: correo,
          ip: req.ip,
        });
        return responseHelper.success(
          res,
          null,
          "Si el correo existe, se enviarán instrucciones"
        );
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);

      // Generar token de recuperación
      const tokenRecuperacion = generarTokenRecuperacion();
      const expiracion = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora

      // Guardar token en la base de datos
      await client.query(
        "UPDATE usuarios SET token_recuperacion = $1, expiracion_token = $2 WHERE id_usuario = $3",
        [tokenRecuperacion, expiracion, usuario.id_usuario]
      );

      // Aquí iría el envío real del email
      logger.audit(
        "Solicitud de recuperación de contraseña",
        usuario.id_usuario,
        "FORGOT_PASSWORD",
        {
          ip: req.ip,
          tokenGenerado: true,
        }
      );

      // En desarrollo, devolver el token (en producción no hacer esto)
      if (process.env.NODE_ENV === "development") {
        return responseHelper.success(
          res,
          {
            mensaje: "Token de recuperación generado (solo en desarrollo)",
            token: tokenRecuperacion,
            expiracion: expiracion,
          },
          "Instrucciones enviadas al correo"
        );
      }

      return responseHelper.success(
        res,
        null,
        "Si el correo existe, se enviarán instrucciones"
      );
    } catch (error) {
      logger.error("Error en authController.forgotPassword", {
        error: error.message,
        correo: req.body.correo,
        ip: req.ip,
      });

      return responseHelper.error(
        res,
        "Error procesando solicitud de recuperación",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async resetPassword(req, res) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          "Token y nueva contraseña son requeridos",
          400
        );
      }

      // Buscar usuario por token válido
      const result = await client.query(
        "SELECT * FROM usuarios WHERE token_recuperacion = $1 AND expiracion_token > NOW()",
        [token]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return responseHelper.error(res, "Token inválido o expirado", 400);
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);

      // Validar nueva contraseña
      // Validar nueva contraseña usando el método específico
      const passwordErrors = Usuario.validarSoloContrasena(newPassword);
      if (passwordErrors.length > 0) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          `Error en la contraseña: ${passwordErrors.join(", ")}`,
          400
        );
      }

      // Actualizar contraseña y limpiar token
      const nuevoHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await client.query(
        "UPDATE usuarios SET contrasena_hash = $1, token_recuperacion = NULL, expiracion_token = NULL, actualizado_en = NOW() WHERE id_usuario = $2",
        [nuevoHash, usuario.id_usuario]
      );

      await client.query("COMMIT");

      logger.audit(
        "Contraseña restablecida via token",
        usuario.id_usuario,
        "RESET_PASSWORD",
        {
          ip: req.ip,
          metodo: "token_recuperacion",
        }
      );

      return responseHelper.success(
        res,
        null,
        "Contraseña restablecida correctamente"
      );
    } catch (error) {
      await client.query("ROLLBACK");

      logger.error("Error en authController.resetPassword", {
        error: error.message,
        ip: req.ip,
      });

      return responseHelper.error(
        res,
        "Error restableciendo contraseña",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  // ==================== FUNCIONALIDADES ADICIONALES ====================

  async checkPermission(req, res) {
    try {
      const { ruta, metodo = "GET" } = req.body;

      if (!ruta) {
        return responseHelper.error(res, "La ruta es requerida", 400);
      }

      const result = await db.query(
        "SELECT * FROM usuarios WHERE id_usuario = $1",
        [req.user.id_usuario]
      );

      if (result.rows.length === 0) {
        return responseHelper.unauthorized(res, "Usuario no encontrado");
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);

      // Aquí implementarías la lógica de permisos específica
      const tienePermiso = usuario.puedeAccederA(ruta, metodo);

      return responseHelper.success(res, {
        tienePermiso: tienePermiso,
        usuario: usuario.toJSON(),
        rutaSolicitada: ruta,
        metodo: metodo,
        rol: usuario.rol,
      });
    } catch (error) {
      logger.error("Error en authController.checkPermission", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
        ruta: req.body.ruta,
      });

      return responseHelper.error(
        res,
        "Error verificando permisos",
        500,
        error
      );
    }
  },

  async refreshToken(req, res) {
    try {
      const result = await db.query(
        "SELECT id_usuario, nombre, correo, rol, activo FROM usuarios WHERE id_usuario = $1 AND activo = true",
        [req.user.id_usuario]
      );

      if (result.rows.length === 0) {
        return responseHelper.unauthorized(
          res,
          "Usuario no encontrado o inactivo"
        );
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);
      const newToken = generarToken(usuario);

      logger.audit("Token refrescado", usuario.id_usuario, "REFRESH_TOKEN", {
        ip: req.ip,
      });

      return responseHelper.success(
        res,
        {
          token: newToken,
          expiresIn: JWT_EXPIRES_IN,
          usuario: usuario.toJSON(),
        },
        "Token refrescado exitosamente"
      );
    } catch (error) {
      logger.error("Error en authController.refreshToken", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
      });

      return responseHelper.error(res, "Error refrescando token", 500, error);
    }
  },

  async logout(req, res) {
    try {
      logger.audit("Logout realizado", req.user.id_usuario, "LOGOUT", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return responseHelper.success(res, null, "Logout exitoso");
    } catch (error) {
      logger.error("Error en authController.logout", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
      });

      return responseHelper.error(res, "Error en el logout", 500, error);
    }
  },

  // ==================== MÉTODOS HELPER ====================

  async obtenerEstadisticasUsuario(usuarioId) {
    try {
      // ✅ COMENTADO TEMPORALMENTE - Las tablas pueden estar vacías
      const ventasResult = await db.query(
        "SELECT COUNT(*) as total_ventas, SUM(total) as total_ventas_monto FROM ventas WHERE id_usuario = $1",
        [usuarioId]
      );
      const alertasResult = await db.query(
        "SELECT COUNT(*) as alertas_pendientes FROM alertas WHERE atendida = false"
      );
      return {
        total_ventas: 0, // parseInt(ventasResult.rows[0].total_ventas) || 0,
        total_ventas_monto: 0, // parseFloat(ventasResult.rows[0].total_ventas_monto) || 0,
        alertas_pendientes: 0, // parseInt(alertasResult.rows[0].alertas_pendientes) || 0,
      };
    } catch (error) {
      logger.error("Error obteniendo estadísticas de usuario", {
        usuarioId,
        error: error.message,
      });
      return {};
    }
  },

  // ==================== MÉTODOS ADICIONALES PARA LAS RUTAS ====================

  async getProfile(req, res) {
    try {
      // Reutilizamos la lógica de getMe pero con más información
      const result = await db.query(
        `SELECT u.*, 
                        COUNT(v.id_venta) as total_ventas,
                        COALESCE(SUM(v.total), 0) as total_ventas_monto,
                        COUNT(DISTINCT DATE(v.fecha)) as dias_trabajados
                 FROM usuarios u
                 LEFT JOIN ventas v ON u.id_usuario = v.id_usuario
                 WHERE u.id_usuario = $1 AND u.activo = true
                 GROUP BY u.id_usuario`,
        [req.user.id_usuario]
      );

      if (result.rows.length === 0) {
        return responseHelper.notFound(res, "Usuario");
      }

      const usuario = Usuario.fromDatabaseRow(result.rows[0]);
      const estadisticas = await authController.obtenerEstadisticasUsuario(
        usuario.id_usuario
      );

      const profileInfo = {
        ...usuario.toJSON(),
        estadisticas: {
          ...estadisticas,
          dias_trabajados: parseInt(result.rows[0].dias_trabajados) || 0,
          venta_promedio:
            estadisticas.total_ventas > 0
              ? estadisticas.total_ventas_monto / estadisticas.total_ventas
              : 0,
        },
        permisos: {
          puede_administrar: usuario.esAdministrador(),
          es_gerente_superior: usuario.esGerenteOSuperior(),
          roles_permitidos: usuario.getRolesAsignables(),
        },
      };

      return responseHelper.success(res, profileInfo);
    } catch (error) {
      logger.error("Error en authController.getProfile", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
      });
      return responseHelper.error(res, "Error obteniendo perfil", 500, error);
    }
  },

  async updateProfile(req, res) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const { nombre, correo } = req.body;
      const usuarioId = req.user.id_usuario;

      const updates = {};
      if (nombre !== undefined) updates.nombre = helpers.sanitizeInput(nombre);
      if (correo !== undefined) updates.correo = correo.toLowerCase();

      if (Object.keys(updates).length === 0) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          "No se proporcionaron campos para actualizar",
          400
        );
      }

      // Verificar si el nuevo correo ya existe (si se está actualizando)
      if (updates.correo) {
        const correoExistente = await client.query(
          "SELECT id_usuario FROM usuarios WHERE correo = $1 AND id_usuario != $2",
          [updates.correo, usuarioId]
        );

        if (correoExistente.rows.length > 0) {
          await client.query("ROLLBACK");
          return responseHelper.conflict(
            res,
            "Ya existe un usuario con ese correo electrónico"
          );
        }
      }

      const result = await client.query(
        `UPDATE usuarios SET ${Object.keys(updates)
          .map((key, i) => `${key} = $${i + 1}`)
          .join(", ")}, actualizado_en = NOW() 
                 WHERE id_usuario = $${Object.keys(updates).length + 1} 
                 RETURNING id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login`,
        [...Object.values(updates), usuarioId]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return responseHelper.notFound(res, "Usuario");
      }

      await client.query("COMMIT");

      const usuarioActualizado = Usuario.fromDatabaseRow(result.rows[0]);

      logger.audit("Perfil actualizado", usuarioId, "UPDATE_PROFILE", {
        campos_actualizados: Object.keys(updates),
      });

      return responseHelper.success(
        res,
        usuarioActualizado.toJSON(),
        "Perfil actualizado exitosamente"
      );
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error en authController.updateProfile", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
      });
      return responseHelper.error(res, "Error actualizando perfil", 500, error);
    } finally {
      client.release();
    }
  },

  async getUsers(req, res) {
    const client = await db.getClient();
    try {
      const { page = 1, limit = 20, rol, activo } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const whereConditions = [];
      const params = [];
      let paramIndex = 1;

      if (rol) {
        whereConditions.push(`rol = $${paramIndex}`);
        params.push(rol);
        paramIndex++;
      }

      if (activo !== undefined) {
        whereConditions.push(`activo = $${paramIndex}`);
        params.push(activo === "true");
        paramIndex++;
      }

      const whereSQL = whereConditions.length
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

      // Obtener usuarios
      const usersResult = await client.query(
        `SELECT id_usuario, nombre, correo, rol, activo, creado_en, ultimo_login 
                 FROM usuarios 
                 ${whereSQL}
                 ORDER BY creado_en DESC 
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, parseInt(limit), offset]
      );

      // Obtener total
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM usuarios ${whereSQL}`,
        params
      );

      const usuarios = usersResult.rows.map((row) =>
        Usuario.fromDatabaseRow(row)
      );
      const total = parseInt(countResult.rows[0].total);

      return responseHelper.success(res, {
        usuarios: usuarios.map((u) => u.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      logger.error("Error en authController.getUsers", {
        error: error.message,
        usuario: req.user?.id_usuario,
      });
      return responseHelper.error(res, "Error obteniendo usuarios", 500, error);
    } finally {
      client.release();
    }
  },

  async updateUserStatus(req, res) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const { id } = req.params;
      const { activo } = req.body;

      if (activo === undefined) {
        await client.query("ROLLBACK");
        return responseHelper.error(res, 'El campo "activo" es requerido', 400);
      }

      // No permitir desactivarse a sí mismo
      if (parseInt(id) === parseInt(req.user.id_usuario) && !activo) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          "No puedes desactivar tu propia cuenta",
          400
        );
      }

      const result = await client.query(
        "UPDATE usuarios SET activo = $1, actualizado_en = NOW() WHERE id_usuario = $2 RETURNING id_usuario, nombre, correo, rol, activo",
        [activo, id]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return responseHelper.notFound(res, "Usuario");
      }

      await client.query("COMMIT");

      const usuarioActualizado = Usuario.fromDatabaseRow(result.rows[0]);

      logger.audit(
        "Estado de usuario actualizado",
        req.user.id_usuario,
        "UPDATE_USER_STATUS",
        {
          usuarioId: id,
          nuevoEstado: activo,
          actualizadoPor: req.user.id_usuario,
        }
      );

      return responseHelper.success(
        res,
        usuarioActualizado.toJSON(),
        `Usuario ${activo ? "activado" : "desactivado"} exitosamente`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error en authController.updateUserStatus", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
        usuarioObjetivo: req.params.id,
      });
      return responseHelper.error(
        res,
        "Error actualizando estado de usuario",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async updateUserRole(req, res) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const { id } = req.params;
      const { rol } = req.body;

      if (!rol) {
        await client.query("ROLLBACK");
        return responseHelper.error(res, 'El campo "rol" es requerido', 400);
      }

      const rolesValidos = ["admin", "gerente", "cajero", "dueno"];
      if (!rolesValidos.includes(rol)) {
        await client.query("ROLLBACK");
        return responseHelper.error(
          res,
          `Rol inválido. Válidos: ${rolesValidos.join(", ")}`,
          400
        );
      }

      // No permitir cambiar el rol de uno mismo a un rol inferior
      if (parseInt(id) === parseInt(req.user.id_usuario)) {
        const usuarioActual = await client.query(
          "SELECT rol FROM usuarios WHERE id_usuario = $1",
          [req.user.id_usuario]
        );

        if (usuarioActual.rows[0].rol === "dueno" && rol !== "dueno") {
          await client.query("ROLLBACK");
          return responseHelper.error(
            res,
            "No puedes cambiar tu propio rol de dueño",
            400
          );
        }
      }

      const result = await client.query(
        "UPDATE usuarios SET rol = $1, actualizado_en = NOW() WHERE id_usuario = $2 RETURNING id_usuario, nombre, correo, rol, activo",
        [rol, id]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return responseHelper.notFound(res, "Usuario");
      }

      await client.query("COMMIT");

      const usuarioActualizado = Usuario.fromDatabaseRow(result.rows[0]);

      logger.audit(
        "Rol de usuario actualizado",
        req.user.id_usuario,
        "UPDATE_USER_ROLE",
        {
          usuarioId: id,
          nuevoRol: rol,
          actualizadoPor: req.user.id_usuario,
        }
      );

      return responseHelper.success(
        res,
        usuarioActualizado.toJSON(),
        "Rol de usuario actualizado exitosamente"
      );
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error en authController.updateUserRole", {
        error: error.message,
        usuarioId: req.user?.id_usuario,
        usuarioObjetivo: req.params.id,
      });
      return responseHelper.error(
        res,
        "Error actualizando rol de usuario",
        500,
        error
      );
    } finally {
      client.release();
    }
  },
};

module.exports = authController;
