const { body, param, query, validationResult } = require('express-validator');

const usuarioValidations = {
    // Validaciones para consulta de usuarios
    getAll: [
        query('q')
            .optional()
            .isLength({ max: 100 })
            .withMessage('El término de búsqueda no puede exceder 100 caracteres')
            .trim()
            .escape(),
        
        query('rol')
            .optional()
            .isIn(['admin', 'gerente', 'cajero', 'dueno'])
            .withMessage('Rol debe ser: admin, gerente, cajero o dueno'),
        
        query('activo')
            .optional()
            .isBoolean()
            .withMessage('Activo debe ser true o false'),
        
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número positivo'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100'),
        
        query('sortBy')
            .optional()
            .isIn(['nombre', 'correo', 'rol', 'creado_en', 'ultimo_login'])
            .withMessage('sortBy debe ser: nombre, correo, rol, creado_en o ultimo_login'),
        
        query('sortOrder')
            .optional()
            .isIn(['ASC', 'DESC'])
            .withMessage('sortOrder debe ser ASC o DESC')
    ],

    // Validaciones para obtener por ID
    getById: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido'),
        
        query('includeStats')
            .optional()
            .isBoolean()
            .withMessage('includeStats debe ser true o false')
    ],

    // Validaciones para crear usuario
    create: [
        body('nombre')
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .trim()
            .escape(),
        
        body('correo')
            .isEmail()
            .withMessage('El formato del correo no es válido')
            .normalizeEmail(),
        
        body('contrasena')
            .isLength({ min: 6 })
            .withMessage('La contraseña debe tener al menos 6 caracteres'),
        
        body('rol')
            .optional()
            .isIn(['admin', 'gerente', 'cajero', 'dueno'])
            .withMessage('Rol debe ser: admin, gerente, cajero o dueno')
    ],

    // Validaciones para actualizar usuario
    update: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido'),
        
        body('nombre')
            .optional()
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .trim()
            .escape(),
        
        body('correo')
            .optional()
            .isEmail()
            .withMessage('El formato del correo no es válido')
            .normalizeEmail(),
        
        body('rol')
            .optional()
            .isIn(['admin', 'gerente', 'cajero', 'dueno'])
            .withMessage('Rol debe ser: admin, gerente, cajero o dueno'),
        
        body('activo')
            .optional()
            .isBoolean()
            .withMessage('Activo debe ser true o false')
    ],

    // Validaciones para activar/desactivar usuario
    setActive: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido'),
        
        body('activo')
            .isBoolean()
            .withMessage('Activo debe ser true o false')
    ],

    // Validaciones para cambiar contraseña
    changePassword: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido'),
        
        body('contrasena_actual')
            .optional()
            .isLength({ min: 1 })
            .withMessage('La contraseña actual es requerida'),
        
        body('nueva_contrasena')
            .isLength({ min: 6 })
            .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    ],

    // Validaciones para eliminar usuario
    delete: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de usuario inválido')
    ],

    // Middleware para manejar resultados de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en usuario',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = usuarioValidations;