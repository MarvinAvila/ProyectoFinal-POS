const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const authMiddleware = require('../middleware/auth');
const chatbotValidations = require('../middleware/validation/chatbot');

// Todas las rutas del chatbot requieren autenticación
router.use(authMiddleware.verifyToken);

// POST /api/chatbot/message - Enviar un mensaje al chatbot
router.post('/message',
    chatbotValidations.processMessage,
    chatbotValidations.handleValidationErrors,
    chatbotController.processMessage
);

module.exports = router;