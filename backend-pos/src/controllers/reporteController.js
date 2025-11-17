// src/controllers/reporteController.js - Refactorizado

const reporteService = require('../services/reporteService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesitan: db, Reporte, QueryBuilder

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
    if (error.status) { // Errores de negocio (400, 404, 409)
        return responseHelper.error(res, error.message, error.status, error.details || error);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};

const reporteController = {

    async getAll(req, res) {
        try {
            const data = await reporteService.getAllReportes(req.query);
            
            logger.api("Listado de reportes obtenido", {
                total: data.meta.total,
                filtros: req.query,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'reporteController.getAll', { 
                query: req.query, 
                usuario: req.user?.id_usuario 
            });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const reporte = await reporteService.getReporteById(id);
            
            logger.api("Reporte obtenido por ID", {
                reporteId: id,
                tipo: reporte.tipo,
                usuarioConsulta: req.user?.id_usuario
            });
            
            // El servicio ya devuelve el JSON con contenido
            return responseHelper.success(res, reporte); 

        } catch (error) {
            return handleError(res, error, 'reporteController.getById', {
                reporteId: req.params.id,
                usuario: req.user?.id_usuario
            });
        }
    },

    async generarReporte(req, res) {
        try {
            const { tipo, parametros = {} } = req.body;
            // Usar el ID del usuario logueado como el generador
            const id_usuario = req.user?.id_usuario; 
            
            const reporteCreado = await reporteService.generarReporte({ tipo, id_usuario, parametros }, id_usuario);
            
            logger.audit("Reporte generado", req.user?.id_usuario, "CREATE", {
                reporteId: reporteCreado.id_reporte,
                tipo: reporteCreado.tipo,
                titulo: reporteCreado.getTitulo(),
                usuarioGenerador: id_usuario
            });

            return responseHelper.success(res, 
                reporteCreado.toJSON(true), 
                `Reporte "${reporteCreado.getTitulo()}" generado correctamente`, 
                201
            );

        } catch (error) {
            return handleError(res, error, 'reporteController.generarReporte', {
                tipo: req.body.tipo,
                usuarioSolicitante: req.user?.id_usuario
            });
        }
    },

    async getEstadisticasReportes(req, res) {
        try {
            const estadisticas = await reporteService.getEstadisticas(req.query);
            
            logger.api("Estadísticas de reportes generadas", {
                total_reportes: estadisticas.total_reportes,
                periodo: estadisticas.periodo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            return handleError(res, error, 'reporteController.getEstadisticasReportes', {
                query: req.query,
                usuario: req.user?.id_usuario
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const reporteEliminado = await reporteService.deleteReporte(id);

            logger.audit("Reporte eliminado", req.user?.id_usuario, "DELETE", {
                reporteId: id,
                tipo: reporteEliminado.tipo,
                titulo: reporteEliminado.getTitulo(),
                usuarioOriginal: reporteEliminado.id_usuario
            });

            return responseHelper.success(res, null, "Reporte eliminado correctamente");

        } catch (error) {
            return handleError(res, error, 'reporteController.delete', {
                reporteId: req.params.id,
                usuario: req.user?.id_usuario
            });
        }
    }
};

module.exports = reporteController;