const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const validation = require('../middleware/validation');

// ==================== RUTAS PÚBLICAS ====================

// POST /auth/login - Iniciar sesión
router.post('/login', 
    validation.auth.login,
    validation.handleValidationErrors,
    authController.login
);

// POST /auth/register - Registrar nuevo usuario (solo administradores)
router.post('/register',
    validation.auth.register,
    validation.handleValidationErrors,
    authController.register
);

// POST /auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password',
    validation.auth.forgotPassword,
    validation.handleValidationErrors,
    authController.forgotPassword
);

// POST /auth/reset-password - Restablecer contraseña con token
router.post('/reset-password',
    validation.auth.resetPassword,
    validation.handleValidationErrors,
    authController.resetPassword
);

// ==================== RUTAS PROTEGIDAS ====================

// GET /auth/me - Obtener información del usuario actual
router.get('/me', 
    authMiddleware.verifyToken, 
    authController.getMe
);

// POST /auth/change-password - Cambiar contraseña
router.post('/change-password',
    authMiddleware.verifyToken,
    validation.auth.changePassword,
    validation.handleValidationErrors,
    authController.changePassword
);

// POST /auth/check-permission - Verificar permisos para una ruta
router.post('/check-permission',
    authMiddleware.verifyToken,
    authController.checkPermission
);

// POST /auth/refresh-token - Refrescar token JWT
router.post('/refresh-token',
    authMiddleware.verifyToken,
    authController.refreshToken
);

// POST /auth/logout - Cerrar sesión
router.post('/logout',
    authMiddleware.verifyToken,
    authController.logout
);

// GET /auth/profile - Obtener perfil completo del usuario
router.get('/profile',
    authMiddleware.verifyToken,
    authController.getProfile
);

// PUT /auth/profile - Actualizar perfil del usuario
router.put('/profile',
    authMiddleware.verifyToken,
    validation.auth.updateProfile,
    validation.handleValidationErrors,
    authController.updateProfile
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// GET /auth/users - Listar usuarios (solo administradores)
router.get('/users',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin', 'dueno']),
    authController.getUsers
);

// PUT /auth/users/:id/status - Activar/desactivar usuario
router.put('/users/:id/status',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin', 'dueno']),
    validation.auth.updateUserStatus,
    validation.handleValidationErrors,
    authController.updateUserStatus
);

// PUT /auth/users/:id/role - Cambiar rol de usuario
router.put('/users/:id/role',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin', 'dueno']),
    validation.auth.updateUserRole,
    validation.handleValidationErrors,
    authController.updateUserRole
);

module.exports = router;