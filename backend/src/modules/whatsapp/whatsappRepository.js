/**
 * WhatsApp Repository
 * Database operations for WhatsApp messages and OTP sessions
 */

const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Create a WhatsApp message log entry
 */
async function createMessage(messageData) {
  try {
    const sql = `
      INSERT INTO SALR_E_WHATSAPP_MESSAGE (
        RESELLER_ID, PROMO_ID, DIRECTION_CODE, MESSAGE_TYPE, TEMPLATE_ID,
        PHONE_NUMBER, MESSAGE_BODY, STATUS_CODE, SOURCE_CHANNEL,
        SENT_AT, RAW_PAYLOAD, CREATED_AT
      ) VALUES (
        :resellerId, :promoId, :directionCode, :messageType, :templateId,
        :phoneNumber, :messageBody, :statusCode, :sourceChannel,
        :sentAt, :rawPayload, SYSDATE
      ) RETURNING MSG_ID INTO :msgId
    `;

    const binds = {
      resellerId: messageData.resellerId || null,
      promoId: messageData.promoId || null,
      directionCode: messageData.directionCode,
      messageType: messageData.messageType || 'OTHER',
      templateId: messageData.templateId || null,
      phoneNumber: messageData.phoneNumber || null,
      messageBody: messageData.messageBody || null,
      statusCode: messageData.statusCode || 'QUEUED',
      sourceChannel: messageData.sourceChannel || 'SIMULATION',
      sentAt: messageData.sentAt ? new Date(messageData.sentAt) : null,
      rawPayload: messageData.rawPayload ? JSON.stringify(messageData.rawPayload) : null,
      msgId: { type: db.oracledb.NUMBER, dir: db.oracledb.BIND_OUT },
    };

    const result = await db.executeQuery(sql, binds, { autoCommit: true });
    const msgId = result.outBinds.msgId[0];

    logger.info('WhatsApp message logged', { msgId, directionCode: messageData.directionCode });

    return msgId;
  } catch (error) {
    logger.error('Error creating WhatsApp message', { error: error.message });
    throw error;
  }
}

/**
 * Update message status
 */
async function updateMessageStatus(msgId, statusCode, timestamp = null) {
  try {
    let sql = `
      UPDATE SALR_E_WHATSAPP_MESSAGE
      SET STATUS_CODE = :statusCode
    `;

    const binds = { msgId, statusCode };

    // Update specific timestamp fields based on status
    if (statusCode === 'SENT' && timestamp) {
      sql += `, SENT_AT = :timestamp`;
      binds.timestamp = new Date(timestamp);
    } else if (statusCode === 'DELIVERED' && timestamp) {
      sql += `, DELIVERED_AT = :timestamp`;
      binds.timestamp = new Date(timestamp);
    } else if (statusCode === 'READ' && timestamp) {
      sql += `, READ_AT = :timestamp`;
      binds.timestamp = new Date(timestamp);
    } else if (statusCode === 'REPLIED' && timestamp) {
      sql += `, REPLIED_AT = :timestamp`;
      binds.timestamp = new Date(timestamp);
    } else if (statusCode === 'FAILED' && timestamp) {
      sql += `, FAILED_AT = :timestamp`;
      binds.timestamp = new Date(timestamp);
    }

    sql += ` WHERE MSG_ID = :msgId`;

    const result = await db.executeNonQuery(sql, binds, true);
    return result > 0;
  } catch (error) {
    logger.error('Error updating message status', { msgId, error: error.message });
    throw error;
  }
}

/**
 * Get WhatsApp messages with filters
 */
async function getMessages(filters = {}) {
  try {
    let sql = `
      SELECT
        MSG_ID,
        RESELLER_ID,
        PROMO_ID,
        DIRECTION_CODE,
        MESSAGE_TYPE,
        PHONE_NUMBER,
        MESSAGE_BODY,
        STATUS_CODE,
        SENT_AT,
        DELIVERED_AT,
        READ_AT,
        REPLIED_AT,
        FAILED_AT,
        CREATED_AT
      FROM SALR_E_WHATSAPP_MESSAGE
      WHERE 1=1
    `;

    const binds = {};

    if (filters.resellerId) {
      sql += ` AND RESELLER_ID = :resellerId`;
      binds.resellerId = filters.resellerId;
    }

    if (filters.promoId) {
      sql += ` AND PROMO_ID = :promoId`;
      binds.promoId = filters.promoId;
    }

    if (filters.directionCode) {
      sql += ` AND DIRECTION_CODE = :directionCode`;
      binds.directionCode = filters.directionCode;
    }

    if (filters.statusCode) {
      sql += ` AND STATUS_CODE = :statusCode`;
      binds.statusCode = filters.statusCode;
    }

    if (filters.messageType) {
      sql += ` AND MESSAGE_TYPE = :messageType`;
      binds.messageType = filters.messageType;
    }

    if (filters.fromDate) {
      sql += ` AND CREATED_AT >= :fromDate`;
      binds.fromDate = new Date(filters.fromDate);
    }

    if (filters.toDate) {
      sql += ` AND CREATED_AT <= :toDate`;
      binds.toDate = new Date(filters.toDate);
    }

    sql += ` ORDER BY CREATED_AT DESC`;

    // Apply limit
    if (filters.limit) {
      sql = `SELECT * FROM (${sql}) WHERE ROWNUM <= :limit`;
      binds.limit = filters.limit;
    }

    const result = await db.queryAll(sql, binds);
    return result;
  } catch (error) {
    logger.error('Error fetching WhatsApp messages', { error: error.message });
    throw error;
  }
}

/**
 * Get message statistics
 */
async function getMessageStats(filters = {}) {
  try {
    let sql = `
      SELECT
        COUNT(*) AS TOTAL_MESSAGES,
        SUM(CASE WHEN STATUS_CODE = 'SENT' THEN 1 ELSE 0 END) AS SENT_COUNT,
        SUM(CASE WHEN STATUS_CODE = 'DELIVERED' THEN 1 ELSE 0 END) AS DELIVERED_COUNT,
        SUM(CASE WHEN STATUS_CODE = 'READ' THEN 1 ELSE 0 END) AS READ_COUNT,
        SUM(CASE WHEN STATUS_CODE = 'REPLIED' THEN 1 ELSE 0 END) AS REPLIED_COUNT,
        SUM(CASE WHEN STATUS_CODE = 'FAILED' THEN 1 ELSE 0 END) AS FAILED_COUNT,
        SUM(CASE WHEN DIRECTION_CODE = 'OUTBOUND' THEN 1 ELSE 0 END) AS OUTBOUND_COUNT,
        SUM(CASE WHEN DIRECTION_CODE = 'INBOUND' THEN 1 ELSE 0 END) AS INBOUND_COUNT
      FROM SALR_E_WHATSAPP_MESSAGE
      WHERE 1=1
    `;

    const binds = {};

    if (filters.promoId) {
      sql += ` AND PROMO_ID = :promoId`;
      binds.promoId = filters.promoId;
    }

    if (filters.fromDate) {
      sql += ` AND CREATED_AT >= :fromDate`;
      binds.fromDate = new Date(filters.fromDate);
    }

    if (filters.toDate) {
      sql += ` AND CREATED_AT <= :toDate`;
      binds.toDate = new Date(filters.toDate);
    }

    const result = await db.queryOne(sql, binds);
    return result;
  } catch (error) {
    logger.error('Error fetching message stats', { error: error.message });
    throw error;
  }
}

/**
 * Create OTP session for reseller profile access
 */
async function createOtpSession(sessionData) {
  try {
    const sql = `
      INSERT INTO SALR_E_WHATSAPP_OTP_SESSION (
        SESSION_ID, RESELLER_ID, WHATSAPP_NUMBER, OTP_HASH, EXPIRES_AT, CREATED_AT
      ) VALUES (
        :sessionId, :resellerId, :whatsappNumber, :otpHash, :expiresAt, SYSDATE
      )
    `;

    await db.executeNonQuery(sql, {
      sessionId: sessionData.sessionId,
      resellerId: sessionData.resellerId,
      whatsappNumber: sessionData.whatsappNumber,
      otpHash: sessionData.otpHash,
      expiresAt: new Date(sessionData.expiresAt),
    }, true);

    logger.info('OTP session created', { sessionId: sessionData.sessionId });

    return sessionData.sessionId;
  } catch (error) {
    logger.error('Error creating OTP session', { error: error.message });
    throw error;
  }
}

/**
 * Verify OTP session
 */
async function verifyOtpSession(sessionId) {
  try {
    const sql = `
      SELECT
        SESSION_ID,
        RESELLER_ID,
        WHATSAPP_NUMBER,
        OTP_HASH,
        EXPIRES_AT,
        VERIFIED_AT,
        VERIFICATION_COUNT
      FROM SALR_E_WHATSAPP_OTP_SESSION
      WHERE SESSION_ID = :sessionId
        AND EXPIRES_AT > SYSDATE
    `;

    const result = await db.queryOne(sql, { sessionId });
    return result;
  } catch (error) {
    logger.error('Error verifying OTP session', { sessionId, error: error.message });
    throw error;
  }
}

/**
 * Mark OTP session as verified
 */
async function markOtpVerified(sessionId) {
  try {
    const sql = `
      UPDATE SALR_E_WHATSAPP_OTP_SESSION
      SET VERIFIED_AT = SYSDATE
      WHERE SESSION_ID = :sessionId
    `;

    const result = await db.executeNonQuery(sql, { sessionId }, true);
    return result > 0;
  } catch (error) {
    logger.error('Error marking OTP verified', { sessionId, error: error.message });
    throw error;
  }
}

module.exports = {
  createMessage,
  updateMessageStatus,
  getMessages,
  getMessageStats,
  createOtpSession,
  verifyOtpSession,
  markOtpVerified,
};
