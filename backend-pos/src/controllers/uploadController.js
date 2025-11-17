// src/controllers/uploadController.js - Refactorizado

const uploadService = require('../services/uploadService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// Ya no se necesita: db, cloudinary

/**
 * Manejador de errores centralizado
 */
const handleError = (res, error, context, requestData = {}) => {
    logger.error(`Error en ${context}`, {
        error: error.message,
        ...requestData,
    });
    
    if (error.status) { // Errores de negocio (400, 404, 500)
        return responseHelper.error(res, error.message, error.status);
    }
    
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};

const uploadController = {

    /**
     * Sube una imagen genérica y devuelve la URL.
     */
    async uploadImage(req, res) {
        try {
            if (!req.file) {
                return responseHelper.error(res, 'No se proporcionó ninguna imagen', 400);
            }
            
            const result = await uploadService.uploadImage(req.file);
            
            logger.api('Imagen subida a Cloudinary', { 
                url: result.imageUrl, 
                publicId: result.publicId 
            });

            return responseHelper.success(res, {
                imageUrl: result.imageUrl,
                publicId: result.publicId
            }, 'Imagen subida exitosamente');

        } catch (error) {
            return handleError(res, error, 'uploadController.uploadImage');
        }
    },

    /**
     * Elimina una imagen genérica de Cloudinary.
     */
    async deleteImage(req, res) {
        try {
            const { publicId } = req.params;
            await uploadService.deleteImage(publicId);

            logger.audit('Imagen eliminada de Cloudinary', req.user?.id_usuario, 'DELETE', {
                publicId: publicId
            });

            return responseHelper.success(res, null, 'Imagen eliminada exitosamente');

        } catch (error) {
            return handleError(res, error, 'uploadController.deleteImage', { publicId: req.params.publicId });
        }
    },

    /**
     * Sube una imagen y la asigna a un producto.
     */
    async updateProductImage(req, res) {
        try {
            const { productId } = req.params;
            
            if (!req.file) {
                return responseHelper.error(res, 'No se proporcionó ninguna imagen', 400);
            }

            const product = await uploadService.updateProductImage(productId, req.file);

            logger.audit('Imagen de producto actualizada', req.user?.id_usuario, 'UPDATE', {
                productoId: productId,
                nuevaImagenUrl: product.imagen
            });
            
            return responseHelper.success(res, {
                product: product
            }, 'Imagen del producto actualizada exitosamente');

        } catch (error) {
            return handleError(res, error, 'uploadController.updateProductImage', { 
                productId: req.params.productId,
                usuario: req.user?.id_usuario
            });
        }
    }
};

module.exports = uploadController;