// src/controllers/usuarioController.js - Refactorizado

const usuarioService = require('../services/usuarioService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesita: db, Usuario, QueryBuilder, helpers

/**
 * Manejador de errores centralizado
 */
const handleError = (res, error, context, requestData = {}) => {
    logger.error(`Error en ${context}`, {
        error: error.message,
        details: error.details,
        ...requestData,
    });
    
    if (error.message === 'ID inválido' || error.message.includes("inválido")) {
         return responseHelper.error(res, error.message, 400);
    }
    if (error.status) { // Errores de negocio (400, 401, 403, 404, 409)
        if (error.status === 401) return responseHelper.unauthorized(res, error.message);
        if (error.status === 403) return responseHelper.forbidden(res, error.message);
        if (error.status === 404) return responseHelper.notFound(res, error.message);
        if (error.status === 409) return responseHelper.conflict(res, error.message);
        return responseHelper.error(res, error.message, error.status, error.details || error);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};


const usuarioController = {

    async getAll(req, res) {
        try {
            const data = await usuarioService.getAllUsuarios(req.query);
            
            logger.api("Listado de usuarios obtenido exitosamente", {
                total: data.pagination.total,
                page: data.pagination.page,
                limit: data.pagination.limit,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'usuarioController.getAll', { 
                query: req.query, 
                user: req.user?.id_usuario 
            });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const includeStats = req.query.includeStats === 'true';
            const usuario = await usuarioService.getUsuarioById(id, includeStats);
            
            logger.api("Usuario obtenido por ID", {
                usuarioId: id,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, usuario);

        } catch (error) {
            return handleError(res, error, 'usuarioController.getById', { 
                id: req.params.id, 
                user: req.user?.id_usuario 
            });
        }
    },

    async create(req, res) {
        try {
            const usuarioCreado = await usuarioService.createUsuario(req.body);
            
            logger.audit("Usuario creado exitosamente", req.user?.id_usuario, "CREATE", {
                nuevoUsuarioId: usuarioCreado.id_usuario,
                rol: usuarioCreado.rol,
                correo: usuarioCreado.correo
            });

            return responseHelper.success(res, 
                usuarioCreado, 
                "Usuario creado exitosamente", 
                201
            );

        } catch (error) {
            return handleError(res, error, 'usuarioController.create', { 
                body: req.body, 
                user: req.user?.id_usuario 
            });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const usuarioActualizado = await usuarioService.updateUsuario(id, req.body);

            logger.audit("Usuario actualizado", req.user?.id_usuario, "UPDATE", {
                usuarioId: id,
                campos_actualizados: Object.keys(req.body)
            });

            return responseHelper.success(res, 
                usuarioActualizado, 
                "Usuario actualizado exitosamente"
            );

        } catch (error) {
            return handleError(res, error, 'usuarioController.update', { 
                id: req.params.id, 
                body: req.body, 
                user: req.user?.id_usuario 
            });
        }
    },

    async setActive(req, res) {
        try {
            const { id } = req.params;
            const { activo } = req.body;

            if (activo === undefined) {
                return responseHelper.error(res, 'El campo "activo" es requerido', 400);
            }
            
            const usuarioActualizado = await usuarioService.setUsuarioActivo(id, activo, req.user.id_usuario);
            
            logger.audit("Estado de usuario actualizado", req.user?.id_usuario, "UPDATE", {
                usuarioId: id,
                nuevoEstado: usuarioActualizado.activo ? 'activado' : 'desactivado'
            });

            return responseHelper.success(res, 
                usuarioActualizado, 
                `Usuario ${usuarioActualizado.activo ? 'activado' : 'desactivado'} exitosamente`
            );

        } catch (error) {
            return handleError(res, error, 'usuarioController.setActive', { 
                id: req.params.id, 
                body: req.body, 
                user: req.user?.id_usuario 
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const { modo, nombre, ventas_asociadas } = await usuarioService.deleteUsuario(id, req.user.id_usuario);

            if (modo === 'desactivado') {
                logger.audit("Usuario desactivado (tenía ventas asociadas)", req.user?.id_usuario, "UPDATE", {
                    usuarioId: id,
                    ventas_asociadas: ventas_asociadas
                });
                return responseHelper.success(res, null, 'Usuario desactivado (tenía ventas asociadas)');
            } else {
                logger.audit("Usuario eliminado", req.user?.id_usuario, "DELETE", {
                    usuarioId: id,
                    nombre: nombre
                });
                return responseHelper.success(res, null, 'Usuario eliminado exitosamente');
            }

        } catch (error) {
            return handleError(res, error, 'usuarioController.delete', { 
                id: req.params.id, 
                user: req.user?.id_usuario 
            });
        }
    },

    async changePassword(req, res) {
        try {
            const { id } = req.params;
            const { contrasena_actual, nueva_contrasena } = req.body;
            
            // Pasamos el objeto 'req.user' completo para la validación de permisos
            const { usuarioId, cambio_propio } = await usuarioService.changeUsuarioPassword(
                id, 
                { contrasena_actual, nueva_contrasena }, 
                req.user 
            );

            logger.audit("Contraseña de usuario cambiada", req.user?.id_usuario, "UPDATE", {
                usuarioId: usuarioId,
                cambio_propio: cambio_propio
            });

            return responseHelper.success(res, null, 'Contraseña cambiada exitosamente');

        } catch (error) {
            return handleError(res, error, 'usuarioController.changePassword', { 
                id: req.params.id, 
                user: req.user?.id_usuario 
            });
        }
    }
};

module.exports = usuarioController;