/**
 * Logger Configuration
 * Winston-based logger with file and console transports
 */

const winston = require('winston');
const path = require('path');

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development (prettier output)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: nodeEnv === 'development' ? consoleFormat : logFormat,
  })
);

// File transports (only in production/staging)
if (nodeEnv !== 'development') {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '../../logs');
  const fs = require('fs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add request logging helper
logger.logRequest = (req, message = 'Incoming request') => {
  logger.info(message, {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
  });
};

// Add error logging helper with context
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

// Add database operation logging helper
logger.logDbOperation = (operation, details = {}) => {
  logger.debug(`DB Operation: ${operation}`, details);
};

// Add business logic logging helper
logger.logBusiness = (event, details = {}) => {
  logger.info(`Business Event: ${event}`, details);
};

module.exports = logger;
