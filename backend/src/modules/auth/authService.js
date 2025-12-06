/**
 * Authentication Service
 * Business logic for authentication
 */

const { generateToken } = require('../../middleware/auth');
const config = require('../../config/env');
const logger = require('../../config/logger');

/**
 * Authenticate user with username and password
 * For v1, this uses static credentials from .env
 * Future: implement database-backed user authentication
 */
async function authenticate(username, password) {
  try {
    // Static authentication against environment variables
    const isValidUsername = username === config.auth.adminUsername;
    const isValidPassword = password === config.auth.adminPassword;

    if (!isValidUsername || !isValidPassword) {
      return {
        success: false,
        message: 'Invalid credentials',
      };
    }

    // Generate JWT token
    const tokenPayload = {
      username,
      role: 'admin',
      loginAt: new Date().toISOString(),
    };

    const token = generateToken(tokenPayload);

    return {
      success: true,
      token,
      user: {
        username,
        role: 'admin',
      },
    };
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    throw error;
  }
}

/**
 * Validate user session
 * Future: check against database, rate limiting, etc.
 */
async function validateSession(username) {
  // For v1, all valid tokens are accepted
  // Future: implement session management, check if user is still active, etc.
  return {
    valid: true,
    username,
  };
}

/**
 * Refresh authentication token
 * Future implementation for token refresh flow
 */
async function refreshToken(oldToken) {
  // Placeholder for token refresh logic
  // Will be implemented when needed for long-running sessions
  throw new Error('Token refresh not yet implemented');
}

module.exports = {
  authenticate,
  validateSession,
  refreshToken,
};
