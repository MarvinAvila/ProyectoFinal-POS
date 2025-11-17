// src/controllers/ventaController.js

const ventaService = require('../services/ventaService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesita: db, Venta, DetalleVenta, HistorialInventario, Producto, ModelMapper, QueryBuilder, helpers

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

const ventaController = {

    async getAll(req, res) {
        try {
            const data = await ventaService.getAllVentas(req.query);
            
            logger.database('Ventas obtenidas exitosamente', {
                count: data.ventas.length,
                total: data.pagination.total,
                filtros: req.query
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'ventaController.getAll', { query: req.query });
        }
    },

    async getById(req, res) {
        try {
            const id = req.params.id;
            const venta = await ventaService.getVentaCompletaById(id);
            
            logger.database('Venta obtenida por ID', { id });

            return responseHelper.success(res, venta);

        } catch (error) {
            return handleError(res, error, 'ventaController.getById', { id: req.params.id });
        }
    },

    async create(req, res) {
        try {
            // Pasamos el id del usuario que realiza la acción (logueado)
            const ventaCompleta = await ventaService.createVenta(req.body, req.user?.id_usuario);
            
            logger.audit('Venta creada', req.user?.id_usuario, 'CREATE', {
                venta_id: ventaCompleta.id_venta,
                total: ventaCompleta.total,
                total_productos: ventaCompleta.detalles.length,
                forma_pago: ventaCompleta.forma_pago
            });

            return responseHelper.success(res, ventaCompleta, 'Venta registrada exitosamente', 201);

        } catch (error) {
            return handleError(res, error, 'ventaController.create', { body: req.body, user: req.user?.id_usuario });
        }
    },

    async delete(req, res) {
        try {
            const id = req.params.id;
            const ventaEliminada = await ventaService.deleteVenta(id, req.user?.id_usuario);
            
            logger.audit('Venta eliminada', req.user?.id_usuario, 'DELETE', {
                venta_id: id,
                usuario_original: ventaEliminada.id_usuario,
                total: ventaEliminada.total
            });

            return responseHelper.success(res, null, 'Venta eliminada exitosamente');

        } catch (error) {
            return handleError(res, error, 'ventaController.delete', { id: req.params.id, user: req.user?.id_usuario });
        }
    },

    async getEstadisticas(req, res) {
        try {
            const estadisticas = await ventaService.getEstadisticas(req.query);
            
            logger.database('Estadísticas de ventas obtenidas', { filtros: req.query });
            
            return responseHelper.success(res, estadisticas);

        } catch (error) {
            return handleError(res, error, 'ventaController.getEstadisticas', { query: req.query });
        }
    },

    async topProductos(req, res) {
        try {
            const data = await ventaService.getTopProductos();
            return responseHelper.success(res, data);
        } catch (error) {
            return handleError(res, error, 'ventaController.topProductos');
        }
    },

    async ventasDelDia(req, res) {
        try {
            const data = await ventaService.getVentasDelDia();
            return responseHelper.success(res, data);
        } catch (error) {
            return handleError(res, error, 'ventaController.ventasDelDia');
        }
    },
    
    // El helper 'obtenerVentaCompleta' ya no es necesario aquí, 
    // su lógica vive en 'ventaService.getVentaCompletaById'
};

module.exports = ventaController;