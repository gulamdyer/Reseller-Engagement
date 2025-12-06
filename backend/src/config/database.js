/**
 * Oracle Database Connection Configuration
 * Uses oracledb driver with connection pooling
 */

const oracledb = require('oracledb');
const config = require('./env');
const logger = require('./logger');

// Configure oracledb
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT; // Return query results as objects
oracledb.autoCommit = false; // Explicit transaction control

let pool = null;
let isThickModeInitialized = false;

/**
 * Initialize Oracle Client in thick mode
 * REQUIRED for databases with Native Network Encryption
 */
async function initOracleThickMode() {
  if (isThickModeInitialized) {
    return;
  }

  try {
    const libDir = config.oracle.clientLibDir;
    const tnsAdmin = config.oracle.tnsAdmin;

    // Set TNS_ADMIN environment variable if specified
    if (tnsAdmin) {
      process.env.TNS_ADMIN = tnsAdmin;
      logger.info('Setting TNS_ADMIN', { tnsAdmin });
    }

    if (libDir) {
      logger.info('Initializing Oracle Thick mode', { libDir });
      const initOptions = { libDir };
      if (tnsAdmin) {
        initOptions.configDir = tnsAdmin;
      }
      oracledb.initOracleClient(initOptions);
      logger.info('Oracle Thick mode initialized successfully');
    } else {
      logger.info('Initializing Oracle Thick mode (auto-detect)');
      oracledb.initOracleClient();
      logger.info('Oracle Thick mode initialized successfully');
    }

    isThickModeInitialized = true;
  } catch (error) {
    // NJS-077: Oracle client already initialized (not an error)
    if (error.message && error.message.includes('NJS-077')) {
      logger.info('Oracle client already initialized');
      isThickModeInitialized = true;
      return;
    }

    // DPI-1047: Oracle Client libraries not found
    if (error.message && error.message.includes('DPI-1047')) {
      throw new Error(
        'Oracle Client libraries not found. Please install Oracle Instant Client and set ORACLE_CLIENT_LIB_DIR in .env\n' +
        'Download from: https://www.oracle.com/database/technologies/instant-client/downloads.html'
      );
    }

    logger.error('Oracle Thick mode initialization failed', { error: error.message });
    throw error;
  }
}

/**
 * Initialize Oracle connection pool
 */
async function initializePool() {
  try {
    // Initialize thick mode BEFORE creating pool
    await initOracleThickMode();

    pool = await oracledb.createPool({
      user: config.oracle.user,
      password: config.oracle.password,
      connectString: config.oracle.connectString,
      poolMin: config.oracle.poolMin,
      poolMax: config.oracle.poolMax,
      poolIncrement: config.oracle.poolIncrement,
      poolTimeout: config.oracle.poolTimeout,
      enableStatistics: true, // Enable pool statistics for monitoring
    });

    logger.info('Oracle connection pool initialized successfully', {
      poolMin: config.oracle.poolMin,
      poolMax: config.oracle.poolMax,
      connectString: config.oracle.connectString,
    });

    return pool;
  } catch (error) {
    logger.error('Failed to initialize Oracle connection pool', { error: error.message });
    throw error;
  }
}

/**
 * Get a connection from the pool
 */
async function getConnection() {
  if (!pool) {
    await initializePool();
  }

  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    logger.error('Failed to get connection from pool', { error: error.message });
    throw error;
  }
}

/**
 * Execute a query with parameters
 * @param {string} sql - SQL query
 * @param {object|array} params - Query parameters
 * @param {object} options - Query options
 */
async function executeQuery(sql, params = {}, options = {}) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(sql, params, {
      autoCommit: options.autoCommit || false,
      ...options,
    });

    return result;
  } catch (error) {
    logger.error('Query execution failed', {
      error: error.message,
      sql: sql.substring(0, 100) + '...', // Log first 100 chars of SQL
    });
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Error closing connection', { error: err.message });
      }
    }
  }
}

/**
 * Execute a query and return all rows
 */
async function queryAll(sql, params = {}) {
  const result = await executeQuery(sql, params);
  return result.rows || [];
}

/**
 * Execute a query and return a single row
 */
async function queryOne(sql, params = {}) {
  const result = await executeQuery(sql, params);
  return result.rows && result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Execute an insert/update/delete query
 */
async function executeNonQuery(sql, params = {}, autoCommit = true) {
  const result = await executeQuery(sql, params, { autoCommit });
  return result.rowsAffected || 0;
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async function that receives connection
 */
async function executeTransaction(callback) {
  let connection;

  try {
    connection = await getConnection();

    // Execute callback with connection
    const result = await callback(connection);

    // Commit transaction
    await connection.commit();
    logger.info('Transaction committed successfully');

    return result;
  } catch (error) {
    // Rollback on error
    if (connection) {
      try {
        await connection.rollback();
        logger.warn('Transaction rolled back due to error', { error: error.message });
      } catch (rollbackErr) {
        logger.error('Error during rollback', { error: rollbackErr.message });
      }
    }
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Error closing connection', { error: err.message });
      }
    }
  }
}

/**
 * Get pool statistics
 */
function getPoolStatistics() {
  if (!pool) {
    return null;
  }

  return {
    connectionsInUse: pool.connectionsInUse,
    connectionsOpen: pool.connectionsOpen,
    poolMax: pool.poolMax,
    poolMin: pool.poolMin,
  };
}

/**
 * Close the connection pool gracefully
 */
async function closePool() {
  if (pool) {
    try {
      await pool.close(10); // 10 seconds drain time
      logger.info('Oracle connection pool closed successfully');
      pool = null;
    } catch (error) {
      logger.error('Error closing connection pool', { error: error.message });
      throw error;
    }
  }
}

/**
 * Helper to bind Oracle bind variables
 * Oracle uses named binds like :paramName
 */
function bindParams(params) {
  const binds = {};
  for (const [key, value] of Object.entries(params)) {
    binds[key] = value;
  }
  return binds;
}

/**
 * Convert Oracle DATE to JavaScript Date
 */
function oracleDateToJS(oracleDate) {
  if (!oracleDate) return null;
  return oracleDate instanceof Date ? oracleDate : new Date(oracleDate);
}

/**
 * Format JavaScript Date for Oracle
 */
function jsDateToOracle(jsDate) {
  if (!jsDate) return null;
  return jsDate instanceof Date ? jsDate : new Date(jsDate);
}

module.exports = {
  initializePool,
  getConnection,
  executeQuery,
  queryAll,
  queryOne,
  executeNonQuery,
  executeTransaction,
  getPoolStatistics,
  closePool,
  bindParams,
  oracleDateToJS,
  jsDateToOracle,
  oracledb, // Export oracledb for bind types
};
