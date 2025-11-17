// src/controllers/comprobanteController.js

const comprobanteService = require('../services/comprobanteService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesita: db, Comprobante, QueryBuilder

/**
 * Manejador de errores centralizado
 */
const handleError = (res, error, context, requestData = {}) => {
    logger.error(`Error en ${context}`, {
        error: error.message,
        ...requestData,
    });

    if (error.message.includes('inválido')) {
         return responseHelper.error(res, error.message, 400);
    }
    if (error.status) { // Errores de negocio (400, 404, 409)
        return responseHelper.error(res, error.message, error.status);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};

const comprobanteController = {
    
    async getAll(req, res) {
        try {
            const data = await comprobanteService.getAllComprobantes(req.query);

            logger.api("Listado de comprobantes obtenido", {
                total: data.pagination.total,
                filtros: req.query,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'comprobanteController.getAll', { query: req.query, usuario: req.user?.id_usuario });
        }
    },

    async getByVenta(req, res) {
        try {
            const { id_venta } = req.params;
            const comprobantes = await comprobanteService.getComprobantesByVenta(id_venta);

            logger.api("Comprobantes obtenidos por venta", {
                ventaId: id_venta,
                totalComprobantes: comprobantes.length,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, comprobantes);

        } catch (error) {
            return handleError(res, error, 'comprobanteController.getByVenta', { ventaId: req.params.id_venta, usuario: req.user?.id_usuario });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const comprobante = await comprobanteService.getComprobanteById(id);

            logger.api("Comprobante obtenido por ID", {
                comprobanteId: id,
                tipo: comprobante.tipo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, comprobante);

        } catch (error) {
            return handleError(res, error, 'comprobanteController.getById', { comprobanteId: req.params.id, usuario: req.user?.id_usuario });
        }
    },

    async getContenido(req, res) {
        try {
            const { id } = req.params;
            const comprobante = await comprobanteService.getComprobanteContenido(id);

            logger.api("Contenido de comprobante obtenido", {
                comprobanteId: id,
                tipo: comprobante.tipo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, comprobante);

        } catch (error) {
            return handleError(res, error, 'comprobanteController.getContenido', { comprobanteId: req.params.id, usuario: req.user?.id_usuario });
        }
    },

    async create(req, res) {
        try {
            const comprobanteCreado = await comprobanteService.createComprobante(req.body);
            
            logger.audit("Comprobante creado", req.user?.id_usuario, "CREATE", {
                comprobanteId: comprobanteCreado.id_comprobante,
                ventaId: comprobanteCreado.id_venta,
                tipo: comprobanteCreado.tipo,
                formato: comprobanteCreado.getFormatoContenido()
            });

            return responseHelper.success(res, 
                comprobanteCreado.toJSON(false), 
                "Comprobante creado correctamente", 
                201
            );

        } catch (error) {
            return handleError(res, error, 'comprobanteController.create', { datos: req.body, usuario: req.user?.id_usuario });
        }
    },

    async generarTicketAutomatico(req, res) {
        try {
            const { id_venta } = req.body;
            const comprobanteCreado = await comprobanteService.generarTicket(id_venta);

            logger.audit("Ticket generado automáticamente", req.user?.id_usuario, "CREATE", {
                comprobanteId: comprobanteCreado.id_comprobante,
                ventaId: id_venta,
            });

            return responseHelper.success(res, 
                comprobanteCreado.toJSON(false),
                "Ticket generado automáticamente",
                201
            );

        } catch (error) {
            return handleError(res, error, 'comprobanteController.generarTicketAutomatico', { ventaId: req.body.id_venta, usuario: req.user?.id_usuario });
        }
    },

    async getByTipo(req, res) {
        try {
            const { tipo } = req.params;
            const data = await comprobanteService.getComprobantesByTipo(tipo, req.query);

            logger.api("Comprobantes obtenidos por tipo", {
                tipo: tipo,
                total: data.pagination.total,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'comprobanteController.getByTipo', { tipo: req.params.tipo, usuario: req.user?.id_usuario });
        }
    },

    async descargarComprobante(req, res) {
        try {
            const { id } = req.params;
            const { filename, contentType, contenido, logData } = await comprobanteService.getComprobanteParaDescarga(id);

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', Buffer.byteLength(contenido));

            logger.audit("Comprobante descargado", req.user?.id_usuario, "DOWNLOAD", {
                comprobanteId: id,
                ...logData
            });

            return res.send(contenido);

        } catch (error) {
            // No se puede usar handleError normal porque podría ya haberse enviado parte de la respuesta
            logger.error("Error en comprobanteController.descargarComprobante", {
                error: error.message,
                comprobanteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            if (!res.headersSent) {
                if (error.status === 404) {
                    return responseHelper.notFound(res, error.message);
                }
                return responseHelper.error(res, "Error descargando comprobante", 500, error);
            }
        }
    },

    async generarFactura(req, res) {
        try {
            const { id_venta, datos_factura } = req.body;
            const { data, logData } = await comprobanteService.generarFactura(id_venta, datos_factura);

            logger.audit("Factura generada", req.user?.id_usuario, "CREATE", {
                comprobanteId: data.id_comprobante,
                ventaId: id_venta,
                ...logData
            });

            return responseHelper.success(res, 
                data,
                "Factura generada correctamente",
                201
            );

        } catch (error) {
            return handleError(res, error, 'comprobanteController.generarFactura', { ventaId: req.body.id_venta, usuario: req.user?.id_usuario });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const comprobanteEliminado = await comprobanteService.deleteComprobante(id);

            logger.audit("Comprobante eliminado", req.user?.id_usuario, "DELETE", {
                comprobanteId: id,
                tipo: comprobanteEliminado.tipo,
                ventaId: comprobanteEliminado.id_venta
            });

            return responseHelper.success(res, null, "Comprobante eliminado correctamente");

        } catch (error) {
            return handleError(res, error, 'comprobanteController.delete', { comprobanteId: req.params.id, usuario: req.user?.id_usuario });
        }
    },

    async reenviarComprobante(req, res) {
        try {
            const { id } = req.params;
            const { email } = req.body;
            const { logData } = await comprobanteService.reenviarEmail(id, email);
            
            logger.audit("Comprobante reenviado por email", req.user?.id_usuario, "RESEND", {
                comprobanteId: id,
                ...logData
            });

            return responseHelper.success(res, null, "Comprobante reenviado correctamente");

        } catch (error) {
            return handleError(res, error, 'comprobanteController.reenviarComprobante', { comprobanteId: req.params.id, usuario: req.user?.id_usuario });
        }
    },

    async getEstadisticas(req, res) {
        try {
            const estadisticas = await comprobanteService.getEstadisticas(req.query);
            
            logger.api("Estadísticas de comprobantes obtenidas", {
                filtros: req.query,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            return handleError(res, error, 'comprobanteController.getEstadisticas', { usuario: req.user?.id_usuario });
        }
    }
};

module.exports = comprobanteController;