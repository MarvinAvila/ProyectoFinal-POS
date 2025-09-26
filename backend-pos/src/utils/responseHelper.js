const logger = require('./logger');

const responseHelper = {
    // Respuesta exitosa
    success: (res, data = null, message = null, statusCode = 200) => {
        const response = { success: true };
        
        if (data !== null) response.data = data;
        if (message !== null) response.message = message;
        
        logger.api(`Respuesta exitosa: ${statusCode}`, { 
            path: res.req.originalUrl,
            method: res.req.method,
            statusCode 
        });
        
        return res.status(statusCode).json(response);
    },

    // Respuesta de error
    error: (res, message = 'Error interno del servidor', statusCode = 500, error = null) => {
        const response = { 
            success: false, 
            message 
        };
        
        // En desarrollo, incluir detalles del error
        if (process.env.NODE_ENV !== 'production' && error) {
            response.error = {
                message: error.message,
                stack: error.stack
            };
        }
        
        logger.error(`Error ${statusCode}: ${message}`, {
            path: res.req.originalUrl,
            method: res.req.method,
            statusCode,
            error: error?.message,
            userId: res.req.user?.id_usuario
        });
        
        return res.status(statusCode).json(response);
    },

    // Respuesta de validación fallida
    validationError: (res, errors) => {
        logger.security('Error de validación', {
            path: res.req.originalUrl,
            method: res.req.method,
            errors: errors.array ? errors.array() : errors
        });
        
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: errors.array ? errors.array() : errors
        });
    },

    // Respuesta de no encontrado
    notFound: (res, resource = 'Recurso') => {
        logger.api(`${resource} no encontrado`, {
            path: res.req.originalUrl,
            method: res.req.method,
            statusCode: 404
        });
        
        return res.status(404).json({
            success: false,
            message: `${resource} no encontrado`
        });
    },

    // Respuesta de acceso denegado
    forbidden: (res, message = 'Acceso denegado') => {
        logger.security('Acceso denegado', {
            path: res.req.originalUrl,
            method: res.req.method,
            userId: res.req.user?.id_usuario,
            statusCode: 403
        });
        
        return res.status(403).json({
            success: false,
            message
        });
    },

    // Respuesta de no autenticado
    unauthorized: (res, message = 'No autenticado') => {
        logger.security('Acceso no autorizado', {
            path: res.req.originalUrl,
            method: res.req.method,
            statusCode: 401
        });
        
        return res.status(401).json({
            success: false,
            message
        });
    },

    // Respuesta de conflicto (duplicados, etc.)
    conflict: (res, message = 'Conflicto') => {
        logger.api(`Conflicto: ${message}`, {
            path: res.req.originalUrl,
            method: res.req.method,
            statusCode: 409
        });
        
        return res.status(409).json({
            success: false,
            message
        });
    }
};

module.exports = responseHelper;