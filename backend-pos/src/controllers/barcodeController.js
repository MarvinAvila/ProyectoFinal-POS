// controllers/barcodeController.js
const BarcodeService = require('../services/barcodeService');
const QRService = require('../services/qrService');
const LabelService = require('../services/labelService');
const BarcodeGenerator = require('../utils/barcodeGenerator'); // <-- Agregar esta línea
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

class BarcodeController {
  
  /**
   * Genera código de barras individual
   * GET /api/barcodes/barcode/:text
   */
  async generateBarcode(req, res) {
    try {
      const { text } = req.params;
      const options = req.query;
      
      logger.api('Generando código de barras individual', { text, options });
      
      const barcodeBuffer = await BarcodeService.generateBarcode(text, options);
      
      // Configurar headers para imagen
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': barcodeBuffer.length,
        'Content-Disposition': `inline; filename="barcode_${text}.png"`,
        'Cache-Control': 'public, max-age=86400' // Cache de 1 día
      });
      
      res.send(barcodeBuffer);
      
    } catch (error) {
      logger.error('Error en generateBarcode:', error);
      responseHelper.error(res, error.message, 500, error);
    }
  }

  /**
   * Genera código QR individual
   * GET /api/barcodes/qr/:text
   */
  async generateQR(req, res) {
    try {
      const { text } = req.params;
      const options = req.query;
      
      logger.api('Generando QR individual', { text: text.substring(0, 50), options });
      
      const qrBuffer = await QRService.generateQRCode(text, options);
      
      // Configurar headers para imagen
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': qrBuffer.length,
        'Content-Disposition': `inline; filename="qr_${Date.now()}.png"`,
        'Cache-Control': 'public, max-age=86400'
      });
      
      res.send(qrBuffer);
      
    } catch (error) {
      logger.error('Error en generateQR:', error);
      responseHelper.error(res, error.message, 500, error);
    }
  }

  /**
   * Genera PDF de etiqueta para producto
   * GET /api/barcodes/label/:productId
   */
  async generateLabel(req, res) {
    try {
      const { productId } = req.params;
      const options = req.query;
      
      logger.api('Generando etiqueta PDF', { productId, options });
      
      // En una implementación real, aquí buscarías el producto de la BD
      // Por ahora simulamos datos para testing
      const mockProduct = {
        id_producto: productId,
        nombre: `Producto ${productId}`,
        codigo_barra: `PRD${productId}${Date.now()}`,
        precio_venta: 99.99,
        unidad: 'pza',
        stock: 50
      };
      
      const pdfBuffer = await LabelService.generateProductLabel(mockProduct, options);
      
      // Configurar headers para PDF
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'Content-Disposition': `attachment; filename="etiqueta_${mockProduct.codigo_barra}.pdf"`,
        'Cache-Control': 'no-cache'
      });
      
      res.send(pdfBuffer);
      
    } catch (error) {
      logger.error('Error en generateLabel:', error);
      responseHelper.error(res, error.message, 500, error);
    }
  }

  /**
   * Generación masiva de códigos
   * POST /api/barcodes/batch
   */
  async batchGenerate(req, res) {
    try {
      const { products, options } = req.body;
      
      logger.api('Iniciando generación masiva de códigos', { 
        totalProductos: products.length,
        options 
      });
      
      const results = await Promise.all(
        products.map(async (product) => {
          try {
            // Generar código de barras
            const barcodeResult = await BarcodeService.generateProductCodes(product);
            
            // Generar QR
            const qrResult = await QRService.generateProductQR(product);
            
            return {
              success: true,
              producto_id: product.id_producto,
              producto_nombre: product.nombre,
              barcode_url: barcodeResult.barcode_url,
              qr_url: qrResult.qr_url,
              public_ids: {
                barcode: barcodeResult.barcode_public_id,
                qr: qrResult.qr_public_id
              }
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
      
      logger.api('Generación masiva completada', {
        total: results.length,
        exitosos: successful.length,
        fallidos: failed.length
      });

      responseHelper.success(res, {
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length
        },
        results: results
      });
      
    } catch (error) {
      logger.error('Error en batchGenerate:', error);
      responseHelper.error(res, error.message, 500, error);
    }
  }

  /**
   * Decodifica información de QR
   * POST /api/barcodes/decode
   */
  async decodeQR(req, res) {
    try {
      const { qrText } = req.body;
      
      if (!qrText) {
        return responseHelper.error(res, 'Texto QR requerido', 400);
      }
      
      logger.api('Decodificando QR', { qrText: qrText.substring(0, 100) });
      
      const decodeResult = QRService.decodeQRData(qrText);
      
      if (!decodeResult.success) {
        return responseHelper.error(res, 'No se pudo decodificar el QR', 400, {
          rawText: qrText
        });
      }
      
      responseHelper.success(res, {
        decoded: decodeResult.data,
        tipo: decodeResult.tipo,
        raw_length: qrText.length
      });
      
    } catch (error) {
      logger.error('Error en decodeQR:', error);
      responseHelper.error(res, error.message, 500, error);
    }
  }

  /**
   * Valida formato de código de barras
   * GET /api/barcodes/validate/:barcode
   */
  async validateBarcode(req, res) {
    try {
      const { barcode } = req.params;
      
      const validation = BarcodeGenerator.validateBarcodeFormat(barcode);
      
      responseHelper.success(res, {
        barcode: barcode,
        isValid: validation.isValid,
        ...(validation.error && { error: validation.error })
      });
      
    } catch (error) {
      logger.error('Error en validateBarcode:', error);
      responseHelper.error(res, error.message, 500, error);
    }
  }
}

module.exports = new BarcodeController();