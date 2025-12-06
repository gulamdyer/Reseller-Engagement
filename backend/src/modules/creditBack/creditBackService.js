/**
 * Credit Back Service
 * Business logic for Credit Back calculations and management
 */

const creditBackRepo = require('./creditBackRepository');
const erpRepo = require('../../repositories/erpRepository');
const logger = require('../../config/logger');

/**
 * Calculate Credit Back for a reseller's order
 * Determines applicable rule and bracket, then calculates credit amount
 */
async function calculateCreditBack(resellerId, orderAmount, orderDate, orderId = null) {
  try {
    logger.info('Calculating Credit Back', { resellerId, orderAmount, orderDate });

    // Find applicable rule for this order date
    const rule = await creditBackRepo.getApplicableRule(orderDate);

    if (!rule) {
      logger.warn('No applicable Credit Back rule found', { orderDate });
      return {
        applicable: false,
        reason: 'No active rule for this period',
      };
    }

    // Find applicable bracket for the sales amount
    const bracket = await creditBackRepo.getApplicableBracket(rule.RULE_ID, orderAmount);

    if (!bracket) {
      logger.warn('No applicable bracket found', { ruleId: rule.RULE_ID, orderAmount });
      return {
        applicable: false,
        reason: 'Sales amount does not match any bracket',
        rule,
      };
    }

    // Calculate credit amount
    const creditAmount = (orderAmount * bracket.CREDIT_PERCENT) / 100;

    logger.info('Credit Back calculated', {
      resellerId,
      orderAmount,
      creditPercent: bracket.CREDIT_PERCENT,
      creditAmount,
    });

    return {
      applicable: true,
      rule,
      bracket,
      orderAmount,
      creditPercent: bracket.CREDIT_PERCENT,
      creditAmount,
      orderId,
    };
  } catch (error) {
    logger.error('Error calculating Credit Back', { error: error.message });
    throw error;
  }
}

/**
 * Award Credit Back to a reseller
 * Creates a ledger entry for earned credit
 */
async function awardCreditBack(resellerId, calculation, username, expiryDays = 180) {
  try {
    if (!calculation.applicable) {
      throw new Error('Cannot award credit - calculation not applicable');
    }

    // Calculate expiry date
    const earnedAt = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const entryData = {
      resellerId,
      orderId: calculation.orderId,
      ruleId: calculation.rule.RULE_ID,
      creditAmount: calculation.creditAmount,
      statusCode: 'EARNED',
      earnedAt,
      expiryDate,
      remarks: `Credit earned from ${calculation.rule.RULE_NAME} (${calculation.creditPercent}% on ${calculation.orderAmount})`,
    };

    const ledgerId = await creditBackRepo.createLedgerEntry(entryData, username);

    logger.logBusiness('Credit Back awarded', {
      ledgerId,
      resellerId,
      creditAmount: calculation.creditAmount,
    });

    return {
      ledgerId,
      creditAmount: calculation.creditAmount,
      expiryDate,
    };
  } catch (error) {
    logger.error('Error awarding Credit Back', { error: error.message });
    throw error;
  }
}

/**
 * Get Credit Back summary for a reseller
 */
async function getResellerCreditSummary(resellerId) {
  try {
    const balance = await creditBackRepo.getCreditBalance(resellerId);
    const recentEntries = await creditBackRepo.getLedgerEntriesByReseller(resellerId, {});

    return {
      resellerId,
      balance,
      recentEntries: recentEntries.slice(0, 10), // Last 10 entries
      totalEntries: recentEntries.length,
    };
  } catch (error) {
    logger.error('Error fetching credit summary', { resellerId, error: error.message });
    throw error;
  }
}

/**
 * Redeem Credit Back (mark as redeemed)
 */
async function redeemCredit(ledgerId, username) {
  try {
    const success = await creditBackRepo.updateLedgerStatus(ledgerId, 'REDEEMED', username);

    if (success) {
      logger.logBusiness('Credit Back redeemed', { ledgerId, username });
    }

    return success;
  } catch (error) {
    logger.error('Error redeeming credit', { ledgerId, error: error.message });
    throw error;
  }
}

/**
 * Expire old credits
 * Batch job to mark expired credits
 */
async function expireOldCredits(username = 'SYSTEM') {
  try {
    // This would typically be a batch job
    // For now, we'll just return a placeholder
    logger.info('Expiring old credits (batch job)');

    // In a real implementation, you would:
    // 1. Find all EARNED credits with EXPIRY_DATE < SYSDATE
    // 2. Update their status to EXPIRED
    // 3. Log the changes

    return {
      expiredCount: 0,
      message: 'Batch expiry job completed',
    };
  } catch (error) {
    logger.error('Error expiring credits', { error: error.message });
    throw error;
  }
}

module.exports = {
  calculateCreditBack,
  awardCreditBack,
  getResellerCreditSummary,
  redeemCredit,
  expireOldCredits,
};
