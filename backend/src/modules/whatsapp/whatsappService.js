/**
 * WhatsApp Service
 * Business logic for WhatsApp message handling and webhook processing
 */

const whatsappRepo = require('./whatsappRepository');
const erpRepo = require('../../repositories/erpRepository');
const creditBackRepo = require('../creditBack/creditBackRepository');
const logger = require('../../config/logger');
const crypto = require('crypto');

/**
 * Parse incoming WhatsApp message and extract command
 */
function parseInboundMessage(messageText) {
  const text = (messageText || '').trim().toUpperCase();

  // Match patterns
  if (text.startsWith('AVAIL')) {
    const parts = text.split(/\s+/);
    return {
      command: 'AVAIL',
      skuCode: parts[1] || null,
    };
  }

  if (text.startsWith('ORDER')) {
    const parts = text.split(/\s+/);
    return {
      command: 'ORDER',
      skuCode: parts[1] || null,
      width: parts[2] ? parseFloat(parts[2]) : null,
      height: parts[3] ? parseFloat(parts[3]) : null,
    };
  }

  if (text.includes('CREDIT') || text.includes('BALANCE')) {
    return {
      command: 'CREDIT',
    };
  }

  if (text.includes('PROFILE')) {
    return {
      command: 'PROFILE',
    };
  }

  return {
    command: 'UNKNOWN',
    text: messageText,
  };
}

/**
 * Handle AVAIL command - check SKU availability
 */
async function handleAvailCommand(reseller, skuCode) {
  try {
    if (!skuCode) {
      return {
        response: 'Please provide SKU code. Format: AVAIL <SKU_CODE>',
        messageType: 'AVAILABILITY',
      };
    }

    const availability = await erpRepo.checkSkuAvailability(skuCode);

    if (!availability) {
      return {
        response: `SKU ${skuCode} not found.`,
        messageType: 'AVAILABILITY',
      };
    }

    const response = `${availability.SKU_NAME} (${availability.SKU_CODE}): ${availability.AVAILABLE}`;

    return {
      response,
      messageType: 'AVAILABILITY',
      data: availability,
    };
  } catch (error) {
    logger.error('Error handling AVAIL command', { error: error.message });
    return {
      response: 'Error checking availability. Please try again later.',
      messageType: 'AVAILABILITY',
    };
  }
}

/**
 * Handle ORDER command - create reseller request
 */
async function handleOrderCommand(reseller, orderData) {
  try {
    if (!orderData.skuCode) {
      return {
        response: 'Please provide SKU code. Format: ORDER <SKU_CODE> <WIDTH> <HEIGHT>',
        messageType: 'ORDER',
      };
    }

    // This would create a request in the reseller request repository
    // For now, we'll just return a confirmation
    const response = `Order request received for ${orderData.skuCode}. Our team will contact you shortly.`;

    return {
      response,
      messageType: 'ORDER',
      data: orderData,
      createRequest: true, // Flag to create SALR_E_RESELLER_REQUEST
    };
  } catch (error) {
    logger.error('Error handling ORDER command', { error: error.message });
    return {
      response: 'Error processing order. Please try again later.',
      messageType: 'ORDER',
    };
  }
}

/**
 * Handle CREDIT command - get credit balance
 */
async function handleCreditCommand(reseller) {
  try {
    const balance = await creditBackRepo.getCreditBalance(reseller.RESELLER_ID);

    const response = `Your Credit Back balance: AED ${balance.AVAILABLE_BALANCE.toFixed(2)}
Total Earned: AED ${balance.TOTAL_EARNED.toFixed(2)}
Total Redeemed: AED ${balance.TOTAL_REDEEMED.toFixed(2)}`;

    return {
      response,
      messageType: 'CREDIT',
      data: balance,
    };
  } catch (error) {
    logger.error('Error handling CREDIT command', { error: error.message });
    return {
      response: 'Error fetching credit balance. Please try again later.',
      messageType: 'CREDIT',
    };
  }
}

/**
 * Handle PROFILE command - generate OTP session
 */
async function handleProfileCommand(reseller) {
  try {
    // Generate session ID and OTP
    const sessionId = crypto.randomBytes(32).toString('hex');
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    // Hash OTP for storage
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Create session (expires in 15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await whatsappRepo.createOtpSession({
      sessionId,
      resellerId: reseller.RESELLER_ID,
      whatsappNumber: reseller.WHATSAPP_NUMBER,
      otpHash,
      expiresAt,
    });

    // In production, send OTP via WhatsApp
    // For now, include it in response (development only!)
    const profileUrl = `https://portal.sedar.com/profile/${sessionId}`;

    const response = `Your secure profile link: ${profileUrl}
Verification code: ${otp}
(Expires in 15 minutes)`;

    return {
      response,
      messageType: 'PROFILE',
      data: { sessionId, profileUrl },
    };
  } catch (error) {
    logger.error('Error handling PROFILE command', { error: error.message });
    return {
      response: 'Error generating profile link. Please try again later.',
      messageType: 'PROFILE',
    };
  }
}

/**
 * Process inbound WhatsApp message
 */
async function processInboundMessage(phoneNumber, messageText) {
  try {
    logger.info('Processing inbound WhatsApp message', { phoneNumber, messageText });

    // Find reseller by WhatsApp number
    const reseller = await erpRepo.getResellerByWhatsApp(phoneNumber);

    if (!reseller) {
      logger.warn('Reseller not found for WhatsApp number', { phoneNumber });
      return {
        response: 'Your number is not registered. Please contact support.',
        messageType: 'OTHER',
      };
    }

    // Parse message
    const parsed = parseInboundMessage(messageText);

    // Log inbound message
    await whatsappRepo.createMessage({
      resellerId: reseller.RESELLER_ID,
      phoneNumber,
      directionCode: 'INBOUND',
      messageType: parsed.command,
      messageBody: messageText,
      statusCode: 'RECEIVED',
      rawPayload: { parsed },
    });

    // Handle command
    let result;
    switch (parsed.command) {
      case 'AVAIL':
        result = await handleAvailCommand(reseller, parsed.skuCode);
        break;
      case 'ORDER':
        result = await handleOrderCommand(reseller, parsed);
        break;
      case 'CREDIT':
        result = await handleCreditCommand(reseller);
        break;
      case 'PROFILE':
        result = await handleProfileCommand(reseller);
        break;
      default:
        result = {
          response: `Available commands:
AVAIL <SKU_CODE> - Check availability
ORDER <SKU_CODE> <WIDTH> <HEIGHT> - Place order
CREDIT - Check credit balance
PROFILE - Get profile link`,
          messageType: 'OTHER',
        };
    }

    // Log outbound response
    await whatsappRepo.createMessage({
      resellerId: reseller.RESELLER_ID,
      phoneNumber,
      directionCode: 'OUTBOUND',
      messageType: result.messageType,
      messageBody: result.response,
      statusCode: 'SENT',
      sentAt: new Date(),
    });

    return result;
  } catch (error) {
    logger.error('Error processing inbound message', { error: error.message });
    throw error;
  }
}

/**
 * Send promotional message (simulated)
 */
async function sendPromoMessage(reseller, promo, sku) {
  try {
    const messageBody = sku.CAPTION_EN || `Special offer on ${sku.SKU_NAME}!
Before: AED ${sku.BEFORE_PRICE}
Now: AED ${sku.OFFER_PRICE}
Save ${sku.DISCOUNT_PERCENT}%!

Valid until ${new Date(promo.END_DT).toLocaleDateString()}`;

    const msgId = await whatsappRepo.createMessage({
      resellerId: reseller.RESELLER_ID,
      promoId: promo.PROMO_ID,
      phoneNumber: reseller.WHATSAPP_NUMBER,
      directionCode: 'OUTBOUND',
      messageType: 'PROMO',
      messageBody,
      statusCode: 'SENT', // In real integration: 'QUEUED'
      sentAt: new Date(),
      rawPayload: { promo, sku },
    });

    logger.info('Promo message sent (simulated)', { msgId, resellerId: reseller.RESELLER_ID });

    return msgId;
  } catch (error) {
    logger.error('Error sending promo message', { error: error.message });
    throw error;
  }
}

/**
 * Send internal alert to Sedar team
 */
async function sendInternalAlert(message, data = {}) {
  try {
    const msgId = await whatsappRepo.createMessage({
      directionCode: 'INTERNAL_ALERT',
      messageType: 'INTERNAL_ALERT',
      messageBody: message,
      statusCode: 'SENT',
      sentAt: new Date(),
      rawPayload: data,
    });

    logger.info('Internal alert created', { msgId, message });

    return msgId;
  } catch (error) {
    logger.error('Error sending internal alert', { error: error.message });
    throw error;
  }
}

module.exports = {
  parseInboundMessage,
  processInboundMessage,
  sendPromoMessage,
  sendInternalAlert,
};
