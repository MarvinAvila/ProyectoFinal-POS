// src/controllers/detalleVentaController.js

const detalleVentaService = require('../services/detalleVentaService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesita: db, DetalleVenta, HistorialInventario, ModelMapper, QueryBuilder, helpers

/**
 * Manejador de errores centralizado
 */
const handleError = (res, error, context, requestData = {}) => {
    logger.error(`Error en ${context}`, {
        error: error.message,
        details: error.details, // Para errores de createMultiple
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

const detalleVentaController = {

    async getAll(req, res) {
        try {
            const data = await detalleVentaService.getAllDetalles(req.query);
            
            logger.database("Detalles de venta obtenidos exitosamente", {
                count: data.detalles.length,
                total: data.pagination.total,
                filtros: req.query,
            });
            
            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getAll', { query: req.query });
        }
    },

    async getById(req, res) {
        try {
            const id = req.params.id;
            const detalle = await detalleVentaService.getDetalleById(id);
            
            logger.database("Detalle de venta obtenido por ID", { id });
            
            return responseHelper.success(res, detalle);

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getById', { id: req.params.id });
        }
    },

    async create(req, res) {
        try {
            const detalleCreado = await detalleVentaService.createDetalle(req.body, req.user?.id_usuario);
            
            logger.audit("Detalle de venta creado", req.user?.id_usuario, "CREATE", {
                detalle_id: detalleCreado.id_detalle,
                venta_id: detalleCreado.id_venta,
                producto_id: detalleCreado.id_producto,
                cantidad: detalleCreado.cantidad,
                subtotal: detalleCreado.subtotal,
            });

            return responseHelper.success(
                res,
                detalleCreado,
                "Detalle de venta creado exitosamente",
                201
            );

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.create', { body: req.body, user: req.user?.id_usuario });
        }
    },

    async update(req, res) {
        try {
            const id = req.params.id;
            const { detalle, cambios } = await detalleVentaService.updateDetalle(id, req.body, req.user?.id_usuario);

            logger.audit(
                "Detalle de venta actualizado",
                req.user?.id_usuario,
                "UPDATE",
                { detalle_id: id, cambios }
            );

            return responseHelper.success(
                res,
                detalle,
                "Detalle de venta actualizado exitosamente"
            );

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.update', { id: req.params.id, body: req.body, user: req.user?.id_usuario });
        }
    },
    
    async patch(req, res) {
        try {
            const id = req.params.id;
            const { detalle, cambios } = await detalleVentaService.patchDetalle(id, req.body, req.user?.id_usuario);
            
            logger.audit(
                "Detalle de venta actualizado parcialmente",
                req.user?.id_usuario,
                "UPDATE",
                {
                    detalle_id: id,
                    campos_actualizados: cambios,
                }
            );
            
            return responseHelper.success(
                res,
                detalle,
                "Detalle de venta actualizado exitosamente"
            );

        } catch(error) {
            return handleError(res, error, 'detalleVentaController.patch', { id: req.params.id, body: req.body, user: req.user?.id_usuario });
        }
    },

    async delete(req, res) {
        try {
            const id = req.params.id;
            const oldDetalle = await detalleVentaService.deleteDetalle(id, req.user?.id_usuario);

            logger.audit(
                "Detalle de venta eliminado",
                req.user?.id_usuario,
                "DELETE",
                {
                    detalle_id: id,
                    producto_id: oldDetalle.id_producto,
                    cantidad_revertida: oldDetalle.cantidad,
                }
            );

            return responseHelper.success(
                res,
                null,
                "Detalle de venta eliminado exitosamente"
            );

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.delete', { id: req.params.id, user: req.user?.id_usuario });
        }
    },

    async getByVenta(req, res) {
        try {
            const id_venta = req.params.id_venta;
            const data = await detalleVentaService.getDetallesByVenta(id_venta, req.query);
            
            logger.database("Detalles de venta obtenidos por venta ID", {
                venta_id: id_venta,
                count: data.detalles.length,
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getByVenta', { id_venta: req.params.id_venta });
        }
    },

    async getByProducto(req, res) {
        try {
            const id_producto = req.params.id_producto;
            const data = await detalleVentaService.getDetallesByProducto(id_producto, req.query);
            
            logger.database("Detalles de venta obtenidos por producto ID", {
                producto_id: id_producto,
                count: data.detalles.length,
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getByProducto', { id_producto: req.params.id_producto });
        }
    },
    
    async createMultiple(req, res) {
        try {
            const { id_venta, detalles } = req.body;
            const data = await detalleVentaService.createMultipleDetalles(id_venta, detalles, req.user?.id_usuario);

            logger.audit(
                "Múltiples detalles de venta creados",
                req.user?.id_usuario,
                "CREATE",
                {
                    venta_id: id_venta,
                    total_detalles: data.total,
                    productos: data.detalles.map((d) => d.id_producto),
                }
            );

            return responseHelper.success(
                res,
                data,
                "Detalles de venta creados exitosamente",
                201
            );

        } catch (error) {
             return handleError(res, error, 'detalleVentaController.createMultiple', { body: req.body, user: req.user?.id_usuario });
        }
    },
    
    async getReporteVentasProductos(req, res) {
        try {
            const data = await detalleVentaService.getReporteVentasProductos(req.query);
            
            logger.database("Reporte de ventas por productos generado", {
                agrupar_por: req.query.agrupar_por,
                total_registros: data.total_registros,
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getReporteVentasProductos', { query: req.query });
        }
    },

    async getReporteTopProductos(req, res) {
        try {
            const data = await detalleVentaService.getReporteTopProductos(req.query);

            logger.database("Reporte de top productos generado", {
                ...data.parametros
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getReporteTopProductos', { query: req.query });
        }
    },
    
    async validarStock(req, res) {
        try {
            const { id_producto, cantidad, id_venta } = req.body;
            const data = await detalleVentaService.validarStock(id_producto, cantidad, id_venta);

            logger.database("Validación de stock realizada", {
                producto_id: id_producto,
                ...data.validacion
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'detalleVentaController.validarStock', { body: req.body });
        }
    },

    async getEstadisticasProducto(req, res) {
        try {
            const { id_producto } = req.params;
            const stats = await detalleVentaService.getEstadisticasProducto(id_producto);
            return responseHelper.success(res, stats);
        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getEstadisticasProducto', { id_producto: req.params.id_producto });
        }
    },

    async getEstadisticasVenta(req, res) {
        try {
            const { id_venta } = req.params;
            const stats = await detalleVentaService.getEstadisticasVenta(id_venta);
            return responseHelper.success(res, stats);
        } catch (error) {
            return handleError(res, error, 'detalleVentaController.getEstadisticasVenta', { id_venta: req.params.id_venta });
        }
    },
};

module.exports = detalleVentaController;