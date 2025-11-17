// src/controllers/categoriaController.js

const categoriaService = require('../services/categoriaService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesitan: db, Categoria, ModelMapper, QueryBuilder, helpers

/**
 * Manejador de errores centralizado para el controlador
 */
const handleError = (res, error, context, requestData = {}) => {
    logger.error(`Error en ${context}`, {
        error: error.message,
        ...requestData,
    });

    if (error.message === 'ID inválido') {
         return responseHelper.error(res, 'ID de categoría inválido', 400);
    }
    if (error.status) { // Errores de negocio (400, 404, 409)
        return responseHelper.error(res, error.message, error.status);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};


const categoriaController = {
    
    async getAll(req, res) {
        try {
            const data = await categoriaService.getAllCategorias(req.query);
            
            logger.database('Categorías obtenidas exitosamente', {
                count: data.categorias.length,
                total: data.pagination.total,
                page: data.pagination.page,
                limit: data.pagination.limit
            });
            
            return responseHelper.success(res, data);
            
        } catch (error) {
            return handleError(res, error, 'categoriaController.getAll');
        }
    },

    async getById(req, res) {
        try {
            const id = req.params.id;
            const categoria = await categoriaService.getCategoriaById(id);
            
            logger.database('Categoría obtenida por ID', { id });
            
            return responseHelper.success(res, categoria);
            
        } catch (error) {
            return handleError(res, error, 'categoriaController.getById', { id: req.params.id });
        }
    },

    async create(req, res) {
        try {
            const categoria = await categoriaService.createCategoria(req.body);
            
            logger.audit('Categoría creada', req.user?.id_usuario, 'CREATE', {
                categoria_id: categoria.id_categoria,
                nombre: categoria.nombre
            });
            
            return responseHelper.success(res, categoria, 'Categoría creada exitosamente', 201);
            
        } catch (error) {
            return handleError(res, error, 'categoriaController.create', { body: req.body });
        }
    },

    async update(req, res) {
        try {
            const id = req.params.id;
            const categoria = await categoriaService.updateCategoria(id, req.body);
            
            logger.audit('Categoría actualizada', req.user?.id_usuario, 'UPDATE', {
                categoria_id: id,
                cambios: Object.keys(req.body)
            });
            
            return responseHelper.success(res, categoria, 'Categoría actualizada exitosamente');
            
        } catch (error) {
            return handleError(res, error, 'categoriaController.update', { id: req.params.id, body: req.body });
        }
    },

    // El método PATCH es redundante con UPDATE. 
    // Si se desea mantener la ruta PATCH, puede apuntar a este mismo método 'update'.
    // Si 'patch' tiene una semántica diferente (actualización parcial estricta),
    // se crearía un 'patchCategoria' en el servicio.
    // Por ahora, lo omitiré y asumiré que 'update' maneja todas las actualizaciones.
    // ... Si necesitas `patch` explícitamente, avísame.

    async delete(req, res) {
        try {
            const id = req.params.id;
            const categoriaEliminada = await categoriaService.deleteCategoria(id);
            
            logger.audit('Categoría eliminada', req.user?.id_usuario, 'DELETE', {
                categoria_id: id,
                nombre: categoriaEliminada.nombre
            });
            
            return responseHelper.success(res, null, 'Categoría eliminada exitosamente');
            
        } catch (error) {
            return handleError(res, error, 'categoriaController.delete', { id: req.params.id });
        }
    },

    async getProductos(req, res) {
        try {
            const id = req.params.id;
            const data = await categoriaService.getProductosByCategoria(id, req.query);
            
            logger.database('Productos de categoría obtenidos', {
                categoria_id: id,
                count: data.productos.length,
                total: data.pagination.total
            });
            
            return responseHelper.success(res, data);
            
        } catch (error) {
            return handleError(res, error, 'categoriaController.getProductos', { id: req.params.id });
        }
    },

    async moverProductos(req, res) {
        try {
            const idOrigen = req.params.id;
            const { categoria_destino_id, productos_ids } = req.body;

            const data = await categoriaService.moverProductos(idOrigen, categoria_destino_id, productos_ids);

            logger.audit('Productos movidos entre categorías', req.user?.id_usuario, 'MOVE_PRODUCTS', {
                categoria_origen_id: idOrigen,
                categoria_destino_id: categoria_destino_id,
                productos_movidos: data.productos_movidos,
                productos_ids: productos_ids
            });

            return responseHelper.success(res, data, `${data.productos_movidos} producto(s) movido(s) exitosamente`);

        } catch (error)
        {
            return handleError(res, error, 'categoriaController.moverProductos', { id: req.params.id, body: req.body });
        }
    },

    async getEstadisticas(req, res) {
        try {
            const estadisticas = await categoriaService.getEstadisticas();

            logger.database('Estadísticas de categorías obtenidas', {
                usuario: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            return handleError(res, error, 'categoriaController.getEstadisticas');
        }
    },

    async getEstadisticasCategoria(req, res) {
        try {
            const id = req.params.id;
            const estadisticas = await categoriaService.getEstadisticasCategoria(id);

            logger.database('Estadísticas de categoría específica obtenidas', {
                categoria_id: id,
                usuario: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            return handleError(res, error, 'categoriaController.getEstadisticasCategoria', { id: req.params.id });
        }
    }
};

module.exports = categoriaController;