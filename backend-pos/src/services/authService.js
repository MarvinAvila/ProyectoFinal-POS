const bcrypt = require("bcrypt");
const db = require("../config/database");
const Usuario = require("../models/Usuario");
const usuarioRepository = require("../repositories/usuarioRepository");
const helpers = require("../utils/helpers");
const {
  generarToken,
  generarTokenRecuperacion,
  BCRYPT_ROUNDS,
  JWT_EXPIRES_IN,
} = require("../utils/authUtils");

// Clase de error personalizada para la lógica de negocio
class BusinessError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const authService = {
  async login(correo, contrasena) {
    const usuario = await usuarioRepository.findByEmail(correo);

    if (!usuario) {
      throw new BusinessError("Credenciales inválidas", 401);
    }
    if (!usuario.activo) {
      throw new BusinessError(
        "Usuario inactivo. Contacta al administrador.",
        401
      );
    }

    const contrasenaValida = await usuario.validatePassword(contrasena);
    if (!contrasenaValida) {
      throw new BusinessError("Credenciales inválidas", 401);
    }

    const token = generarToken(usuario);
    usuarioRepository.updateLastLogin(usuario.id_usuario); // Fire-and-forget

    return {
      usuario: usuario.toJSON(),
      token: token,
      expiresIn: JWT_EXPIRES_IN,
      permisos: {
        puede_administrar: usuario.esAdministrador(),
        es_gerente_superior: usuario.esGerenteOSuperior(),
        roles_permitidos: usuario.getRolesAsignables(),
      },
    };
  },

  async getMe(id_usuario) {
    const usuario = await usuarioRepository.findActiveById(id_usuario);
    if (!usuario) {
      throw new BusinessError("Usuario no encontrado o inactivo", 401);
    }

    const estadisticas = await usuarioRepository.getEstadisticas(
      usuario.id_usuario
    );

    return {
      ...usuario.toJSON(),
      permisos: {
        puede_administrar: usuario.esAdministrador(),
        es_gerente_superior: usuario.esGerenteOSuperior(),
        roles_permitidos: usuario.getRolesAsignables(),
      },
      estadisticas: estadisticas,
    };
  },

  async changePassword(id_usuario, contrasena_actual, nueva_contrasena) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const usuario = await usuarioRepository.findById(id_usuario, client);
      if (!usuario) {
        throw new BusinessError("Usuario no encontrado", 404);
      }

      const contrasenaActualValida = await usuario.validatePassword(
        contrasena_actual
      );
      if (!contrasenaActualValida) {
        throw new BusinessError("Contraseña actual incorrecta", 401);
      }

      const validationErrors = Usuario.validarSoloContrasena(nueva_contrasena);
      if (validationErrors.length > 0) {
        throw new BusinessError(
          `Error en la nueva contraseña: ${validationErrors.join(", ")}`,
          400
        );
      }

      const nuevoHash = await bcrypt.hash(nueva_contrasena, BCRYPT_ROUNDS);
      await usuarioRepository.updatePassword(id_usuario, nuevoHash, client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error; // Re-lanza el error
    } finally {
      client.release();
    }
  },

  async register(registerData) {
    const { nombre, correo, contrasena, rol = "vendedor" } = registerData;
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const usuarioExistente = await usuarioRepository.findByEmail(correo);
      if (usuarioExistente) {
        throw new BusinessError(
          "Ya existe un usuario con ese correo electrónico",
          409
        );
      }

      const usuarioData = {
        nombre: helpers.sanitizeInput(nombre),
        correo: correo.toLowerCase(),
        contrasena: contrasena,
        rol: rol,
        activo: true,
        creado_en: new Date(),
      };

      const validationErrors = Usuario.validate(usuarioData);
      if (validationErrors.length > 0) {
        throw new BusinessError(
          `Errores de validación: ${validationErrors.join(", ")}`,
          400
        );
      }

      const contrasenaHash = await bcrypt.hash(contrasena, BCRYPT_ROUNDS);
      const usuarioCreado = await usuarioRepository.create(
        usuarioData,
        contrasenaHash,
        client
      );

      await client.query("COMMIT");
      return usuarioCreado.toJSON();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async forgotPassword(correo) {
    const usuario = await usuarioRepository.findByEmail(correo);

    if (usuario && usuario.activo) {
      const tokenRecuperacion = generarTokenRecuperacion();
      const expiracion = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora
      await usuarioRepository.updateRecoveryToken(
        usuario.id_usuario,
        tokenRecuperacion,
        expiracion
      );

      // Aquí iría la lógica de envío de email...
      // logger.info(`Enviando email de recuperación a ${correo} con token ${tokenRecuperacion}`);

      if (process.env.NODE_ENV === "development") {
        return {
          mensaje: "Token de recuperación generado (solo en desarrollo)",
          token: tokenRecuperacion,
        };
      }
    }
    // Por seguridad, siempre devolvemos un mensaje genérico
    return { mensaje: "Si el correo existe, se enviarán instrucciones" };
  },

  async resetPassword(token, newPassword) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const usuario = await usuarioRepository.findByRecoveryToken(token);
      if (!usuario) {
        throw new BusinessError("Token inválido o expirado", 400);
      }

      const passwordErrors = Usuario.validarSoloContrasena(newPassword);
      if (passwordErrors.length > 0) {
        throw new BusinessError(
          `Error en la contraseña: ${passwordErrors.join(", ")}`,
          400
        );
      }

      const nuevoHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await usuarioRepository.resetPassword(usuario.id_usuario, nuevoHash, client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async getProfile(id_usuario) {
    const profileData = await usuarioRepository.getProfile(id_usuario);
    if (!profileData) {
      throw new BusinessError("Usuario no encontrado", 404);
    }
    
    // El repo ya trae 'total_ventas', 'total_ventas_monto', 'dias_trabajados'
    const usuario = Usuario.fromDatabaseRow(profileData);
    const estadisticas = {
      total_ventas: parseInt(profileData.total_ventas) || 0,
      total_ventas_monto: parseFloat(profileData.total_ventas_monto) || 0,
      dias_trabajados: parseInt(profileData.dias_trabajados) || 0,
      // (Aquí podrías añadir las alertas si lo deseas, llamando a getEstadisticas)
    };

    return {
      ...usuario.toJSON(),
      estadisticas: {
        ...estadisticas,
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
  },

  async updateProfile(id_usuario, { nombre, correo }) {
    const updates = {};
    if (nombre !== undefined) updates.nombre = helpers.sanitizeInput(nombre);
    if (correo !== undefined) updates.correo = correo.toLowerCase();

    if (Object.keys(updates).length === 0) {
      throw new BusinessError(
        "No se proporcionaron campos para actualizar",
        400
      );
    }
    
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      
      if (updates.correo) {
        const correoExistente = await usuarioRepository.findByEmail(updates.correo);
        if (correoExistente && correoExistente.id_usuario !== id_usuario) {
          throw new BusinessError("Ya existe un usuario con ese correo electrónico", 409);
        }
      }

      const usuarioActualizado = await usuarioRepository.updateProfile(
        id_usuario,
        updates,
        client
      );

      await client.query("COMMIT");
      return usuarioActualizado.toJSON();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async getUsers(queryParams) {
    const { page = 1, limit = 20, rol, activo } = queryParams;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { usuarios, total } = await usuarioRepository.findAll(
      { rol, activo },
      { limit: parseInt(limit), offset }
    );

    return {
      usuarios: usuarios.map((u) => u.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  },

  async updateUserStatus(id, activo, adminId) {
    const idToUpdate = parseInt(id);
    if (idToUpdate === parseInt(adminId) && !activo) {
      throw new BusinessError("No puedes desactivar tu propia cuenta", 400);
    }
    
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const usuarioActualizado = await usuarioRepository.updateStatus(idToUpdate, activo, client);
      if (!usuarioActualizado) {
        throw new BusinessError("Usuario no encontrado", 404);
      }
      await client.query("COMMIT");
      return usuarioActualizado.toJSON();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async updateUserRole(id, rol, adminId) {
    const idToUpdate = parseInt(id);
    const rolesValidos = ["admin", "gerente", "cajero", "dueno"];
    if (!rol || !rolesValidos.includes(rol)) {
      throw new BusinessError(`Rol inválido. Válidos: ${rolesValidos.join(", ")}`, 400);
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      
      if (idToUpdate === parseInt(adminId)) {
        const adminUser = await usuarioRepository.findById(adminId, client);
        if (adminUser.rol === "dueno" && rol !== "dueno") {
          throw new BusinessError("No puedes cambiar tu propio rol de dueño", 400);
        }
      }
      
      const usuarioActualizado = await usuarioRepository.updateRole(idToUpdate, rol, client);
      if (!usuarioActualizado) {
        throw new BusinessError("Usuario no encontrado", 404);
      }
      
      await client.query("COMMIT");
      return usuarioActualizado.toJSON();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  
  async checkPermission(id_usuario, ruta, metodo) {
      const usuario = await usuarioRepository.findById(id_usuario);
      if (!usuario) {
          throw new BusinessError("Usuario no encontrado", 401);
      }
      // La lógica de permisos está en el modelo
      const tienePermiso = usuario.puedeAccederA(ruta, metodo);
      return {
        tienePermiso: tienePermiso,
        usuario: usuario.toJSON(),
        rutaSolicitada: ruta,
        metodo: metodo,
        rol: usuario.rol,
      };
  },
  
  async refreshToken(id_usuario) {
      const usuario = await usuarioRepository.findActiveById(id_usuario);
      if (!usuario) {
          throw new BusinessError("Usuario no encontrado o inactivo", 401);
      }
      
      const newToken = generarToken(usuario);
      return {
          token: newToken,
          expiresIn: JWT_EXPIRES_IN,
          usuario: usuario.toJSON(),
      };
  }
};

module.exports = authService;