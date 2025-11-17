// src/controllers/ofertaController.js - Refactorizado

const ofertaService = require('../services/ofertaService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesitan: db, Oferta, ProductoOferta, ModelMapper, QueryBuilder, helpers

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

const ofertaController = {

    async getAll(req, res) {
        try {
            const data = await ofertaService.getAllOfertas(req.query);
            
            logger.database('Ofertas obtenidas exitosamente', {
                count: data.ofertas.length,
                total: data.pagination.total,
                filtros: req.query
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'ofertaController.getAll', { query: req.query });
        }
    },

    async getById(req, res) {
        try {
            const id = req.params.id;
            const includeProductos = req.query.includeProductos === 'true';
            const oferta = await ofertaService.getOfertaById(id, includeProductos);
            
            logger.database('Oferta obtenida por ID', { id });
            
            return responseHelper.success(res, oferta);

        } catch (error) {
            return handleError(res, error, 'ofertaController.getById', { id: req.params.id });
        }
    },

    async create(req, res) {
        try {
            const ofertaCreada = await ofertaService.createOferta(req.body);
            
            logger.audit('Oferta creada', req.user?.id_usuario, 'CREATE', {
                oferta_id: ofertaCreada.id_oferta,
                nombre: ofertaCreada.nombre,
                descuento: ofertaCreada.porcentaje_descuento
            });

            return responseHelper.success(res, ofertaCreada, 'Oferta creada exitosamente', 201);

        } catch (error) {
            return handleError(res, error, 'ofertaController.create', { body: req.body, user: req.user?.id_usuario });
        }
    },

    async update(req, res) {
        try {
            const id = req.params.id;
            const ofertaActualizada = await ofertaService.updateOferta(id, req.body);
            
            logger.audit('Oferta actualizada', req.user?.id_usuario, 'UPDATE', {
                oferta_id: id,
                cambios: Object.keys(req.body)
            });

            return responseHelper.success(res, ofertaActualizada, 'Oferta actualizada exitosamente');

        } catch (error) {
            return handleError(res, error, 'ofertaController.update', { id: req.params.id, body: req.body, user: req.user?.id_usuario });
        }
    },

    async delete(req, res) {
        try {
            const id = req.params.id;
            const ofertaEliminada = await ofertaService.deleteOferta(id);
            
            logger.audit('Oferta eliminada', req.user?.id_usuario, 'DELETE', {
                oferta_id: id,
                nombre: ofertaEliminada.nombre
            });

            return responseHelper.success(res, null, 'Oferta eliminada exitosamente');

        } catch (error) {
            return handleError(res, error, 'ofertaController.delete', { id: req.params.id, user: req.user?.id_usuario });
        }
    },

    async asignarProducto(req, res) {
        try {
            const { id_producto, id_oferta } = req.body;
            const { producto, oferta } = await ofertaService.asignarProducto(id_producto, id_oferta);
            
            logger.audit('Producto asignado a oferta', req.user?.id_usuario, 'ASSIGN_PRODUCT', {
                producto_id: producto.id_producto,
                oferta_id: oferta.id_oferta,
                producto_nombre: producto.nombre,
                oferta_nombre: oferta.nombre
            });

            return responseHelper.success(res, null, 'Producto asignado a oferta correctamente');

        } catch (error) {
            return handleError(res, error, 'ofertaController.asignarProducto', { body: req.body, user: req.user?.id_usuario });
        }
    },

    async desasignarProducto(req, res) {
        try {
            const { id_producto, id_oferta } = req.body;
            const relacion = await ofertaService.desasignarProducto(id_producto, id_oferta);
            
            logger.audit('Producto desasignado de oferta', req.user?.id_usuario, 'UNASSIGN_PRODUCT', {
                producto_id: id_producto,
                oferta_id: id_oferta,
                producto_nombre: relacion.producto_nombre,
                oferta_nombre: relacion.oferta_nombre
            });

            return responseHelper.success(res, null, 'Producto desasignado de la oferta correctamente');

        } catch (error) {
            return handleError(res, error, 'ofertaController.desasignarProducto', { body: req.body, user: req.user?.id_usuario });
        }
    },

    async getProductosAsociados(req, res) {
        try {
            const id = req.params.id;
            const data = await ofertaService.getProductosAsociados(id, req.query);
            
            logger.database('Productos de oferta obtenidos', {
                oferta_id: id,
                count: data.productos.length,
                total: data.pagination.total
            });
            
            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'ofertaController.getProductosAsociados', { id: req.params.id });
        }
    }
};

module.exports = ofertaController;