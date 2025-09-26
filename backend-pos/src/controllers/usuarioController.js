// src/controllers/usuarioController.js
const db = require("../config/database");
const Usuario = require("../models/Usuario");
const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const QueryBuilder = require("../utils/queryBuilder");

const usuarioController = {
  async getAll(req, res) {
    const client = await db.connect();
    try {
      const page = Math.max(parseInt(req.query.page || "1"), 1);
      const limit = Math.min(parseInt(req.query.limit || "20"), 100);
      const offset = (page - 1) * limit;
      
      const q = req.query.q ? QueryBuilder.sanitizeSearchTerm(req.query.q) : null;
      const rol = req.query.rol || null;

      const whereClauses = [];
      const params = [];
      let idx = 1;

      if (q) {
        whereClauses.push(`(nombre ILIKE $${idx} OR correo ILIKE $${idx})`);
        params.push(q);
        idx++;
      }
      if (rol) {
        whereClauses.push(`rol = $${idx}`);
        params.push(rol);
        idx++;
      }

      const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

      // Obtener total
      const countRes = await client.query(`SELECT COUNT(*)::int AS total FROM usuarios ${whereSQL}`, params);
      const total = countRes.rows[0].total;

      // Obtener datos
      params.push(limit, offset);
      const dataRes = await client.query(
        `SELECT id_usuario, nombre, correo, rol, activo, creado_en
         FROM usuarios
         ${whereSQL}
         ORDER BY creado_en DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        params
      );

      // ✅ USAR MODELO para transformar los resultados
      const usuarios = dataRes.rows.map(row => Usuario.fromDatabaseRow(row));
      
      // ✅ Usar métodos del modelo para enriquecer la respuesta
      const usuariosConInfo = usuarios.map(usuario => ({
        ...usuario.toJSON(),
        es_administrador: usuario.esAdministrador(),
        puede_asignar_roles: usuario.getRolesAsignables().length > 0
      }));

      logger.api("Listado de usuarios obtenido exitosamente", {
        total: total,
        page: page,
        limit: limit,
        resultados: usuarios.length,
        usuarioConsulta: req.user?.id_usuario
      });

      return responseHelper.success(res, {
        data: usuariosConInfo,
        meta: { total, page, limit, pages: Math.ceil(total / limit) }
      });

    } catch (error) {
      logger.error("Error en usuarioController.getAll", error);
      return responseHelper.error(res, "Error obteniendo usuarios", 500, error);
    } finally {
      client.release();
    }
  },

  async create(req, res) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const { nombre, correo, contrasena, rol } = req.body;
      
      // ✅ USAR VALIDACIÓN DEL MODELO
      const validationErrors = Usuario.validate({ nombre, correo, contrasena, rol });
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // ✅ USAR MÉTODO ESTÁTICO PARA CREAR USUARIO
      const nuevoUsuario = await Usuario.crear(nombre, correo, contrasena, rol || "cajero");
      
      // Insertar en la base de datos
      const result = await client.query(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) 
         VALUES ($1, $2, $3, $4)
         RETURNING id_usuario, nombre, correo, rol, activo, creado_en`,
        [nuevoUsuario.nombre, nuevoUsuario.correo, nuevoUsuario.contrasena_hash, nuevoUsuario.rol]
      );

      await client.query('COMMIT');

      // ✅ CREAR INSTANCIA DEL MODELO CON LA RESPUESTA DE LA BD
      const usuarioCreado = Usuario.fromDatabaseRow(result.rows[0]);
      
      logger.audit("Usuario creado exitosamente", req.user?.id_usuario, "CREATE", {
        nuevoUsuarioId: usuarioCreado.id_usuario,
        rol: usuarioCreado.rol,
        correo: usuarioCreado.correo
      });

      return responseHelper.success(res, usuarioCreado.toJSON(), "Usuario creado exitosamente", 201);

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
      
      if (error.message.includes('obligatorio') || 
          error.message.includes('debe tener') || 
          error.message.includes('no es válido')) {
        return responseHelper.error(res, error.message, 400, error);
      }
      
      if (error.code === "23505") {
        return responseHelper.conflict(res, "El correo electrónico ya está registrado");
      }
      
      return responseHelper.error(res, "Error creando usuario", 500, error);
    } finally {
      client.release();
    }
  },

  async login(req, res) {
    // Este método iría en authController, pero lo muestro como ejemplo
    const { correo, contrasena } = req.body;
    
    try {
      const result = await db.query(
        'SELECT * FROM usuarios WHERE correo = $1 AND activo = true',
        [correo.toLowerCase()]
      );
      
      if (result.rowCount === 0) {
        return responseHelper.unauthorized(res, "Credenciales inválidas");
      }

      // ✅ USAR MODELO Y SUS MÉTODOS
      const usuario = Usuario.fromDatabaseRow(result.rows[0]);
      const contrasenaValida = await usuario.verificarContrasena(contrasena);
      
      if (!contrasenaValida) {
        return responseHelper.unauthorized(res, "Credenciales inválidas");
      }

      // Generar token JWT (esto iría en authController)
      const token = generarToken(usuario);
      
      return responseHelper.success(res, {
        usuario: usuario.toJSON(),
        token: token
      }, "Login exitoso");

    } catch (error) {
      logger.error("Error en proceso de login", error);
      return responseHelper.error(res, "Error en el login", 500, error);
    }
  }
};

module.exports = usuarioController;