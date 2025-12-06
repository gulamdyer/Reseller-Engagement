/**
 * Environment Configuration
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Oracle Database Configuration
  oracle: {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: parseInt(process.env.ORACLE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.ORACLE_POOL_MAX || '10', 10),
    poolIncrement: parseInt(process.env.ORACLE_POOL_INCREMENT || '1', 10),
    poolTimeout: parseInt(process.env.ORACLE_POOL_TIMEOUT || '60', 10),
    clientLibDir: process.env.ORACLE_CLIENT_LIB_DIR, // Path to Oracle Instant Client (for thick mode)
    tnsAdmin: process.env.TNS_ADMIN, // Path to TNS configuration (optional)
  },

  // Authentication Configuration
  auth: {
    adminUsername: process.env.ADMIN_USERNAME,
    adminPassword: process.env.ADMIN_PASSWORD,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    cookieName: 'salr_auth_token',
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || '86400000', 10), // 24 hours in ms
  },

  // WhatsApp Configuration (for future integration)
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  },

  // Application Configuration
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    apiPrefix: '/api',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
};

/**
 * Validate required environment variables
 */
function validateConfig() {
  const required = [
    'ORACLE_USER',
    'ORACLE_PASSWORD',
    'ORACLE_CONNECT_STRING',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'JWT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    );
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('WARNING: JWT_SECRET should be at least 32 characters for security.');
  }
}

// Run validation in production/staging
if (config.nodeEnv !== 'development') {
  validateConfig();
}

module.exports = config;
