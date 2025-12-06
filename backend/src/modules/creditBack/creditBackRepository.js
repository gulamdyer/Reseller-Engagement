/**
 * Credit Back Repository
 * Database operations for Credit Back rules, brackets, and ledger
 */

const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Get all Credit Back rules with their brackets
 */
async function getAllRules(filters = {}) {
  try {
    let sql = `
      SELECT
        r.RULE_ID,
        r.RULE_NAME,
        r.VALID_FROM,
        r.VALID_TO,
        r.MODE_CODE,
        r.IS_ACTIVE,
        r.CREATED_BY,
        r.CREATED_AT,
        r.UPDATED_BY,
        r.UPDATED_AT,
        (SELECT COUNT(*) FROM SALR_E_CREDIT_BACK_RULE_BRACKET b WHERE b.RULE_ID = r.RULE_ID) AS BRACKET_COUNT
      FROM SALR_E_CREDIT_BACK_RULE r
      WHERE 1=1
    `;

    const binds = {};

    if (filters.isActive !== undefined) {
      sql += ` AND r.IS_ACTIVE = :isActive`;
      binds.isActive = filters.isActive ? 'Y' : 'N';
    }

    sql += ` ORDER BY r.CREATED_AT DESC`;

    const result = await db.queryAll(sql, binds);
    return result;
  } catch (error) {
    logger.error('Error fetching Credit Back rules', { error: error.message });
    throw error;
  }
}

/**
 * Get a single rule with its brackets
 */
async function getRuleById(ruleId) {
  try {
    const ruleSql = `
      SELECT
        RULE_ID,
        RULE_NAME,
        VALID_FROM,
        VALID_TO,
        MODE_CODE,
        IS_ACTIVE,
        CREATED_BY,
        CREATED_AT,
        UPDATED_BY,
        UPDATED_AT
      FROM SALR_E_CREDIT_BACK_RULE
      WHERE RULE_ID = :ruleId
    `;

    const rule = await db.queryOne(ruleSql, { ruleId });

    if (!rule) {
      return null;
    }

    // Get brackets for this rule
    const bracketsSql = `
      SELECT
        BRACKET_ID,
        RULE_ID,
        MIN_SALES_AMOUNT,
        MAX_SALES_AMOUNT,
        CREDIT_PERCENT,
        PRIORITY_NO
      FROM SALR_E_CREDIT_BACK_RULE_BRACKET
      WHERE RULE_ID = :ruleId
      ORDER BY MIN_SALES_AMOUNT ASC
    `;

    const brackets = await db.queryAll(bracketsSql, { ruleId });

    return {
      ...rule,
      brackets,
    };
  } catch (error) {
    logger.error('Error fetching Credit Back rule by ID', { ruleId, error: error.message });
    throw error;
  }
}

/**
 * Create a new Credit Back rule with brackets
 */
async function createRule(ruleData, username) {
  return await db.executeTransaction(async (connection) => {
    try {
      // Insert rule
      const ruleSql = `
        INSERT INTO SALR_E_CREDIT_BACK_RULE (
          RULE_NAME, VALID_FROM, VALID_TO, MODE_CODE, IS_ACTIVE, CREATED_BY, CREATED_AT
        ) VALUES (
          :ruleName, :validFrom, :validTo, :modeCode, :isActive, :createdBy, SYSDATE
        ) RETURNING RULE_ID INTO :ruleId
      `;

      const ruleBinds = {
        ruleName: ruleData.ruleName,
        validFrom: new Date(ruleData.validFrom),
        validTo: new Date(ruleData.validTo),
        modeCode: ruleData.modeCode,
        isActive: ruleData.isActive !== false ? 'Y' : 'N',
        createdBy: username,
        ruleId: { type: db.oracledb.NUMBER, dir: db.oracledb.BIND_OUT },
      };

      const ruleResult = await connection.execute(ruleSql, ruleBinds);
      const ruleId = ruleResult.outBinds.ruleId[0];

      // Insert brackets
      if (ruleData.brackets && ruleData.brackets.length > 0) {
        const bracketSql = `
          INSERT INTO SALR_E_CREDIT_BACK_RULE_BRACKET (
            RULE_ID, MIN_SALES_AMOUNT, MAX_SALES_AMOUNT, CREDIT_PERCENT, PRIORITY_NO
          ) VALUES (
            :ruleId, :minSalesAmount, :maxSalesAmount, :creditPercent, :priorityNo
          )
        `;

        for (let i = 0; i < ruleData.brackets.length; i++) {
          const bracket = ruleData.brackets[i];
          await connection.execute(bracketSql, {
            ruleId,
            minSalesAmount: bracket.minSalesAmount,
            maxSalesAmount: bracket.maxSalesAmount || null,
            creditPercent: bracket.creditPercent,
            priorityNo: i + 1,
          });
        }
      }

      logger.logBusiness('Credit Back rule created', { ruleId, ruleName: ruleData.ruleName });

      return ruleId;
    } catch (error) {
      logger.error('Error creating Credit Back rule', { error: error.message });
      throw error;
    }
  });
}

/**
 * Update a Credit Back rule
 */
async function updateRule(ruleId, ruleData, username) {
  return await db.executeTransaction(async (connection) => {
    try {
      // Update rule
      const updateRuleSql = `
        UPDATE SALR_E_CREDIT_BACK_RULE
        SET
          RULE_NAME = :ruleName,
          VALID_FROM = :validFrom,
          VALID_TO = :validTo,
          MODE_CODE = :modeCode,
          IS_ACTIVE = :isActive,
          UPDATED_BY = :updatedBy,
          UPDATED_AT = SYSDATE
        WHERE RULE_ID = :ruleId
      `;

      await connection.execute(updateRuleSql, {
        ruleId,
        ruleName: ruleData.ruleName,
        validFrom: new Date(ruleData.validFrom),
        validTo: new Date(ruleData.validTo),
        modeCode: ruleData.modeCode,
        isActive: ruleData.isActive !== false ? 'Y' : 'N',
        updatedBy: username,
      });

      // Delete existing brackets
      const deleteBracketsSql = `
        DELETE FROM SALR_E_CREDIT_BACK_RULE_BRACKET
        WHERE RULE_ID = :ruleId
      `;

      await connection.execute(deleteBracketsSql, { ruleId });

      // Insert new brackets
      if (ruleData.brackets && ruleData.brackets.length > 0) {
        const bracketSql = `
          INSERT INTO SALR_E_CREDIT_BACK_RULE_BRACKET (
            RULE_ID, MIN_SALES_AMOUNT, MAX_SALES_AMOUNT, CREDIT_PERCENT, PRIORITY_NO
          ) VALUES (
            :ruleId, :minSalesAmount, :maxSalesAmount, :creditPercent, :priorityNo
          )
        `;

        for (let i = 0; i < ruleData.brackets.length; i++) {
          const bracket = ruleData.brackets[i];
          await connection.execute(bracketSql, {
            ruleId,
            minSalesAmount: bracket.minSalesAmount,
            maxSalesAmount: bracket.maxSalesAmount || null,
            creditPercent: bracket.creditPercent,
            priorityNo: i + 1,
          });
        }
      }

      logger.logBusiness('Credit Back rule updated', { ruleId });

      return true;
    } catch (error) {
      logger.error('Error updating Credit Back rule', { ruleId, error: error.message });
      throw error;
    }
  });
}

/**
 * Activate or deactivate a rule
 */
async function toggleRuleActive(ruleId, isActive, username) {
  try {
    const sql = `
      UPDATE SALR_E_CREDIT_BACK_RULE
      SET IS_ACTIVE = :isActive,
          UPDATED_BY = :updatedBy,
          UPDATED_AT = SYSDATE
      WHERE RULE_ID = :ruleId
    `;

    const result = await db.executeNonQuery(sql, {
      ruleId,
      isActive: isActive ? 'Y' : 'N',
      updatedBy: username,
    }, true);

    logger.logBusiness('Credit Back rule toggled', { ruleId, isActive });

    return result > 0;
  } catch (error) {
    logger.error('Error toggling rule active status', { ruleId, error: error.message });
    throw error;
  }
}

/**
 * Get applicable rule for a reseller/order
 * Considers validity dates and returns the most recent active rule
 */
async function getApplicableRule(orderDate) {
  try {
    const sql = `
      SELECT
        RULE_ID,
        RULE_NAME,
        VALID_FROM,
        VALID_TO,
        MODE_CODE,
        IS_ACTIVE
      FROM SALR_E_CREDIT_BACK_RULE
      WHERE IS_ACTIVE = 'Y'
        AND VALID_FROM <= :orderDate
        AND VALID_TO >= :orderDate
      ORDER BY VALID_FROM DESC
      FETCH FIRST 1 ROWS ONLY
    `;

    const result = await db.queryOne(sql, { orderDate: new Date(orderDate) });
    return result;
  } catch (error) {
    logger.error('Error finding applicable rule', { orderDate, error: error.message });
    throw error;
  }
}

/**
 * Get applicable bracket for a sales amount within a rule
 */
async function getApplicableBracket(ruleId, salesAmount) {
  try {
    const sql = `
      SELECT
        BRACKET_ID,
        RULE_ID,
        MIN_SALES_AMOUNT,
        MAX_SALES_AMOUNT,
        CREDIT_PERCENT,
        PRIORITY_NO
      FROM SALR_E_CREDIT_BACK_RULE_BRACKET
      WHERE RULE_ID = :ruleId
        AND MIN_SALES_AMOUNT <= :salesAmount
        AND (MAX_SALES_AMOUNT IS NULL OR MAX_SALES_AMOUNT >= :salesAmount)
      ORDER BY PRIORITY_NO ASC
      FETCH FIRST 1 ROWS ONLY
    `;

    const result = await db.queryOne(sql, { ruleId, salesAmount });
    return result;
  } catch (error) {
    logger.error('Error finding applicable bracket', { ruleId, salesAmount, error: error.message });
    throw error;
  }
}

/**
 * Create a Credit Back ledger entry
 */
async function createLedgerEntry(entryData, username) {
  try {
    const sql = `
      INSERT INTO SALR_E_CREDIT_BACK_LEDGER (
        RESELLER_ID,
        ORDER_ID,
        RULE_ID,
        PROMO_ID,
        CREDIT_AMOUNT,
        STATUS_CODE,
        EARNED_AT,
        EXPIRY_DATE,
        REMARKS,
        CREATED_BY,
        CREATED_AT
      ) VALUES (
        :resellerId,
        :orderId,
        :ruleId,
        :promoId,
        :creditAmount,
        :statusCode,
        :earnedAt,
        :expiryDate,
        :remarks,
        :createdBy,
        SYSDATE
      ) RETURNING LEDGER_ID INTO :ledgerId
    `;

    const binds = {
      resellerId: entryData.resellerId,
      orderId: entryData.orderId || null,
      ruleId: entryData.ruleId || null,
      promoId: entryData.promoId || null,
      creditAmount: entryData.creditAmount,
      statusCode: entryData.statusCode || 'EARNED',
      earnedAt: entryData.earnedAt ? new Date(entryData.earnedAt) : new Date(),
      expiryDate: entryData.expiryDate ? new Date(entryData.expiryDate) : null,
      remarks: entryData.remarks || null,
      createdBy: username,
      ledgerId: { type: db.oracledb.NUMBER, dir: db.oracledb.BIND_OUT },
    };

    const result = await db.executeQuery(sql, binds, { autoCommit: true });
    const ledgerId = result.outBinds.ledgerId[0];

    logger.logBusiness('Credit Back ledger entry created', {
      ledgerId,
      resellerId: entryData.resellerId,
      creditAmount: entryData.creditAmount,
    });

    return ledgerId;
  } catch (error) {
    logger.error('Error creating ledger entry', { error: error.message });
    throw error;
  }
}

/**
 * Get ledger entries for a reseller
 */
async function getLedgerEntriesByReseller(resellerId, filters = {}) {
  try {
    let sql = `
      SELECT
        l.LEDGER_ID,
        l.RESELLER_ID,
        l.ORDER_ID,
        l.RULE_ID,
        l.PROMO_ID,
        l.CREDIT_AMOUNT,
        l.STATUS_CODE,
        l.EARNED_AT,
        l.REDEEMED_AT,
        l.EXPIRY_DATE,
        l.REMARKS,
        l.CREATED_AT,
        r.RULE_NAME
      FROM SALR_E_CREDIT_BACK_LEDGER l
      LEFT JOIN SALR_E_CREDIT_BACK_RULE r ON l.RULE_ID = r.RULE_ID
      WHERE l.RESELLER_ID = :resellerId
    `;

    const binds = { resellerId };

    if (filters.statusCode) {
      sql += ` AND l.STATUS_CODE = :statusCode`;
      binds.statusCode = filters.statusCode;
    }

    sql += ` ORDER BY l.CREATED_AT DESC`;

    const result = await db.queryAll(sql, binds);
    return result;
  } catch (error) {
    logger.error('Error fetching ledger entries', { resellerId, error: error.message });
    throw error;
  }
}

/**
 * Get Credit Back balance for a reseller
 */
async function getCreditBalance(resellerId) {
  try {
    const sql = `
      SELECT
        NVL(SUM(CASE WHEN STATUS_CODE = 'EARNED' THEN CREDIT_AMOUNT ELSE 0 END), 0) AS TOTAL_EARNED,
        NVL(SUM(CASE WHEN STATUS_CODE = 'REDEEMED' THEN CREDIT_AMOUNT ELSE 0 END), 0) AS TOTAL_REDEEMED,
        NVL(SUM(CASE WHEN STATUS_CODE = 'EXPIRED' THEN CREDIT_AMOUNT ELSE 0 END), 0) AS TOTAL_EXPIRED,
        NVL(SUM(CASE WHEN STATUS_CODE = 'EARNED' THEN CREDIT_AMOUNT ELSE 0 END), 0) AS AVAILABLE_BALANCE
      FROM SALR_E_CREDIT_BACK_LEDGER
      WHERE RESELLER_ID = :resellerId
    `;

    const result = await db.queryOne(sql, { resellerId });
    return result || {
      TOTAL_EARNED: 0,
      TOTAL_REDEEMED: 0,
      TOTAL_EXPIRED: 0,
      AVAILABLE_BALANCE: 0,
    };
  } catch (error) {
    logger.error('Error fetching credit balance', { resellerId, error: error.message });
    throw error;
  }
}

/**
 * Update ledger entry status (for redemption or expiry)
 */
async function updateLedgerStatus(ledgerId, newStatus, username) {
  try {
    let sql = `
      UPDATE SALR_E_CREDIT_BACK_LEDGER
      SET STATUS_CODE = :newStatus
    `;

    const binds = { ledgerId, newStatus };

    if (newStatus === 'REDEEMED') {
      sql += `, REDEEMED_AT = SYSDATE`;
    }

    sql += ` WHERE LEDGER_ID = :ledgerId`;

    const result = await db.executeNonQuery(sql, binds, true);

    logger.logBusiness('Ledger status updated', { ledgerId, newStatus });

    return result > 0;
  } catch (error) {
    logger.error('Error updating ledger status', { ledgerId, error: error.message });
    throw error;
  }
}

/**
 * Get total outstanding Credit Back across all resellers
 */
async function getTotalOutstanding() {
  try {
    const sql = `
      SELECT
        NVL(SUM(CASE WHEN STATUS_CODE = 'EARNED' THEN CREDIT_AMOUNT ELSE 0 END), 0) AS TOTAL_OUTSTANDING
      FROM SALR_E_CREDIT_BACK_LEDGER
    `;

    const result = await db.queryOne(sql);
    return result?.TOTAL_OUTSTANDING || 0;
  } catch (error) {
    logger.error('Error fetching total outstanding credit', { error: error.message });
    throw error;
  }
}

module.exports = {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  toggleRuleActive,
  getApplicableRule,
  getApplicableBracket,
  createLedgerEntry,
  getLedgerEntriesByReseller,
  getCreditBalance,
  updateLedgerStatus,
  getTotalOutstanding,
};
