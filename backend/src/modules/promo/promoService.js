/**
 * Promo Service
 * Business logic for promotions
 */

const promoRepo = require('./promoRepository');
const erpRepo = require('../../repositories/erpRepository');
const whatsappService = require('../whatsapp/whatsappService');
const logger = require('../../config/logger');

/**
 * Determine target resellers for a promotion
 */
async function getTargetResellers(promo) {
  try {
    const allResellers = await erpRepo.getResellersWithActivity();

    // Filter based on target segment
    let targetResellers = allResellers;

    if (promo.TARGET_SEGMENT === 'DORMANT') {
      // Last order between 60-90 days
      targetResellers = allResellers.filter(r => {
        const lastOrderDate = r.LAST_ORDER_DATE ? new Date(r.LAST_ORDER_DATE) : null;
        if (!lastOrderDate) return false;

        const daysSince = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= 60 && daysSince <= 90;
      });
    } else if (promo.TARGET_SEGMENT === 'ACTIVE') {
      // Last order within 30 days
      targetResellers = allResellers.filter(r => {
        const lastOrderDate = r.LAST_ORDER_DATE ? new Date(r.LAST_ORDER_DATE) : null;
        if (!lastOrderDate) return false;

        const daysSince = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= 30;
      });
    }

    logger.info('Target resellers determined', {
      promoId: promo.PROMO_ID,
      segment: promo.TARGET_SEGMENT,
      count: targetResellers.length,
    });

    return targetResellers;
  } catch (error) {
    logger.error('Error determining target resellers', { error: error.message });
    throw error;
  }
}

/**
 * Send promotion to target resellers
 */
async function sendPromotion(promoId, username) {
  try {
    logger.info('Sending promotion', { promoId });

    // Get promo with SKUs
    const promo = await promoRepo.getPromoById(promoId);

    if (!promo) {
      throw new Error('Promotion not found');
    }

    if (promo.skus.length === 0) {
      throw new Error('Promotion has no SKUs');
    }

    // Get target resellers
    const targetResellers = await getTargetResellers(promo);

    if (targetResellers.length === 0) {
      logger.warn('No target resellers found for promotion', { promoId });
      return {
        promoId,
        resellerCount: 0,
        messagesSent: 0,
      };
    }

    // Send messages (simulated)
    let messagesSent = 0;

    for (const reseller of targetResellers) {
      for (const sku of promo.skus) {
        try {
          await whatsappService.sendPromoMessage(reseller, promo, sku);
          messagesSent++;
        } catch (error) {
          logger.error('Error sending promo message', {
            resellerId: reseller.RESELLER_ID,
            error: error.message,
          });
        }
      }
    }

    // Send internal alert
    await whatsappService.sendInternalAlert(
      `Promotion "${promo.PROMO_NAME}" sent to ${targetResellers.length} resellers (${messagesSent} messages)`,
      { promoId, resellerCount: targetResellers.length, messagesSent }
    );

    // Update promo status to ACTIVE
    await promoRepo.updatePromoStatus(promoId, 'ACTIVE', username);

    logger.logBusiness('Promotion sent', {
      promoId,
      resellerCount: targetResellers.length,
      messagesSent,
    });

    return {
      promoId,
      resellerCount: targetResellers.length,
      messagesSent,
    };
  } catch (error) {
    logger.error('Error sending promotion', { promoId, error: error.message });
    throw error;
  }
}

module.exports = {
  getTargetResellers,
  sendPromotion,
};
