// utils/barcodeGenerator.js
const db = require('../config/database');
const logger = require('./logger');

class BarcodeGenerator {
  
  /**
   * Genera un código de barras único para productos
   * Formato: PRD + timestamp + random (ej: PRD1739987654321)
   */
  static async generateUniqueBarcode() {
    const client = await db.getClient();
    try {
      let isUnique = false;
      let attempts = 0;
      let barcode = '';
      
      while (!isUnique && attempts < 10) {
        // Generar código único
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        barcode = `PRD${timestamp}${random}`;
        
        // Verificar si ya existe
        const result = await client.query(
          'SELECT id_producto FROM productos WHERE codigo_barra = $1',
          [barcode]
        );
        
        if (result.rows.length === 0) {
          isUnique = true;
        }
        
        attempts++;
      }
      
      if (!isUnique) {
        throw new Error('No se pudo generar un código de barras único después de 10 intentos');
      }
      
      logger.debug(`Código de barras único generado: ${barcode}`);
      return barcode;
      
    } catch (error) {
      logger.error('Error generando código de barras único:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Valida el formato de un código de barras
   */
  static validateBarcodeFormat(barcode) {
    if (!barcode || typeof barcode !== 'string') {
      return { isValid: false, error: 'Código de barras inválido' };
    }
    
    if (barcode.length < 3 || barcode.length > 50) {
      return { isValid: false, error: 'El código debe tener entre 3 y 50 caracteres' };
    }
    
    // Validar caracteres permitidos (letras, números, guiones)
    const validChars = /^[A-Za-z0-9\-_]+$/;
    if (!validChars.test(barcode)) {
      return { isValid: false, error: 'Solo se permiten letras, números, guiones y guiones bajos' };
    }
    
    return { isValid: true };
  }

  /**
   * Genera código de barras basado en datos del producto
   */
  static generateBarcodeFromProduct(productData) {
    const { nombre, id_categoria, precio_compra } = productData;
    
    // Crear código basado en categoría + nombre + precio
    const categoriaCode = id_categoria ? `C${id_categoria}` : 'C0';
    const nombreCode = nombre.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const precioCode = Math.round(precio_compra).toString().padStart(4, '0');
    
    return `${categoriaCode}${nombreCode}${precioCode}${Date.now().toString().slice(-4)}`;
  }
}

module.exports = BarcodeGenerator;