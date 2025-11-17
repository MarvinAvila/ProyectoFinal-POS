// src/controllers/productoOfertaController.js - Refactorizado

const productoOfertaService = require('../services/productoOfertaService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesitan: db, ProductoOferta, QueryBuilder, helpers

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

const productoOfertaController = {

    async getAll(req, res) {
        try {
            const data = await productoOfertaService.getAll(req.query);
            
            logger.api("Relaciones producto-oferta obtenidas", {
                total: data.pagination.total,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'productoOfertaController.getAll', {
                query: req.query,
                usuario: req.user?.id_usuario
            });
        }
    },

    async getOffersByProduct(req, res) {
        try {
            const { id_producto } = req.params;
            const data = await productoOfertaService.getOffersByProduct(id_producto, req.query);
            
            logger.api("Ofertas por producto obtenidas", {
                productoId: id_producto,
                totalOfertas: data.pagination.total,
                usuarioConsulta: req.user?.id_usuario
            });
            
            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'productoOfertaController.getOffersByProduct', {
                productoId: req.params.id_producto,
                usuario: req.user?.id_usuario
            });
        }
    },

    async getProductsByOffer(req, res) {
        try {
            const { id_oferta } = req.params;
            const data = await productoOfertaService.getProductsByOffer(id_oferta, req.query);
            
            logger.api("Productos por oferta obtenidos", {
                ofertaId: id_oferta,
                totalProductos: data.pagination.total,
                usuarioConsulta: req.user?.id_usuario
            });
            
            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'productoOfertaController.getProductsByOffer', {
                ofertaId: req.params.id_oferta,
                usuario: req.user?.id_usuario
            });
        }
    },

    async assign(req, res) {
        try {
            const { id_producto, id_oferta } = req.body;
            const relacionCreada = await productoOfertaService.assignProducto(id_producto, id_oferta);
            
            logger.audit("Producto asignado a oferta", req.user?.id_usuario, "CREATE", {
                productoId: id_producto,
                productoNombre: relacionCreada.producto_nombre,
                ofertaId: id_oferta,
                ofertaNombre: relacionCreada.oferta_nombre
            });

            return responseHelper.success(res, 
                relacionCreada,
                "Producto asignado a oferta correctamente", 
                201
            );

        } catch (error) {
            return handleError(res, error, 'productoOfertaController.assign', {
                datos: req.body,
                usuario: req.user?.id_usuario
            });
        }
    },

    async unassign(req, res) {
        try {
            const { id_producto, id_oferta } = req.body;
            const relacion = await productoOfertaService.unassignProducto(id_producto, id_oferta);
            
            logger.audit("Producto desasignado de oferta", req.user?.id_usuario, "DELETE", {
                productoId: id_producto,
                productoNombre: relacion.producto_nombre,
                ofertaId: id_oferta,
                ofertaNombre: relacion.oferta_nombre
            });

            return responseHelper.success(res, null, 'Producto desasignado de la oferta correctamente');

        } catch (error) {
            return handleError(res, error, 'productoOfertaController.unassign', {
                datos: req.body,
                usuario: req.user?.id_usuario
            });
        }
    },

    async getActiveOffersByProduct(req, res) {
        try {
            const { id_producto } = req.params;
            const relaciones = await productoOfertaService.getActiveOffersByProduct(id_producto);
            
            logger.api("Ofertas activas por producto obtenidas", {
                productoId: id_producto,
                totalOfertasActivas: relaciones.length,
                usuarioConsulta: req.user?.id_usuario
            });
            
            return responseHelper.success(res, relaciones);

        } catch (error) {
            return handleError(res, error, 'productoOfertaController.getActiveOffersByProduct', {
                productoId: req.params.id_producto,
                usuario: req.user?.id_usuario
            });
        }
    }
};

module.exports = productoOfertaController;