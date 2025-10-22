const chatbotService = require('../services/chatbotService');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

const chatbotController = {
    async processMessage(req, res) {
        try {
            const { message } = req.body;
            
            // Verificar que el usuario está autenticado y tiene rol
            if (!req.user || !req.user.id_usuario || !req.user.rol) {
                return responseHelper.unauthorized(res, 'Usuario no autenticado o sin rol definido');
            }

            const userId = req.user.id_usuario;
            const userRole = req.user.rol;

            logger.info('Mensaje recibido para chatbot', { 
                userId, 
                userRole,
                message: message.substring(0, 100) // Log truncado por seguridad
            });

            // Obtener respuesta del chatbot con control de roles
            const response = await chatbotService.getResponse(message, userRole);

            logger.info('Respuesta del chatbot enviada', { 
                userId, 
                userRole,
                messageLength: message.length,
                responseLength: response.length
            });

            return responseHelper.success(res, { response });
        } catch (error) {
            logger.error('Error en chatbotController.processMessage:', error);
            return responseHelper.error(res, 'Error procesando el mensaje del chatbot', 500, error);
        }
    }
};

module.exports = chatbotController;