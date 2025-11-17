const alertaService = require('../services/alertaService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no necesitamos db, Alerta (excepto para stats), QueryBuilder, etc. aquí

/**
 * Maneja los errores de servicio y los convierte en respuestas HTTP
 */
function handleError(res, error, context, usuarioId) {
    logger.error(`Error en ${context}`, {
        error: error.message,
        usuario: usuarioId,
        stack: error.stack
    });

    if (error.status === 404) {
        return responseHelper.notFound(res, error.message);
    }
    if (error.status === 400) {
        return responseHelper.error(res, error.message, 400);
    }
    if (error.status === 409) {
        return responseHelper.conflict(res, error.message);
    }
    if (error.message === 'ID inválido') {
         return responseHelper.error(res, 'ID de alerta inválido', 400);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
}

const alertaController = {

    async getAll(req, res) {
        try {
            const data = await alertaService.getAllAlertas(req.query);
            
            logger.api("Listado de alertas obtenido", {
                total: data.pagination.total,
                filtros: { tipo: req.query.tipo, atendida: req.query.atendida },
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'alertaController.getAll', req.user?.id_usuario);
        }
    },

    async getPendientes(req, res) {
        try {
            const data = await alertaService.getAlertasPendientes();
            
            logger.api("Alertas pendientes obtenidas", {
                total: data.alertas.length,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'alertaController.getPendientes', req.user?.id_usuario);
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const alerta = await alertaService.getAlertaById(id);
            
            logger.api("Alerta obtenida por ID", {
                alertaId: id,
                tipo: alerta.tipo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, alerta);

        } catch (error) {
            return handleError(res, error, 'alertaController.getById', req.user?.id_usuario);
        }
    },

    async marcarAtendida(req, res) {
        try {
            const { id } = req.params;
            const { data, logData } = await alertaService.marcarAlertaAtendida(id);
            
            logger.audit("Alerta marcada como atendida", req.user?.id_usuario, {
                alertaId: id,
                action: "UPDATE",
                tipo: logData.tipo,
                producto: logData.producto_nombre
            });

            return responseHelper.success(res, 
                data, 
                "Alerta marcada como atendida correctamente"
            );

        } catch (error) {
            return handleError(res, error, 'alertaController.marcarAtendida', req.user?.id_usuario);
        }
    },

    async crearAlertaStockBajo(req, res) {
        try {
            const { id_producto, stock_minimo } = req.body;
            const { data, logData } = await alertaService.crearAlertaStockBajo(id_producto, stock_minimo);

            logger.audit("Alerta de stock bajo creada", req.user?.id_usuario, "CREATE", {
                productoId: logData.id_producto,
                productoNombre: logData.nombre,
                stockActual: logData.stock,
                stockMinimo: logData.stockMinimo
            });

            return responseHelper.success(res, 
                data, 
                "Alerta de stock bajo creada correctamente", 
                201
            );

        } catch (error) {
            return handleError(res, error, 'alertaController.crearAlertaStockBajo', req.user?.id_usuario);
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const { logData } = await alertaService.deleteAlerta(id);
            
            logger.audit("Alerta eliminada", req.user?.id_usuario, "DELETE", {
                alertaId: id,
                tipo: logData.tipo,
                productoId: logData.productoId
            });

            return responseHelper.success(res, null, "Alerta eliminada correctamente");

        } catch (error) {
            return handleError(res, error, 'alertaController.delete', req.user?.id_usuario);
        }
    },

    async getEstadisticas(req, res) {
        try {
            const estadisticas = await alertaService.getEstadisticas(req.query);

            logger.api("Estadísticas de alertas obtenidas", {
                dias: req.query.dias || 30,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            return handleError(res, error, 'alertaController.getEstadisticas', req.user?.id_usuario);
        }
    }
};

module.exports = alertaController;