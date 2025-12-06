/**
 * Error Handling Middleware
 * Centralized error handling for Express application
 */

const logger = require('../config/logger');

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found (404) handler
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || {};

  // Log error with context
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    statusCode,
    code,
  });

  // Handle specific error types

  // Oracle database errors
  if (err.errorNum) {
    statusCode = 500;
    code = 'DATABASE_ERROR';

    // Common Oracle errors
    switch (err.errorNum) {
      case 1:
        message = 'Duplicate entry found';
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        break;
      case 1400:
        message = 'Required field is missing';
        statusCode = 400;
        code = 'REQUIRED_FIELD_MISSING';
        break;
      case 2291:
        message = 'Referenced record does not exist';
        statusCode = 400;
        code = 'FOREIGN_KEY_VIOLATION';
        break;
      case 2292:
        message = 'Cannot delete record - it is referenced by other records';
        statusCode = 400;
        code = 'FOREIGN_KEY_CONSTRAINT';
        break;
      default:
        message = 'Database operation failed';
    }

    // Don't expose internal DB errors in production
    if (process.env.NODE_ENV === 'production') {
      details = {};
    } else {
      details = { oracleError: err.errorNum, oracleMessage: err.message };
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    // err.details should contain validation errors from Joi or similar
  }

  // Send error response
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(Object.keys(details).length > 0 && { details }),
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error helper
 */
function validationError(message, details = {}) {
  return new AppError(message, 400, 'VALIDATION_ERROR', details);
}

/**
 * Unauthorized error helper
 */
function unauthorizedError(message = 'Unauthorized') {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

/**
 * Forbidden error helper
 */
function forbiddenError(message = 'Forbidden') {
  return new AppError(message, 403, 'FORBIDDEN');
}

/**
 * Not found error helper
 */
function notFoundError(resource = 'Resource') {
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
};
