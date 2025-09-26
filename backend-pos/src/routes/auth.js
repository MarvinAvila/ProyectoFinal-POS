const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/me', authMiddleware.verifyToken, authController.getMe);
router.post('/change-password', authMiddleware.verifyToken, authController.changePassword);

module.exports = router;