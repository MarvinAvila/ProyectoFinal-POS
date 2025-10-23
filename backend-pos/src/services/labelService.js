// services/labelService.js
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

class LabelService {
  
  /**
   * Configuraciones de tamaños de etiqueta
   */
  static getLabelSizes() {
    return {
      small: { width: 200, height: 100 },   // 50x25mm
      medium: { width: 300, height: 150 },  // 75x38mm  
      large: { width: 400, height: 200 },   // 100x50mm
      thermal: { width: 576, height: 300 }  // 80mm thermal
    };
  }

  /**
   * Genera PDF de etiqueta individual para producto
   */
  static async generateProductLabel(producto, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const size = this.getLabelSizes()[options.size || 'medium'];
        const doc = new PDFDocument({ 
          size: [size.width, size.height],
          margins: { top: 5, bottom: 5, left: 5, right: 5 }
        });
        
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ===== DISEÑO DE ETIQUETA =====
        
        // Encabezado - Nombre del producto
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(producto.nombre, 10, 10, { 
             width: size.width - 20, 
             align: 'center',
             ellipsis: true 
           });

        // Línea separadora
        doc.moveTo(10, 25)
           .lineTo(size.width - 10, 25)
           .strokeColor('#cccccc')
           .stroke();

        // Código de barras (texto)
        doc.fontSize(8)
           .font('Helvetica')
           .text(`Código: ${producto.codigo_barra}`, 10, 35);

        // Precio
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`$${producto.precio_venta}`, 10, 50);

        // Información adicional
        if (producto.unidad) {
          doc.fontSize(7)
             .font('Helvetica')
             .text(`Unidad: ${producto.unidad}`, size.width - 60, 50);
        }

        if (producto.stock !== undefined) {
          doc.fontSize(7)
             .font('Helvetica')
             .text(`Stock: ${producto.stock}`, size.width - 60, 60);
        }

        // Pie de página
        doc.fontSize(6)
           .font('Helvetica-Oblique')
           .text(`Generado: ${new Date().toLocaleDateString()}`, 10, size.height - 15);

        // NOTA: Las imágenes de códigos se agregarán cuando tengamos las URLs
        if (producto.codigo_barras_url && options.includeBarcode) {
          // Aquí iría la lógica para agregar imagen de código de barras
          // doc.image(barcodeImage, x, y, { width: 150, height: 30 });
        }

        doc.end();
        
        logger.debug(`PDF etiqueta generado: ${producto.nombre} (${size.width}x${size.height})`);
        
      } catch (error) {
        logger.error('Error generando PDF de etiqueta:', error);
        reject(error);
      }
    });
  }

  /**
   * Genera PDF con múltiples etiquetas (para lote)
   */
  static async generateBatchLabels(productos, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const labelSize = this.getLabelSizes()[options.size || 'medium'];
        const labelsPerRow = options.labelsPerRow || 2;
        const labelsPerPage = options.labelsPerPage || 8;
        
        const doc = new PDFDocument({ 
          size: 'A4',
          margins: { top: 20, bottom: 20, left: 20, right: 20 }
        });
        
        const chunks = [];
        let currentLabel = 0;
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Calcular posiciones para grid de etiquetas
        const labelWidth = (doc.page.width - 40) / labelsPerRow;
        const labelHeight = 80; // Altura fija por etiqueta
        
        productos.forEach((producto, index) => {
          // Nueva página si es necesario
          if (index > 0 && index % labelsPerPage === 0) {
            doc.addPage();
            currentLabel = 0;
          }
          
          // Calcular posición en grid
          const row = Math.floor(currentLabel / labelsPerRow);
          const col = currentLabel % labelsPerRow;
          
          const x = 20 + (col * labelWidth);
          const y = 20 + (row * labelHeight);
          
          // Dibujar bordes de etiqueta
          doc.rect(x, y, labelWidth - 5, labelHeight - 5)
             .strokeColor('#eeeeee')
             .stroke();
          
          // Contenido de etiqueta
          doc.fontSize(8)
             .font('Helvetica-Bold')
             .text(producto.nombre, x + 5, y + 5, {
               width: labelWidth - 15,
               ellipsis: true
             });
          
          doc.fontSize(7)
             .font('Helvetica')
             .text(`Cod: ${producto.codigo_barra}`, x + 5, y + 20);
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .text(`$${producto.precio_venta}`, x + 5, y + 35);
          
          if (producto.unidad) {
            doc.fontSize(6)
               .text(producto.unidad, x + labelWidth - 25, y + 35);
          }
          
          currentLabel++;
        });

        doc.end();
        
        logger.api(`PDF de lote generado: ${productos.length} etiquetas`);
        
      } catch (error) {
        logger.error('Error generando PDF de lote:', error);
        reject(error);
      }
    });
  }

  /**
   * Genera etiqueta premium con imágenes de códigos
   */
  static async generatePremiumLabel(producto, barcodeImage, qrImage) {
    // Implementación avanzada para cuando tengamos las imágenes
    logger.debug('Etiqueta premium solicitada para:', producto.nombre);
    throw new Error('Funcionalidad premium no implementada aún');
  }

  /**
   * Obtiene configuración de impresión por tipo de producto
   */
  static getPrintConfig(tipoProducto) {
    const configs = {
      default: { size: 'medium', includeBarcode: true },
      pequeño: { size: 'small', includeBarcode: true },
      grande: { size: 'large', includeBarcode: true },
      promocion: { size: 'medium', includeBarcode: false }
    };
    
    return configs[tipoProducto] || configs.default;
  }
}

module.exports = LabelService;