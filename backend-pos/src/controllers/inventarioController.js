// src/controllers/inventarioController.js - Refactorizado

const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const inventarioService = require('../services/inventarioService');
// Ya no se necesita: db, QueryBuilder, HistorialInventario

/**
 * Manejador de errores centralizado
 */
const handleError = (res, error, context, requestData = {}) => {
    logger.error(`Error en ${context}`, {
        error: error.message,
        ...requestData,
    });
    
    if (error.message === 'ID inválido' || error.message.includes("inválido")) {
         return responseHelper.error(res, error.message, 400);
    }
    if (error.status) { // Errores de negocio (400, 404, 409)
        return responseHelper.error(res, error.message, error.status);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};

const inventarioController = {

    async historial(req, res) {
        try {
            const data = await inventarioService.getHistorial(req.query);
            
            logger.api("Historial de inventario consultado", {
                total_movimientos: data.meta.total,
                filtros: req.query,
                estadisticas: data.meta.estadisticas,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'inventarioController.historial', {
                query: req.query,
                usuario: req.user?.id_usuario
            });
        }
    },

    async ajuste(req, res) {
        try {
            const { id_producto, cambio } = req.body;
            const { movimiento, logData } = await inventarioService.crearAjuste(req.body, req.user?.id_usuario);
            
            logger.audit("Ajuste de inventario realizado", req.user?.id_usuario, "UPDATE", {
                productoId: id_producto,
                productoNombre: logData.productoNombre,
                cambio: cambio,
                stockAnterior: logData.stockAnterior,
                stockNuevo: logData.stockNuevo,
                motivo: movimiento.motivo
            });

            return responseHelper.success(res, 
                movimiento, 
                `Ajuste de inventario realizado para ${logData.productoNombre}`, 
                201
            );

        } catch (error) {
            return handleError(res, error, 'inventarioController.ajuste', {
                datos: req.body,
                usuario: req.user?.id_usuario
            });
        }
    },

    async estadisticas(req, res) {
        try {
            const { fecha_inicio, fecha_fin } = req.query;
            const data = await inventarioService.getEstadisticas(req.query);

            logger.api("Estadísticas de inventario generadas", {
                total_movimientos: data.movimientos_recientes.length, // O un total general si se agrega
                rango_fechas: { fecha_inicio, fecha_fin },
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'inventarioController.estadisticas', {
                query: req.query,
                usuario: req.user?.id_usuario
            });
        }
    }
};

module.exports = inventarioController;