import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }), // Capture stack trace
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({ 
            filename: path.join('logs', 'combined.log') 
        }),
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({ 
            filename: path.join('logs', 'error.log'), 
            level: 'error' 
        }),
        // Also log to console with colors
        new winston.transports.Console({
            format: combine(
                colorize(),
                logFormat
            )
        })
    ]
});

export default logger;
