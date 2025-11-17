const authService = require("../services/authService");
const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Manejador de errores centralizado para el controlador
 */
const handleError = (res, error, context, requestData = {}) => {
  logger.error(`Error en ${context}`, {
    error: error.message,
    ...requestData,
  });

  if (error.status) {
    return responseHelper.error(res, error.message, error.status);
  }

  return responseHelper.error(res, `Error en ${context}`, 500);
};

const authController = {
  // ==================== AUTENTICACIÓN BÁSICA ====================

  async login(req, res) {
    try {
      const { correo, contrasena } = req.body;
      if (!correo || !contrasena) {
        return responseHelper.error(
          res,
          "Correo y contraseña son obligatorios",
          400
        );
      }

      const loginData = await authService.login(correo, contrasena);

      logger.audit("Login exitoso", loginData.usuario.id_usuario, "LOGIN", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        rol: loginData.usuario.rol,
      });

      return responseHelper.success(res, loginData, "Login exitoso");
    } catch (error) {
      // Los errores 401 (Credenciales inválidas, etc.) son manejados aquí
      logger.security("Intento de login fallido", {
        correo: req.body.correo,
        ip: req.ip,
        motivo: error.message,
      });
      return handleError(res, error, "authController.login", {
        correo: req.body.correo,
        ip: req.ip,
      });
    }
  },

  async getMe(req, res) {
    try {
      const userInfo = await authService.getMe(req.user.id_usuario);

      logger.api("Información de usuario obtenida", {
        usuarioId: req.user.id_usuario,
        rol: userInfo.rol,
      });

      return responseHelper.success(res, userInfo);
    } catch (error) {
      return handleError(res, error, "authController.getMe", {
        usuarioId: req.user?.id_usuario,
        ip: req.ip,
      });
    }
  },

  async changePassword(req, res) {
    try {
      const { contrasena_actual, nueva_contrasena } = req.body;
      if (!contrasena_actual || !nueva_contrasena) {
        return responseHelper.error(
          res,
          "Contraseña actual y nueva contraseña son obligatorias",
          400
        );
      }

      await authService.changePassword(
        req.user.id_usuario,
        contrasena_actual,
        nueva_contrasena
      );

      logger.audit(
        "Contraseña cambiada exitosamente",
        req.user.id_usuario,
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
      return handleError(res, error, "authController.changePassword", {
        usuarioId: req.user?.id_usuario,
        ip: req.ip,
      });
    }
  },

  // ==================== REGISTRO Y RECUPERACIÓN ====================

  async register(req, res) {
    try {
      const usuarioCreado = await authService.register(req.body);

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
        usuarioCreado,
        "Usuario registrado exitosamente",
        201
      );
    } catch (error) {
      return handleError(res, error, "authController.register", {
        datos: req.body,
        usuario: req.user?.id_usuario,
      });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { correo } = req.body;
      if (!correo) {
        return responseHelper.error(
          res,
          "El correo electrónico es requerido",
          400
        );
      }

      const resultado = await authService.forgotPassword(correo);

      logger.audit(
        "Solicitud de recuperación de contraseña",
        resultado.token ? "usuario_encontrado" : "correo_no_encontrado",
        "FORGOT_PASSWORD",
        {
          ip: req.ip,
          correo: correo,
        }
      );

      return responseHelper.success(res, resultado, resultado.mensaje);
    } catch (error) {
      return handleError(res, error, "authController.forgotPassword", {
        correo: req.body.correo,
        ip: req.ip,
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return responseHelper.error(
          res,
          "Token y nueva contraseña son requeridos",
          400
        );
      }

      await authService.resetPassword(token, newPassword);

      logger.audit(
        "Contraseña restablecida via token",
        "desconocido", // No tenemos el ID de usuario aquí, pero el servicio ya lo manejó
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
      return handleError(res, error, "authController.resetPassword", {
        ip: req.ip,
      });
    }
  },

  // ==================== FUNCIONALIDADES ADICIONALES ====================

  async checkPermission(req, res) {
    try {
      const { ruta, metodo = "GET" } = req.body;
      if (!ruta) {
        return responseHelper.error(res, "La ruta es requerida", 400);
      }

      const data = await authService.checkPermission(
        req.user.id_usuario,
        ruta,
        metodo
      );
      return responseHelper.success(res, data);
    } catch (error) {
      return handleError(res, error, "authController.checkPermission", {
        usuarioId: req.user?.id_usuario,
        ruta: req.body.ruta,
      });
    }
  },

  async refreshToken(req, res) {
    try {
      const tokenData = await authService.refreshToken(req.user.id_usuario);

      logger.audit("Token refrescado", req.user.id_usuario, "REFRESH_TOKEN", {
        ip: req.ip,
      });

      return responseHelper.success(
        res,
        tokenData,
        "Token refrescado exitosamente"
      );
    } catch (error) {
      return handleError(res, error, "authController.refreshToken", {
        usuarioId: req.user?.id_usuario,
      });
    }
  },

  async logout(req, res) {
    // El logout en JWT es del lado del cliente, el servidor solo registra
    logger.audit("Logout realizado", req.user.id_usuario, "LOGOUT", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    return responseHelper.success(res, null, "Logout exitoso");
  },

  // ==================== MÉTODOS ADICIONALES PARA LAS RUTAS ====================
  // (Estos son los métodos que tu 'usuarioController.js' probablemente maneja,
  // pero ya que están aquí, los refactorizamos)

  async getProfile(req, res) {
    try {
      const profileInfo = await authService.getProfile(req.user.id_usuario);
      return responseHelper.success(res, profileInfo);
    } catch (error) {
      return handleError(res, error, "authController.getProfile", {
        usuarioId: req.user?.id_usuario,
      });
    }
  },

  async updateProfile(req, res) {
    try {
      const { nombre, correo } = req.body;
      const usuarioActualizado = await authService.updateProfile(
        req.user.id_usuario,
        { nombre, correo }
      );

      logger.audit("Perfil actualizado", req.user.id_usuario, "UPDATE_PROFILE", {
        campos_actualizados: Object.keys(req.body),
      });

      return responseHelper.success(
        res,
        usuarioActualizado,
        "Perfil actualizado exitosamente"
      );
    } catch (error) {
      return handleError(res, error, "authController.updateProfile", {
        usuarioId: req.user?.id_usuario,
      });
    }
  },

  async getUsers(req, res) {
    try {
      const data = await authService.getUsers(req.query);
      return responseHelper.success(res, data);
    } catch (error) {
      return handleError(res, error, "authController.getUsers", {
        usuario: req.user?.id_usuario,
      });
    }
  },

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { activo } = req.body;
      if (activo === undefined) {
        return responseHelper.error(res, 'El campo "activo" es requerido', 400);
      }
      
      const usuarioActualizado = await authService.updateUserStatus(
        id,
        activo,
        req.user.id_usuario
      );

      logger.audit(
        "Estado de usuario actualizado",
        req.user.id_usuario,
        "UPDATE_USER_STATUS",
        {
          usuarioId: id,
          nuevoEstado: activo,
        }
      );

      return responseHelper.success(
        res,
        usuarioActualizado,
        `Usuario ${activo ? "activado" : "desactivado"} exitosamente`
      );
    } catch (error) {
      return handleError(res, error, "authController.updateUserStatus", {
        usuarioObjetivo: req.params.id,
      });
    }
  },

  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { rol } = req.body;

      const usuarioActualizado = await authService.updateUserRole(
        id,
        rol,
        req.user.id_usuario
      );

      logger.audit(
        "Rol de usuario actualizado",
        req.user.id_usuario,
        "UPDATE_USER_ROLE",
        {
          usuarioId: id,
          nuevoRol: rol,
        }
      );

      return responseHelper.success(
        res,
        usuarioActualizado,
        "Rol de usuario actualizado exitosamente"
      );
    } catch (error) {
      return handleError(res, error, "authController.updateUserRole", {
         usuarioObjetivo: req.params.id,
      });
    }
  },
};

module.exports = authController;