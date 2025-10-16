// src/controllers/uploadController.js - VERSIÓN CORREGIDA
const cloudinary = require('../config/cloudinary');
const db = require('../config/database');
const responseHelper = require('../utils/responseHelper');

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No se proporcionó ninguna imagen' 
      });
    }

    // Convertir buffer a base64 para Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Subir a Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'punto_venta',
      quality: 'auto:good',
      fetch_format: 'auto'
    });

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor al subir imagen' 
    });
  }
};

const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    await cloudinary.uploader.destroy(publicId);
    
    res.json({ 
      success: true,
      message: 'Imagen eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al eliminar imagen' 
    });
  }
};

// ✅ VERSIÓN CORREGIDA - usa consultas nativas como tu productoController
const updateProductImage = async (req, res) => {
  const client = await db.getClient();
  try {
    const { productId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    await client.query('BEGIN');

    // Buscar producto actual usando consulta nativa
    const productoResult = await client.query(
      'SELECT * FROM productos WHERE id_producto = $1',
      [productId]
    );

    if (productoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return responseHelper.notFound(res, 'Producto');
    }

    const producto = productoResult.rows[0];

    // Eliminar imagen anterior si existe
    if (producto.imagen) {
      const urlParts = producto.imagen.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const publicId = 'punto_venta/' + fileName.split('.')[0];
      
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.log('No se pudo eliminar imagen anterior:', deleteError);
      }
    }

    // Subir nueva imagen
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'punto_venta',
      quality: 'auto:good',
      fetch_format: 'auto'
    });

    // Actualizar producto con nueva imagen usando consulta nativa
    const updateResult = await client.query(
      'UPDATE productos SET imagen = $1 WHERE id_producto = $2 RETURNING *',
      [result.secure_url, productId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Imagen del producto actualizada exitosamente',
      product: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar imagen del producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  updateProductImage
};