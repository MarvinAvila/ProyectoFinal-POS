// src/services/uploadService.js

const cloudinary = require('../config/cloudinary');
const db = require('../config/database');
const { productoRepository } = require('../repositories/productoRepository'); // Asumimos que ya existe

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

/**
 * Helper privado para eliminar una imagen de Cloudinary
 */
async function _deleteImageFromCloudinary(imageUrl) {
    if (!imageUrl) return;
    try {
        // Extrae el public_id de la URL
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        // Asume la carpeta 'punto_venta'
        const publicId = 'punto_venta/' + fileName.split('.')[0]; 
        
        await cloudinary.uploader.destroy(publicId);
    } catch (deleteError) {
        console.warn("No se pudo eliminar la imagen anterior de Cloudinary:", deleteError.message);
        // No lanzamos un error, solo advertimos
    }
}


const uploadService = {

    /**
     * Sube un archivo a Cloudinary.
     * @param {object} file - El objeto 'req.file' de multer.
     * @returns {object} El resultado de Cloudinary (secure_url, public_id).
     */
    async uploadImage(file) {
        if (!file) {
            throw new BusinessError('No se proporcionó ninguna imagen', 400);
        }
        
        try {
            const b64 = Buffer.from(file.buffer).toString('base64');
            const dataURI = "data:" + file.mimetype + ";base64," + b64;

            const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'punto_venta',
                quality: 'auto:good',
                fetch_format: 'auto'
            });

            return {
                imageUrl: result.secure_url,
                publicId: result.public_id
            };
        } catch (error) {
            console.error('Error al subir imagen a Cloudinary:', error);
            throw new BusinessError('Error interno del servidor al subir imagen', 500);
        }
    },

    /**
     * Elimina una imagen de Cloudinary usando su public_id.
     * @param {string} publicId - El ID público de Cloudinary.
     */
    async deleteImage(publicId) {
        if (!publicId) {
            throw new BusinessError('No se proporcionó un publicId', 400);
        }
        
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Error al eliminar imagen de Cloudinary:', error);
            throw new BusinessError('Error al eliminar imagen', 500);
        }
    },

    /**
     * Sube una nueva imagen, la asocia a un producto y borra la anterior.
     * Esta es una operación transaccional.
     */
    async updateProductImage(productId, file) {
        if (!file) {
            throw new BusinessError('No se proporcionó ninguna imagen', 400);
        }

        const client = await db.getClient();
        let newImageUrl = null; // Para rollback de Cloudinary

        try {
            await client.query('BEGIN');

            // 1. Obtener el producto
            const producto = await productoRepository.findByIdSimple(productId, client);
            if (!producto) {
                throw new BusinessError('Producto no encontrado', 404);
            }

            // 2. Subir la nueva imagen a Cloudinary PRIMERO
            const uploadResult = await this.uploadImage(file);
            newImageUrl = uploadResult.imageUrl; // Guardar para posible rollback

            // 3. Eliminar la imagen anterior de Cloudinary (si existe)
            if (producto.imagen) {
                await _deleteImageFromCloudinary(producto.imagen);
            }

            // 4. Actualizar la base de datos
            const updates = { imagen: newImageUrl };
            const updatedProduct = await productoRepository.update(productId, updates, client);

            await client.query('COMMIT');
            return updatedProduct;

        } catch (error) {
            await client.query('ROLLBACK');
            
            // Si la BD falló pero la imagen ya se subió, intentamos borrarla
            if (newImageUrl) {
                console.warn(`Rollback: Intentando eliminar imagen subida ${newImageUrl}`);
                await _deleteImageFromCloudinary(newImageUrl);
            }
            
            // Re-lanzar el error para el controlador
            if (error instanceof BusinessError) {
                throw error;
            } else {
                throw new BusinessError('Error interno del servidor', 500);
            }
        } finally {
            client.release();
        }
    }
};

module.exports = uploadService;