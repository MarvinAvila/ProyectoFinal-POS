// backend-pos/src/controllers/chatbotController.js
const chatbotService = require('../services/chatbotService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
// --- 1. IMPORTAR EL MODELO PARA BUSCAR EN LA BD ---
const Producto = require('../models/Producto'); 

const chatbotController = {
  async processMessage(req, res) {
    try {
      const { message } = req.body; // El frontend envía 'message'
      
      if (!req.user || !req.user.id_usuario || !req.user.rol) {
        return responseHelper.unauthorized(res, 'Usuario no autenticado o sin rol definido');
      }

      const userId = req.user.id_usuario;
      const userRole = req.user.rol;

      logger.info('Mensaje recibido para chatbot', { 
        userId, 
        userRole,
        message: message.substring(0, 100)
      });

      // --- 2. OBTENER LA INTENCIÓN (ahora es un objeto) ---
      // 'getResponse' devuelve un OBJETO
      // ej: { intent: 'get_price', entity: 'galletas surtidas' }
      // o: { intent: 'static_response', response: '¡Hola!...' }
      const intentData = await chatbotService.getResponse(message, userRole);
      
      let finalResponse; // La respuesta final que enviaremos al usuario

      // --- 3. DECIDIR QUÉ HACER BASADO EN LA INTENCIÓN ---
      switch (intentData.intent) {
        
        case 'get_price': {
          // 4. Si la intención es 'get_price', buscar en la BD
          // (Todos los roles pueden ver precios)
          const producto = await Producto.findByName(intentData.entity);
          if (producto) {
            finalResponse = `El precio de ${producto.nombre} es $${producto.precio_venta}.`;
          } else {
            finalResponse = `No pude encontrar el producto "${intentData.entity}". Intenta ser más específico.`;
          }
          break;
        }

        case 'get_stock': {
          // 5. Si la intención es 'get_stock', buscar en la BD
          // (Todos los roles pueden ver stock)
          const producto = await Producto.findByName(intentData.entity);
          if (producto) {
            finalResponse = `Tenemos ${producto.stock} unidades de ${producto.nombre} en inventario.`;
          } else {
            finalResponse = `No pude encontrar el producto "${intentData.entity}". Intenta ser más específico.`;
          }
          break;
        }

        case 'static_response':
        case 'fallback':
        default:
          // 6. Usar la respuesta estática (FAQ o fallback)
          finalResponse = intentData.response;
          break;
      }

      logger.info('Respuesta del chatbot enviada', { 
        userId, 
        userRole,
        messageLength: message.length,
        responseLength: finalResponse.length
      });

      // 7. Enviar la respuesta final al usuario
      return responseHelper.success(res, { response: finalResponse });

    } catch (error) {
      logger.error('Error en chatbotController.processMessage:', error);
      return responseHelper.error(res, 'Error procesando el mensaje del chatbot', 500, error);
    }
  }
};

module.exports = chatbotController;