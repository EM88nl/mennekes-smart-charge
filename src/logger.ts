import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta);
    }
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat
    }),
    // All logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

// Add stream for Morgan (HTTP logging)
export const httpLogStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};
