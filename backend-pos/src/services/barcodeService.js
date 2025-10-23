// services/barcodeService.js
const bwipjs = require('bwip-js');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

class BarcodeService {
  
  /**
   * Genera código de barras como Buffer
   */
  static async generateBarcode(text, options = {}) {
    try {
      const buffer = await bwipjs.toBuffer({
        bcid: 'code128',       // Tipo de código de barras
        text: text,            // Texto a codificar
        scale: options.scale || 3,           // Escala (tamaño)
        height: options.height || 10,        // Altura del código
        includetext: true,     // Incluir texto debajo
        textxalign: 'center',  // Alineación del texto
        textsize: options.textSize || 10,    // Tamaño del texto
        ...options
      });
      
      logger.debug(`Código de barras generado: ${text} (${buffer.length} bytes)`);
      return buffer;
      
    } catch (error) {
      logger.error('Error generando código de barras:', error);
      throw new Error(`No se pudo generar el código de barras: ${error.message}`);
    }
  }

  /**
   * Sube código de barras a Cloudinary
   */
  static async uploadBarcodeToCloudinary(barcodeBuffer, barcodeText) {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'codigos_barras',
            public_id: `barcode_${barcodeText}`,
            resource_type: 'image',
            format: 'png',
            quality: 'auto:good'
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        uploadStream.end(barcodeBuffer);
      });
    } catch (error) {
      logger.error('Error subiendo código de barras a Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Genera ambos códigos (barras + QR) para un producto
   */
  static async generateProductCodes(productData, qrBuffer) {
    try {
      const { codigo_barra } = productData;
      
      if (!codigo_barra) {
        throw new Error('Se requiere código de barras para generar códigos');
      }

      // Generar código de barras
      const barcodeBuffer = await this.generateBarcode(codigo_barra, {
        scale: 3,
        height: 12,
        textsize: 12
      });

      // Subir a Cloudinary
      const [barcodeResult] = await Promise.all([
        this.uploadBarcodeToCloudinary(barcodeBuffer, codigo_barra)
      ]);

      logger.api('Códigos generados para producto', {
        producto: productData.nombre,
        codigo_barra: codigo_barra,
        barcode_url: barcodeResult.secure_url
      });

      return {
        barcode_url: barcodeResult.secure_url,
        barcode_public_id: barcodeResult.public_id,
        qr_buffer: qrBuffer // QR se maneja por separado
      };
      
    } catch (error) {
      logger.error('Error generando códigos de producto:', error);
      throw error;
    }
  }

  /**
   * Regenera códigos para producto existente
   */
  static async regenerateProductCodes(producto, newBarcode = null) {
    try {
      const codigoBarra = newBarcode || producto.codigo_barra;
      
      // Eliminar códigos antiguos de Cloudinary si existen
      if (producto.codigos_public_ids) {
        const publicIds = Object.values(producto.codigos_public_ids);
        await this.deleteCodesFromCloudinary(publicIds);
      }

      // Generar nuevos códigos
      const newCodes = await this.generateProductCodes(
        { ...producto, codigo_barra: codigoBarra },
        null // QR se generará por separado
      );

      return newCodes;
      
    } catch (error) {
      logger.error('Error regenerando códigos:', error);
      throw error;
    }
  }

  /**
   * Elimina códigos de Cloudinary
   */
  static async deleteCodesFromCloudinary(publicIds) {
    try {
      if (!publicIds || publicIds.length === 0) return;
      
      const results = await Promise.all(
        publicIds.map(publicId => 
          cloudinary.uploader.destroy(publicId)
            .catch(error => {
              logger.warn(`No se pudo eliminar ${publicId} de Cloudinary:`, error);
              return { result: 'not_found' };
            })
        )
      );
      
      logger.debug(`Códigos eliminados de Cloudinary: ${publicIds.join(', ')}`);
      return results;
      
    } catch (error) {
      logger.error('Error eliminando códigos de Cloudinary:', error);
      throw error;
    }
  }
}

module.exports = BarcodeService;