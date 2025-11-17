// src/controllers/proveedorController.js - Refactorizado

const proveedorService = require('../services/proveedorService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesitan: db, Proveedor, ModelMapper, QueryBuilder, helpers

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

const proveedorController = {

    async getAll(req, res) {
        try {
            const data = await proveedorService.getAllProveedores(req.query);
            
            logger.database('Proveedores obtenidos exitosamente', {
                count: data.proveedores.length,
                total: data.pagination.total,
                filtros: req.query
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'proveedorController.getAll', { query: req.query });
        }
    },

    async getById(req, res) {
        try {
            const id = req.params.id;
            const includeProductos = req.query.includeProductos === 'true';
            const proveedor = await proveedorService.getProveedorById(id, includeProductos);
            
            logger.database('Proveedor obtenido por ID', { id });
            
            return responseHelper.success(res, proveedor);

        } catch (error) {
            return handleError(res, error, 'proveedorController.getById', { id: req.params.id });
        }
    },

    async create(req, res) {
        try {
            const proveedorCreado = await proveedorService.createProveedor(req.body);
            
            logger.audit('Proveedor creado', req.user?.id_usuario, 'CREATE', {
                proveedor_id: proveedorCreado.id_proveedor,
                nombre: proveedorCreado.nombre
            });

            return responseHelper.success(res, proveedorCreado, 'Proveedor creado exitosamente', 201);

        } catch (error) {
            return handleError(res, error, 'proveedorController.create', { body: req.body, user: req.user?.id_usuario });
        }
    },

    async update(req, res) {
        try {
            const id = req.params.id;
            const proveedorActualizado = await proveedorService.updateProveedor(id, req.body);
            
            logger.audit('Proveedor actualizado', req.user?.id_usuario, 'UPDATE', {
                proveedor_id: id,
                cambios: Object.keys(req.body)
            });

            return responseHelper.success(res, proveedorActualizado, 'Proveedor actualizado exitosamente');

        } catch (error) {
            return handleError(res, error, 'proveedorController.update', { id: req.params.id, body: req.body, user: req.user?.id_usuario });
        }
    },

    async delete(req, res) {
        try {
            const id = req.params.id;
            const proveedorEliminado = await proveedorService.deleteProveedor(id);
            
            logger.audit('Proveedor eliminado', req.user?.id_usuario, 'DELETE', {
                proveedor_id: id,
                nombre: proveedorEliminado.nombre
            });

            return responseHelper.success(res, null, 'Proveedor eliminado exitosamente');

        } catch (error) {
            return handleError(res, error, 'proveedorController.delete', { id: req.params.id, user: req.user?.id_usuario });
        }
    },

    async getProductos(req, res) {
        try {
            const id = req.params.id;
            const data = await proveedorService.getProductosByProveedor(id, req.query);
            
            logger.database('Productos de proveedor obtenidos', {
                proveedor_id: id,
                count: data.productos.length,
                total: data.pagination.total
            });
            
            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'proveedorController.getProductos', { id: req.params.id });
        }
    },

    async getEstadisticas(req, res) {
        try {
            const id = req.params.id;
            const data = await proveedorService.getEstadisticas(id);
            
            logger.database('Estadísticas de proveedor obtenidas', { proveedor_id: id });
            
            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'proveedorController.getEstadisticas', { id: req.params.id });
        }
    }
};

module.exports = proveedorController;