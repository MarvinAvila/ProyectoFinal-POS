const jwt = require('jsonwebtoken');
const db = require('../config/database');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_jwt_muy_segura";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const authMiddleware = {
    /**
     * Middleware para verificar token JWT
     * Extrae y valida el token del header Authorization
     */
    verifyToken: async (req, res, next) => {
        const client = await db.getClient();
        try {
            // Obtener token del header
            const authHeader = req.header('Authorization');
            
            if (!authHeader) {
                logger.security('Intento de acceso sin token', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    ruta: req.originalUrl
                });
                return responseHelper.unauthorized(res, 'Token de acceso requerido');
            }

            // Extraer token (formato: Bearer <token>)
            const token = authHeader.startsWith('Bearer ') 
                ? authHeader.slice(7) 
                : authHeader;

            if (!token) {
                return responseHelper.unauthorized(res, 'Formato de token inválido. Use: Bearer <token>');
            }

            // Verificar token JWT
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Verificar que el usuario existe y está activo en la base de datos
            const usuarioResult = await client.query(
                `SELECT id_usuario, nombre, correo, rol, activo, ultimo_login 
                 FROM usuarios 
                 WHERE id_usuario = $1 AND activo = true`,
                [decoded.id_usuario]
            );

            if (usuarioResult.rows.length === 0) {
                logger.security('Token válido pero usuario no encontrado o inactivo', {
                    usuarioId: decoded.id_usuario,
                    ip: req.ip,
                    ruta: req.originalUrl
                });
                return responseHelper.unauthorized(res, 'Usuario no encontrado o inactivo');
            }

            const usuario = usuarioResult.rows[0];

            // Añadir información del usuario al request
            req.user = {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                activo: usuario.activo,
                ultimo_login: usuario.ultimo_login,
                token: token // Para posible invalidación futura
            };

            logger.api('Token verificado exitosamente', {
                usuarioId: usuario.id_usuario,
                rol: usuario.rol,
                ruta: req.originalUrl
            });

            next();

        } catch (error) {
            // Manejar diferentes tipos de errores de JWT
            if (error.name === 'TokenExpiredError') {
                logger.security('Token expirado', {
                    ip: req.ip,
                    ruta: req.originalUrl,
                    error: error.message
                });
                return responseHelper.unauthorized(res, 'Token expirado. Por favor, inicie sesión nuevamente.');
            }

            if (error.name === 'JsonWebTokenError') {
                logger.security('Token JWT inválido', {
                    ip: req.ip,
                    ruta: req.originalUrl,
                    error: error.message
                });
                return responseHelper.unauthorized(res, 'Token inválido.');
            }

            if (error.name === 'NotBeforeError') {
                logger.security('Token no activo aún', {
                    ip: req.ip,
                    ruta: req.originalUrl,
                    error: error.message
                });
                return responseHelper.unauthorized(res, 'Token no activo.');
            }

            logger.error('Error inesperado en verifyToken', {
                error: error.message,
                ip: req.ip,
                ruta: req.originalUrl
            });
            
            return responseHelper.error(res, 'Error de autenticación', 500, error);
        } finally {
            client.release();
        }
    },

    /**
     * Middleware para verificar roles específicos
     * Uso: authMiddleware.requireRole(['admin', 'dueno'])
     */
    requireRole: (rolesPermitidos) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return responseHelper.unauthorized(res, 'Autenticación requerida');
                }

                // Convertir a array si es un string único
                const rolesArray = Array.isArray(rolesPermitidos) 
                    ? rolesPermitidos 
                    : [rolesPermitidos];

                // Verificar si el usuario tiene uno de los roles permitidos
                if (!rolesArray.includes(req.user.rol)) {
                    logger.security('Intento de acceso no autorizado por rol', {
                        usuarioId: req.user.id_usuario,
                        usuario: req.user.nombre,
                        rolActual: req.user.rol,
                        rolesRequeridos: rolesArray,
                        ruta: req.originalUrl,
                        metodo: req.method,
                        ip: req.ip
                    });
                    
                    return responseHelper.forbidden(res, 
                        `No tienes permisos para acceder a esta ruta. Rol requerido: ${rolesArray.join(', ')}`
                    );
                }

                logger.api('Acceso autorizado por rol', {
                    usuarioId: req.user.id_usuario,
                    rol: req.user.rol,
                    ruta: req.originalUrl
                });

                next();
            } catch (error) {
                logger.error('Error en middleware requireRole', {
                    error: error.message,
                    usuario: req.user,
                    ruta: req.originalUrl
                });
                return responseHelper.error(res, 'Error de autorización', 500, error);
            }
        };
    },

    /**
     * Middleware para verificar si el usuario es el dueño del recurso o tiene rol superior
     * Uso: authMiddleware.requireOwnershipOrRole('admin')
     */
    requireOwnershipOrRole: (rolesPermitidos) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return responseHelper.unauthorized(res, 'Autenticación requerida');
                }

                const resourceUserId = parseInt(req.params.userId || req.params.id);
                const rolesArray = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];

                // Permitir si es el dueño del recurso O tiene un rol permitido
                if (req.user.id_usuario === resourceUserId || rolesArray.includes(req.user.rol)) {
                    next();
                } else {
                    logger.security('Intento de acceso a recurso de otro usuario', {
                        usuarioId: req.user.id_usuario,
                        recursoUserId: resourceUserId,
                        ruta: req.originalUrl,
                        ip: req.ip
                    });
                    return responseHelper.forbidden(res, 'No tienes permisos para acceder a este recurso');
                }
            } catch (error) {
                logger.error('Error en middleware requireOwnershipOrRole', error);
                return responseHelper.error(res, 'Error de autorización', 500, error);
            }
        };
    },

    /**
     * Middleware para verificar permisos específicos basados en rol y acción
     * Uso: authMiddleware.requirePermission('usuarios', 'write')
     */
    requirePermission: (recurso, accion) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return responseHelper.unauthorized(res, 'Autenticación requerida');
                }

                // Definir matriz de permisos por rol
                const permisos = {
                    dueno: {
                        usuarios: ['read', 'write', 'delete'],
                        productos: ['read', 'write', 'delete'],
                        ventas: ['read', 'write', 'delete'],
                        reportes: ['read', 'write', 'delete'],
                        configuracion: ['read', 'write', 'delete']
                    },
                    admin: {
                        usuarios: ['read', 'write'],
                        productos: ['read', 'write', 'delete'],
                        ventas: ['read', 'write', 'delete'],
                        reportes: ['read', 'write'],
                        configuracion: ['read']
                    },
                    gerente: {
                        usuarios: ['read'],
                        productos: ['read', 'write'],
                        ventas: ['read', 'write'],
                        reportes: ['read'],
                        configuracion: ['read']
                    },
                    cajero: {
                        usuarios: ['read'],
                        productos: ['read'],
                        ventas: ['read', 'write'],
                        reportes: ['read'],
                        configuracion: []
                    }
                };

                const rolPermisos = permisos[req.user.rol] || {};
                const permisosRecurso = rolPermisos[recurso] || [];

                if (!permisosRecurso.includes(accion)) {
                    logger.security('Intento de acceso sin permiso específico', {
                        usuarioId: req.user.id_usuario,
                        rol: req.user.rol,
                        recurso: recurso,
                        accion: accion,
                        ruta: req.originalUrl,
                        ip: req.ip
                    });
                    return responseHelper.forbidden(res, 
                        `No tienes permiso para ${accion} en ${recurso}`
                    );
                }

                next();
            } catch (error) {
                logger.error('Error en middleware requirePermission', error);
                return responseHelper.error(res, 'Error de autorización', 500, error);
            }
        };
    },

    /**
     * Middleware para verificar si el usuario está activo
     * (redundante con verifyToken pero útil para rutas no protegidas por token)
     */
    requireActive: async (req, res, next) => {
        const client = await db.getClient();
        try {
            if (!req.user || !req.user.id_usuario) {
                return responseHelper.unauthorized(res, 'Autenticación requerida');
            }

            const usuarioResult = await client.query(
                'SELECT activo FROM usuarios WHERE id_usuario = $1',
                [req.user.id_usuario]
            );

            if (usuarioResult.rows.length === 0 || !usuarioResult.rows[0].activo) {
                logger.security('Intento de acceso de usuario inactivo', {
                    usuarioId: req.user.id_usuario,
                    ruta: req.originalUrl,
                    ip: req.ip
                });
                return responseHelper.unauthorized(res, 'Usuario inactivo. Contacte al administrador.');
            }

            next();
        } catch (error) {
            logger.error('Error en middleware requireActive', error);
            return responseHelper.error(res, 'Error de autorización', 500, error);
        } finally {
            client.release();
        }
    },

    /**
     * Middleware para logging de todas las peticiones autenticadas
     */
    requestLogger: (req, res, next) => {
        const start = Date.now();
        
        // Interceptar el método end de response para calcular duración
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            const duration = Date.now() - start;
            
            if (req.user) {
                logger.api('Petición autenticada', {
                    usuarioId: req.user.id_usuario,
                    metodo: req.method,
                    ruta: req.originalUrl,
                    statusCode: res.statusCode,
                    duracion: `${duration}ms`,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });
            }

            originalEnd.call(this, chunk, encoding);
        };

        next();
    },

    /**
     * Middleware para validar API key (para integraciones externas)
     */
    validateApiKey: (req, res, next) => {
        const apiKey = req.header('X-API-Key') || req.query.api_key;
        
        if (!apiKey) {
            return responseHelper.unauthorized(res, 'API key requerida');
        }

        // Verificar API key (en producción, esto debería consultar una base de datos)
        const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
        
        if (!validApiKeys.includes(apiKey)) {
            logger.security('Intento de acceso con API key inválida', {
                apiKey: apiKey,
                ruta: req.originalUrl,
                ip: req.ip
            });
            return responseHelper.unauthorized(res, 'API key inválida');
        }

        // Añadir contexto de API key al request
        req.apiContext = {
            type: 'api_key',
            key: apiKey
        };

        next();
    },

    /**
     * Middleware para rate limiting básico
     */
    rateLimit: (maxRequests = 100, windowMs = 900000) => { // 100 requests por 15 minutos por defecto
        const requests = new Map();

        return (req, res, next) => {
            const key = req.user ? req.user.id_usuario : req.ip;
            const now = Date.now();
            const windowStart = now - windowMs;

            // Limpiar requests antiguos
            if (requests.has(key)) {
                requests.set(key, requests.get(key).filter(time => time > windowStart));
            }

            const userRequests = requests.get(key) || [];
            
            if (userRequests.length >= maxRequests) {
                logger.security('Límite de rate limit excedido', {
                    key: key,
                    requests: userRequests.length,
                    maxRequests: maxRequests,
                    ruta: req.originalUrl,
                    ip: req.ip
                });
                return responseHelper.error(res, 'Demasiadas peticiones. Por favor, espere.', 429);
            }

            userRequests.push(now);
            requests.set(key, userRequests);

            // Añadir headers informativos
            res.set({
                'X-RateLimit-Limit': maxRequests,
                'X-RateLimit-Remaining': maxRequests - userRequests.length,
                'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
            });

            next();
        };
    }
};

module.exports = authMiddleware;