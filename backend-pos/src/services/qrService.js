// services/qrService.js
const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

class QRService {
  
  /**
   * Genera estructura de datos para QR
   */
  static generateQRData(productData) {
    const {
      id_producto,
      nombre,
      codigo_barra,
      precio_venta,
      precio_compra,
      stock,
      unidad,
      id_categoria,
      id_proveedor,
      fecha_creacion
    } = productData;

    return {
      // Identificación
      id: id_producto,
      codigo: codigo_barra,
      nombre: nombre,
      
      // Precios
      precio_venta: precio_venta,
      precio_compra: precio_compra,
      unidad: unidad,
      
      // Inventario
      stock: stock,
      categoria_id: id_categoria,
      proveedor_id: id_proveedor,
      
      // Metadata
      tipo: 'producto',
      sistema: 'POS',
      fecha_creacion: fecha_creacion || new Date().toISOString(),
      
      // URLs (se llenarán después)
      url_barras: null,
      url_qr: null
    };
  }

  /**
   * Genera código QR como Buffer
   */
  static async generateQRCode(qrData, options = {}) {
    try {
      // Convertir datos a JSON string
      const qrText = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
      
      const buffer = await QRCode.toBuffer(qrText, {
        width: options.width || 300,
        margin: options.margin || 2,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        },
        errorCorrectionLevel: options.errorCorrection || 'M',
        ...options
      });
      
      logger.debug(`QR generado: ${qrText.substring(0, 50)}... (${buffer.length} bytes)`);
      return buffer;
      
    } catch (error) {
      logger.error('Error generando QR:', error);
      throw new Error(`No se pudo generar el código QR: ${error.message}`);
    }
  }

  /**
   * Sube código QR a Cloudinary
   */
  static async uploadQRToCloudinary(qrBuffer, qrIdentifier) {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'codigos_qr',
            public_id: `qr_${qrIdentifier}`,
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
        
        uploadStream.end(qrBuffer);
      });
    } catch (error) {
      logger.error('Error subiendo QR a Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Genera QR completo para producto (datos + imagen)
   */
  static async generateProductQR(productData) {
    try {
      const { codigo_barra, nombre } = productData;
      
      if (!codigo_barra) {
        throw new Error('Se requiere código de barras para generar QR');
      }

      // 1. Generar estructura de datos
      const qrData = this.generateQRData(productData);
      
      // 2. Generar imagen QR
      const qrBuffer = await this.generateQRCode(qrData, {
        width: 350,
        margin: 3,
        errorCorrection: 'H' // Alta corrección para más datos
      });

      // 3. Subir a Cloudinary
      const qrResult = await this.uploadQRToCloudinary(qrBuffer, codigo_barra);

      // 4. Actualizar datos QR con URLs
      qrData.url_barras = productData.codigo_barras_url;
      qrData.url_qr = qrResult.secure_url;

      logger.api('QR generado para producto', {
        producto: nombre,
        codigo_barra: codigo_barra,
        qr_url: qrResult.secure_url,
        datos_incluidos: Object.keys(qrData).length
      });

      return {
        qr_url: qrResult.secure_url,
        qr_public_id: qrResult.public_id,
        qr_data: qrData,
        qr_buffer: qrBuffer
      };
      
    } catch (error) {
      logger.error('Error generando QR de producto:', error);
      throw error;
    }
  }

  /**
   * Valida formato de datos QR
   */
  static validateQRData(qrData) {
    if (!qrData) {
      return { isValid: false, error: 'Datos QR vacíos' };
    }

    try {
      const data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      
      const requiredFields = ['codigo', 'nombre', 'precio_venta'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        return { 
          isValid: false, 
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}` 
        };
      }
      
      return { isValid: true, data: data };
      
    } catch (error) {
      return { isValid: false, error: 'Formato JSON inválido' };
    }
  }

  /**
   * Decodifica QR existente
   */
  static decodeQRData(qrText) {
    try {
      const data = JSON.parse(qrText);
      return {
        success: true,
        data: data,
        tipo: data.tipo || 'desconocido'
      };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo decodificar el QR',
        rawText: qrText
      };
    }
  }

  /**
   * Genera QR para múltiples productos (lote)
   */
  static async generateBatchQR(productsData) {
    try {
      const results = await Promise.all(
        productsData.map(async (product) => {
          try {
            const qrResult = await this.generateProductQR(product);
            return {
              success: true,
              producto_id: product.id_producto,
              producto_nombre: product.nombre,
              ...qrResult
            };
          } catch (error) {
            return {
              success: false,
              producto_id: product.id_producto,
              producto_nombre: product.nombre,
              error: error.message
            };
          }
        })
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      logger.api('Generación masiva de QR completada', {
        total: results.length,
        exitosos: successful.length,
        fallidos: failed.length
      });

      return {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        results: results
      };
      
    } catch (error) {
      logger.error('Error en generación masiva de QR:', error);
      throw error;
    }
  }
}

module.exports = QRService;