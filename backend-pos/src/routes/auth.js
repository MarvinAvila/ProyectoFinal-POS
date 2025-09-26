// routes/auth.js - Actualizado
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const validation = require('../middleware/validation');

// Public routes
router.post('/login', 
    validation.auth.login,  // Agregar validaciones si las tienes
    validation.handleValidationErrors,
    authController.login
);

// Protected routes
router.get('/me', 
    authMiddleware.verifyToken, 
    authController.getMe
);

router.post('/change-password',
    authMiddleware.verifyToken,
    validation.auth.changePassword,  // Agregar validaciones
    validation.handleValidationErrors,
    authController.changePassword
);

router.post('/check-permission',
    authMiddleware.verifyToken,
    authController.checkPermission
);

router.post('/refresh-token',
    authMiddleware.verifyToken,
    authController.refreshToken
);

router.post('/logout',
    authMiddleware.verifyToken,
    authController.logout
);

module.exports = router;