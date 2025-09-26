const { body, validationResult } = require('express-validator');

const authValidations = {
    // Validaciones para login
    login: [
        body('correo')
            .isEmail()
            .normalizeEmail()
            .withMessage('Debe proporcionar un correo electrónico válido'),
        
        body('contrasena')
            .isLength({ min: 6 })
            .withMessage('La contraseña debe tener al menos 6 caracteres')
            .trim()
            .escape()
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
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
        
        body('rol')
            .optional()
            .isIn(['admin', 'cajero', 'gerente', 'dueno'])
            .withMessage('Rol no válido')
    ],
    
    // Validaciones para cambio de contraseña
    changePassword: [
        body('currentPassword')
            .isLength({ min: 6 })
            .withMessage('La contraseña actual debe tener al menos 6 caracteres'),
        
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número')
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