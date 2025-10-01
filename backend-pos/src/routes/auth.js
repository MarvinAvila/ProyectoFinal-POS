const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const authValidations = require('../validations/authValidations');

// Aplicar logging a todas las rutas autenticadas
//router.use(authMiddleware.requestLogger);

// ==================== RUTAS PÚBLICAS ====================

// POST /auth/login - Iniciar sesión
router.post('/login', 
    authValidations.login,
    authValidations.handleValidationErrors,
    authController.login
);

// POST /auth/register - Registrar nuevo usuario (solo admin/dueno)
router.post('/register',
    authValidations.register,
    authValidations.handleValidationErrors,
    authController.register
);

// POST /auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password',
    authValidations.forgotPassword,
    authValidations.handleValidationErrors,
    authController.forgotPassword
);

// POST /auth/reset-password - Restablecer contraseña con token
router.post('/reset-password',
    authValidations.resetPassword,
    authValidations.handleValidationErrors,
    authController.resetPassword
);

// ==================== RUTAS PROTEGIDAS ====================

// GET /auth/me - Obtener información del usuario actual
router.get('/me', 
    authMiddleware.verifyToken,
    authMiddleware.requireActive,
    authController.getMe
);

// POST /auth/change-password - Cambiar contraseña
router.post('/change-password',
    authMiddleware.verifyToken,
    authMiddleware.requireActive,
    authValidations.changePassword,
    authValidations.handleValidationErrors,
    authController.changePassword
);

// POST /auth/check-permission - Verificar permisos para una ruta
router.post('/check-permission',
    authMiddleware.verifyToken,
    authMiddleware.requireActive,
    authController.checkPermission
);

// POST /auth/refresh-token - Refrescar token JWT
router.post('/refresh-token',
    authMiddleware.verifyToken,
    authMiddleware.requireActive,
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
    authMiddleware.requireActive,
    authController.getProfile
);

// PUT /auth/profile - Actualizar perfil del usuario
router.put('/profile',
    authMiddleware.verifyToken,
    authMiddleware.requireActive,
    authValidations.updateProfile,
    authValidations.handleValidationErrors,
    authController.updateProfile
);

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// GET /auth/users - Listar usuarios (solo administradores)
router.get('/users',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin', 'dueno']),
    authMiddleware.requirePermission('usuarios', 'read'),
    authController.getUsers
);

// PUT /auth/users/:id/status - Activar/desactivar usuario
router.put('/users/:id/status',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin', 'dueno']),
    authMiddleware.requirePermission('usuarios', 'write'),
    authValidations.updateUserStatus,
    authValidations.handleValidationErrors,
    authController.updateUserStatus
);

// PUT /auth/users/:id/role - Cambiar rol de usuario
router.put('/users/:id/role',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin', 'dueno']),
    authMiddleware.requirePermission('usuarios', 'write'),
    authValidations.updateUserRole,
    authValidations.handleValidationErrors,
    authController.updateUserRole
);

module.exports = router;