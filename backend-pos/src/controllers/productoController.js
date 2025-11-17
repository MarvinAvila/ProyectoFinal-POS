// src/controllers/productoController.js

const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const productoService = require("../services/productoService");
// Ya no se necesitan: db, QueryBuilder, Producto, ModelMapper, helpers, BarcodeGenerator, BarcodeService, QRService

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
        return responseHelper.error(res, error.message, error.status, error.errors || error);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};

const productoController = {

    async getAll(req, res) {
        try {
            const data = await productoService.getAllProductos(req.query);
            
            logger.api("Listado de productos obtenido", {
                total: data.pagination.total,
                filtros: data.filtros
            });

            return responseHelper.success(res, data);

        } catch (error) {
            return handleError(res, error, 'productoController.getAll', { query: req.query });
        }
    },

    async getById(req, res) {
        try {
            const id = req.params.id;
            const producto = await productoService.getProductoById(id);
            
            logger.api("Producto obtenido por ID", { producto_id: id });
            
            return responseHelper.success(res, producto);

        } catch (error) {
            return handleError(res, error, 'productoController.getById', { id: req.params.id });
        }
    },
    
    async getByBarcode(req, res) {
        try {
            const { code } = req.params;
            const producto = await productoService.getProductoByBarcode(code);
            
            logger.api("Producto encontrado por código de barras", {
                producto_id: producto.id_producto,
                codigo_barra: code,
            });
            
            return responseHelper.success(res, producto);

        } catch (error) {
            return handleError(res, error, 'productoController.getByBarcode', { code: req.params.code });
        }
    },

    async create(req, res) {
        try {
            // req.file es añadido por el middleware de carga (ej. multer)
            const { nuevoProducto, codigosGenerados } = await productoService.createProducto(req.body, req.file);
            
            logger.audit("Producto creado", req.user?.id_usuario, "CREATE", {
                producto_id: nuevoProducto.id_producto,
                nombre: nuevoProducto.nombre,
                tiene_imagen: !!nuevoProducto.imagen,
                tiene_codigos: !!codigosGenerados,
                codigo_generado: !req.body.codigo_barra,
            });

            return responseHelper.success(res, 
                { ...nuevoProducto, codigos_generados: !!codigosGenerados },
                "Producto creado exitosamente" + (codigosGenerados ? " con códigos generados" : ""),
                201
            );

        } catch (error) {
            return handleError(res, error, 'productoController.create', { body: req.body, user: req.user?.id_usuario });
        }
    },

    async update(req, res) {
        try {
            const id = req.params.id;
            // req.file es opcional
            const { productoActualizado, nuevosCodigos, codigoBarraCambiado } = await productoService.updateProducto(id, req.body, req.file);

            logger.audit("Producto actualizado", req.user?.id_usuario, "UPDATE", {
                producto_id: id,
                nombre: productoActualizado.nombre,
                campos_actualizados: Object.keys(req.body),
                imagen_actualizada: !!req.file,
                codigos_regenerados: !!nuevosCodigos,
                codigo_barra_cambiado: codigoBarraCambiado,
            });

            return responseHelper.success(res, 
                productoActualizado,
                "Producto actualizado exitosamente" + (nuevosCodigos ? " con códigos regenerados" : ""),
            );

        } catch (error) {
            return handleError(res, error, 'productoController.update', { id: req.params.id, body: req.body, user: req.user?.id_usuario });
        }
    },

    async delete(req, res) {
        try {
            const id = req.params.id;
            const { modo, countVentas, nombre } = await productoService.deleteProducto(id);

            if (modo === 'desactivado') {
                logger.audit("Producto desactivado", req.user?.id_usuario, "UPDATE", {
                    producto_id: id,
                    motivo: "Tiene ventas asociadas",
                    ventas_asociadas: countVentas,
                });
                return responseHelper.success(res, null, "Producto desactivado (tenía ventas asociadas)");
            } else {
                logger.audit("Producto eliminado", req.user?.id_usuario, "DELETE", {
                    producto_id: id,
                    nombre: nombre,
                });
                return responseHelper.success(res, null, "Producto eliminado exitosamente");
            }

        } catch (error) {
            return handleError(res, error, 'productoController.delete', { id: req.params.id, user: req.user?.id_usuario });
        }
    },

    async getStats(req, res) {
        try {
            const stats = await productoService.getStats();
            
            logger.api("Estadísticas de productos obtenidas", {
                usuario: req.user?.id_usuario,
            });
            
            return responseHelper.success(res, stats);

        } catch (error) {
            return handleError(res, error, 'productoController.getStats', { user: req.user?.id_usuario });
        }
    },
    
    async getProductCodes(req, res) {
        try {
            const id = req.params.id;
            const codes = await productoService.getProductCodes(id);
            
            return responseHelper.success(res, codes);

        } catch (error) {
            return handleError(res, error, 'productoController.getProductCodes', { id: req.params.id });
        }
    },
    
    async regenerateCodes(req, res) {
        try {
            const id = req.params.id;
            const { codigo_barra } = req.body;
            const productoActualizado = await productoService.regenerateCodes(id, codigo_barra);

            logger.audit("Códigos regenerados", req.user?.id_usuario, "UPDATE", {
                producto_id: id,
                nombre: productoActualizado.nombre,
            });

            return responseHelper.success(res, 
                { data: productoActualizado, message: "Códigos regenerados exitosamente" }
            );

        } catch (error) {
            return handleError(res, error, 'productoController.regenerateCodes', { id: req.params.id, body: req.body });
        }
    }
};

module.exports = productoController;