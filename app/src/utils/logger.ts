import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, json, colorize } = winston.format;

// Custom console format
const consoleFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      ),
    }),
    // File transport to log all logs in JSON format
    new winston.transports.File({
      filename: path.join(logDir, 'server.log.json'),
      format: json(),
    }),
    // Separate file for error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log.json'),
      level: 'error',
      format: json(),
    }),
  ],
});

// Stream for morgan to use
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
