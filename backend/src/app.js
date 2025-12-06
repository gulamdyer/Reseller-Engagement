/**
 * Main Express Application
 * Reseller Engagement (CREDIT BACK) System
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const logger = require('./config/logger');
const db = require('./config/database');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors(config.cors));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// HTTP request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Request timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  const poolStats = db.getPoolStatistics();

  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: poolStats || { status: 'Not initialized' },
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

let server;

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize database connection pool
    logger.info('Initializing database connection pool...');
    await db.initializePool();

    // Start server
    server = app.listen(config.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║  RESELLER ENGAGEMENT (CREDIT BACK) API                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(48)}║
║  Port:        ${String(config.port).padEnd(48)}║
║  URL:         http://localhost:${config.port.toString().padEnd(38)}║
║  Health:      http://localhost:${config.port}/health${' '.repeat(38 - config.port.toString().length - 7)}║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
      } else {
        logger.error('Server error', { error: error.message });
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down gracefully...');

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connections
  try {
    await db.closePool();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', { error: error.message });
  }

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  shutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  shutdown();
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = { app, start, shutdown };

// Start server if this file is run directly
if (require.main === module) {
  start();
}
