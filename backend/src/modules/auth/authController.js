/**
 * Authentication Controller
 * Handles login, logout, and token validation
 */

const authService = require('./authService');
const { asyncHandler, validationError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');
const config = require('../../config/env');

/**
 * Login endpoint
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate request body
  if (!username || !password) {
    throw validationError('Username and password are required', {
      fields: { username: !username, password: !password },
    });
  }

  logger.logRequest(req, 'Login attempt');

  // Authenticate user
  const result = await authService.authenticate(username, password);

  if (!result.success) {
    logger.warn('Failed login attempt', { username, ip: req.ip });
    throw validationError('Invalid username or password', { field: 'credentials' });
  }

  logger.info('Successful login', { username });

  // Set HTTP-only cookie
  res.cookie(config.auth.cookieName, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: config.auth.cookieMaxAge,
  });

  // Send response
  res.json({
    success: true,
    data: {
      user: result.user,
      token: result.token, // Also return in body for clients that prefer header auth
      expiresIn: config.auth.jwtExpiresIn,
    },
  });
});

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  logger.info('User logged out', { username: req.user?.username });

  // Clear cookie
  res.clearCookie(config.auth.cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Validate token endpoint
 * GET /api/auth/validate
 */
const validateToken = asyncHandler(async (req, res) => {
  // If we got here, the authenticateToken middleware already validated the token
  res.json({
    success: true,
    data: {
      user: req.user,
      valid: true,
    },
  });
});

/**
 * Get current user info
 * GET /api/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        username: req.user.username,
        role: req.user.role,
      },
    },
  });
});

module.exports = {
  login,
  logout,
  validateToken,
  getCurrentUser,
};
