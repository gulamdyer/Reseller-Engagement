/**
 * Authentication Middleware
 * JWT-based authentication for admin routes
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { unauthorizedError } = require('./errorHandler');
const logger = require('../config/logger');

/**
 * Verify JWT token from cookie or Authorization header
 */
function authenticateToken(req, res, next) {
  try {
    // Try to get token from cookie first, then Authorization header
    let token = req.cookies?.[config.auth.cookieName];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw unauthorizedError('Authentication token required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.auth.jwtSecret);

    // Attach user info to request
    req.user = {
      username: decoded.username,
      role: decoded.role || 'admin',
      iat: decoded.iat,
      exp: decoded.exp,
    };

    logger.debug('User authenticated', { username: req.user.username });
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(unauthorizedError('Invalid authentication token'));
    } else if (error.name === 'TokenExpiredError') {
      next(unauthorizedError('Authentication token has expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication - does not fail if no token
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 */
function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.[config.auth.cookieName];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      req.user = {
        username: decoded.username,
        role: decoded.role || 'admin',
      };
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

/**
 * Generate JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

/**
 * Verify token (without middleware context)
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.auth.jwtSecret);
  } catch (error) {
    return null;
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  verifyToken,
};
