const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.json()
    ),
    defaultMeta: { service: 'pos-backend' },
    transports: [
        // Archivo para errores
        new transports.File({ 
            filename: path.join(__dirname, '../../logs/error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Archivo para todos los logs
        new transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Si no estamos en producción, también loggear a la consola
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        )
    }));
}

// Métodos helper para diferentes contextos
logger.api = (message, meta = {}) => {
    logger.info(message, { ...meta, type: 'API' });
};

logger.database = (message, meta = {}) => {
    logger.info(message, { ...meta, type: 'DATABASE' });
};

logger.security = (message, meta = {}) => {
    logger.warn(message, { ...meta, type: 'SECURITY' });
};

logger.audit = (message, userId, action, meta = {}) => {
    logger.info(message, { 
        ...meta, 
        type: 'AUDIT', 
        userId, 
        action,
        timestamp: new Date().toISOString()
    });
};

module.exports = logger;