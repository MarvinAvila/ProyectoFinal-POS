const jwt = require('jsonwebtoken');
const db = require('../config/database');
const Usuario = require('../models/Usuario');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';
const JWT_EXPIRES_IN = '24h';

// Helper para generar token JWT
const generarToken = (usuario) => {
    return jwt.sign(
        { 
            id_usuario: usuario.id_usuario, 
            nombre: usuario.nombre, 
            correo: usuario.correo, 
            rol: usuario.rol 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const authController = {
    // Login
    async login(req, res) {
        const client = await db.connect();
        try {
            const { correo, contrasena } = req.body;

            // Validaciones básicas
            if (!correo || !contrasena) {
                return responseHelper.error(res, 'Correo y contraseña son obligatorios', 400);
            }

            // Buscar usuario en la base de datos
            const result = await client.query(
                'SELECT * FROM usuarios WHERE correo = $1',
                [correo.toLowerCase().trim()]
            );

            if (result.rowCount === 0) {
                logger.security('Intento de login con correo no registrado', {
                    correo: correo,
                    ip: req.ip
                });
                return responseHelper.unauthorized(res, 'Credenciales inválidas');
            }

            // ✅ USAR MODELO DE USUARIO
            const usuario = Usuario.fromDatabaseRow(result.rows[0]);

            // Verificar si está activo
            if (!usuario.activo) {
                logger.security('Intento de login de usuario inactivo', {
                    usuarioId: usuario.id_usuario,
                    correo: usuario.correo,
                    ip: req.ip
                });
                return responseHelper.unauthorized(res, 'Usuario inactivo. Contacta al administrador.');
            }

            // ✅ USAR MÉTODO DEL MODELO para verificar contraseña
            const contrasenaValida = await usuario.verificarContrasena(contrasena);
            
            if (!contrasenaValida) {
                logger.security('Intento de login con contraseña incorrecta', {
                    usuarioId: usuario.id_usuario,
                    correo: usuario.correo,
                    ip: req.ip
                });
                return responseHelper.unauthorized(res, 'Credenciales inválidas');
            }

            // Generar token
            const token = generarToken(usuario);

            logger.audit('Login exitoso', usuario.id_usuario, 'LOGIN', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return responseHelper.success(res, {
                user: usuario.toJSON(), // ✅ Usar método toJSON() para excluir datos sensibles
                token: token,
                expiresIn: JWT_EXPIRES_IN,
                permisos: {
                    puede_administrar: usuario.esAdministrador(),
                    roles_asignables: usuario.getRolesAsignables()
                }
            }, 'Login exitoso');

        } catch (error) {
            logger.error('Error en authController.login', {
                error: error.message,
                correo: req.body.correo,
                ip: req.ip
            });
            
            return responseHelper.error(res, 'Error en el servidor durante el login', 500, error);
        } finally {
            client.release();
        }
    },

    // Verificar token (me) - Obtener información del usuario actual
    async getMe(req, res) {
        const client = await db.connect();
        try {
            // El usuario ya viene del middleware de autenticación (req.user)
            // pero obtenemos la información fresca de la base de datos
            const result = await client.query(
                'SELECT id_usuario, nombre, correo, rol, activo, creado_en FROM usuarios WHERE id_usuario = $1 AND activo = true',
                [req.user.id_usuario]
            );

            if (result.rowCount === 0) {
                logger.security('Usuario no encontrado al verificar token', {
                    usuarioId: req.user.id_usuario,
                    ip: req.ip
                });
                return responseHelper.unauthorized(res, 'Usuario no encontrado o inactivo');
            }

            // ✅ USAR MODELO DE USUARIO
            const usuario = Usuario.fromDatabaseRow(result.rows[0]);

            // Enriquecer respuesta con información útil
            const userInfo = {
                ...usuario.toJSON(),
                permisos: {
                    puede_administrar: usuario.esAdministrador(),
                    es_gerente_superior: usuario.esGerenteOSuperior(),
                    roles_asignables: usuario.getRolesAsignables()
                },
                preferencias: {
                    // Aquí podrías agregar preferencias del usuario en el futuro
                    tema: 'claro', // ejemplo
                    idioma: 'es'   // ejemplo
                }
            };

            logger.api('Información de usuario obtenida', {
                usuarioId: usuario.id_usuario,
                rol: usuario.rol
            });

            return responseHelper.success(res, userInfo);

        } catch (error) {
            logger.error('Error en authController.getMe', {
                error: error.message,
                usuarioId: req.user?.id_usuario,
                ip: req.ip
            });
            
            return responseHelper.error(res, 'Error obteniendo información del usuario', 500, error);
        } finally {
            client.release();
        }
    },

    // Cambiar contraseña
    async changePassword(req, res) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const { currentPassword, newPassword } = req.body;

            // Validaciones
            if (!currentPassword || !newPassword) {
                throw new Error('Contraseña actual y nueva contraseña son obligatorias');
            }

            // Obtener usuario completo de la base de datos
            const result = await client.query(
                'SELECT * FROM usuarios WHERE id_usuario = $1',
                [req.user.id_usuario]
            );

            if (result.rowCount === 0) {
                throw new Error('Usuario no encontrado');
            }

            // ✅ USAR MODELO DE USUARIO
            const usuario = Usuario.fromDatabaseRow(result.rows[0]);

            // Verificar contraseña actual usando el modelo
            const contrasenaActualValida = await usuario.verificarContrasena(currentPassword);
            
            if (!contrasenaActualValida) {
                logger.security('Intento de cambio de contraseña con contraseña actual incorrecta', {
                    usuarioId: usuario.id_usuario,
                    ip: req.ip
                });
                throw new Error('Contraseña actual incorrecta');
            }

            // Validar nueva contraseña usando el modelo
            const validationErrors = Usuario.validate({ 
                contrasena: newPassword 
            }, true); // true = es actualización
            
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // ✅ USAR MÉTODO DEL MODELO para actualizar contraseña
            const nuevoHash = await usuario.actualizarContrasena(newPassword);

            // Actualizar en base de datos
            await client.query(
                'UPDATE usuarios SET contrasena_hash = $1, creado_en = NOW() WHERE id_usuario = $2',
                [nuevoHash, usuario.id_usuario]
            );

            await client.query('COMMIT');

            logger.audit('Contraseña cambiada exitosamente', usuario.id_usuario, 'UPDATE_PASSWORD', {
                ip: req.ip,
                cambioPor: 'usuario' // o 'admin' si es un administrador cambiando la contraseña de otro
            });

            return responseHelper.success(res, null, 'Contraseña actualizada correctamente');

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error('Error en authController.changePassword', {
                error: error.message,
                usuarioId: req.user?.id_usuario,
                ip: req.ip
            });
            
            if (error.message.includes('obligatorias') || 
                error.message.includes('incorrecta') ||
                error.message.includes('debe tener')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, 'Error cambiando contraseña', 500, error);
        } finally {
            client.release();
        }
    },

    // Verificar permisos para una ruta específica
    async checkPermission(req, res) {
        try {
            const { ruta } = req.body;
            
            if (!ruta) {
                return responseHelper.error(res, 'La ruta es requerida', 400);
            }

            // Obtener usuario actual
            const result = await db.query(
                'SELECT * FROM usuarios WHERE id_usuario = $1',
                [req.user.id_usuario]
            );

            if (result.rowCount === 0) {
                return responseHelper.unauthorized(res, 'Usuario no encontrado');
            }

            // ✅ USAR MODELO DE USUARIO
            const usuario = Usuario.fromDatabaseRow(result.rows[0]);
            const tienePermiso = usuario.puedeAccederA(ruta);

            return responseHelper.success(res, {
                tienePermiso: tienePermiso,
                usuario: usuario.getPerfilPublico(),
                rutaSolicitada: ruta,
                rol: usuario.rol
            });

        } catch (error) {
            logger.error('Error en authController.checkPermission', {
                error: error.message,
                usuarioId: req.user?.id_usuario,
                ruta: req.body.ruta
            });
            
            return responseHelper.error(res, 'Error verificando permisos', 500, error);
        }
    },

    // Refresh token (opcional - para implementar renovación de tokens)
    async refreshToken(req, res) {
        try {
            // Obtener usuario actual
            const result = await db.query(
                'SELECT id_usuario, nombre, correo, rol, activo FROM usuarios WHERE id_usuario = $1 AND activo = true',
                [req.user.id_usuario]
            );

            if (result.rowCount === 0) {
                return responseHelper.unauthorized(res, 'Usuario no encontrado o inactivo');
            }

            const usuario = Usuario.fromDatabaseRow(result.rows[0]);
            
            // Generar nuevo token
            const newToken = generarToken(usuario);

            logger.audit('Token refrescado', usuario.id_usuario, 'REFRESH_TOKEN', {
                ip: req.ip
            });

            return responseHelper.success(res, {
                token: newToken,
                expiresIn: JWT_EXPIRES_IN,
                user: usuario.toJSON()
            }, 'Token refrescado exitosamente');

        } catch (error) {
            logger.error('Error en authController.refreshToken', {
                error: error.message,
                usuarioId: req.user?.id_usuario
            });
            
            return responseHelper.error(res, 'Error refrescando token', 500, error);
        }
    },

    // Logout (registrar en logs aunque sea stateless)
    async logout(req, res) {
        try {
            logger.audit('Logout realizado', req.user.id_usuario, 'LOGOUT', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return responseHelper.success(res, null, 'Logout exitoso');

        } catch (error) {
            logger.error('Error en authController.logout', {
                error: error.message,
                usuarioId: req.user?.id_usuario
            });
            
            return responseHelper.error(res, 'Error en el logout', 500, error);
        }
    }
};

module.exports = authController;