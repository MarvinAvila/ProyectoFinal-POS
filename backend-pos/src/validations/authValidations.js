const { body, validationResult } = require('express-validator');

const authValidations = {
    // Validaciones para login
    login: [
        body('correo')
            .isEmail()
            .normalizeEmail()
            .withMessage('Debe proporcionar un correo electrónico válido'),
        
        body('contrasena')
            .isLength({ min: 1 })
            .withMessage('La contraseña es requerida')
    ],
    
    // Validaciones para registro de usuarios
    register: [
        body('nombre')
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .trim()
            .escape(),
        
        body('correo')
            .isEmail()
            .normalizeEmail()
            .withMessage('Debe proporcionar un correo electrónico válido'),
        
        body('contrasena')
            .isLength({ min: 6 })
            .withMessage('La contraseña debe tener al menos 6 caracteres')
    ],
    
    // Validaciones para cambio de contraseña
    changePassword: [
        body('currentPassword')
            .isLength({ min: 1 })
            .withMessage('La contraseña actual es requerida'),
        
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    ],
    
    // Validaciones para recuperación de contraseña
    forgotPassword: [
        body('correo')
            .isEmail()
            .normalizeEmail()
            .withMessage('Debe proporcionar un correo electrónico válido')
    ],
    
    // Validaciones para reset de contraseña
    resetPassword: [
        body('token')
            .isLength({ min: 1 })
            .withMessage('El token es requerido'),
        
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    ],
    
    // Validaciones para actualizar perfil
    updateProfile: [
        body('nombre')
            .optional()
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .trim()
            .escape(),
        
        body('correo')
            .optional()
            .isEmail()
            .normalizeEmail()
            .withMessage('Debe proporcionar un correo electrónico válido')
    ],
    
    // Validaciones para actualizar estado de usuario (temporal - básica)
    updateUserStatus: [
        body('activo')
            .isBoolean()
            .withMessage('El estado activo debe ser true o false')
    ],
    
    // Validaciones para actualizar rol de usuario (temporal - básica)
    updateUserRole: [
        body('rol')
            .isIn(['admin', 'cajero', 'gerente', 'dueno'])
            .withMessage('Rol no válido')
    ],
    
    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = authValidations;