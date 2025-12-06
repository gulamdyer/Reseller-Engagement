/**
 * WhatsApp Controller
 * API endpoints for WhatsApp webhook and message management
 */

const whatsappService = require('./whatsappService');
const whatsappRepo = require('./whatsappRepository');
const { asyncHandler, validationError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');

/**
 * POST /api/whatsapp/webhook
 * WhatsApp webhook for incoming messages
 */
const webhook = asyncHandler(async (req, res) => {
  const { from, text, timestamp } = req.body;

  logger.info('WhatsApp webhook received', { from, text });

  if (!from || !text) {
    throw validationError('Missing required fields: from, text');
  }

  // Process message
  const result = await whatsappService.processInboundMessage(from, text);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/admin/whatsapp/messages
 * Get WhatsApp messages with filters
 */
const getMessages = asyncHandler(async (req, res) => {
  const { resellerId, promoId, direction, status, type, limit, fromDate, toDate } = req.query;

  const filters = {};
  if (resellerId) filters.resellerId = parseInt(resellerId, 10);
  if (promoId) filters.promoId = parseInt(promoId, 10);
  if (direction) filters.directionCode = direction;
  if (status) filters.statusCode = status;
  if (type) filters.messageType = type;
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;
  if (limit) filters.limit = parseInt(limit, 10);

  const messages = await whatsappRepo.getMessages(filters);

  res.json({
    success: true,
    data: messages,
    count: messages.length,
  });
});

/**
 * GET /api/admin/whatsapp/stats
 * Get WhatsApp message statistics
 */
const getStats = asyncHandler(async (req, res) => {
  const { promoId, fromDate, toDate } = req.query;

  const filters = {};
  if (promoId) filters.promoId = parseInt(promoId, 10);
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;

  const stats = await whatsappRepo.getMessageStats(filters);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * POST /api/admin/whatsapp/test
 * Test sending a message (simulation)
 */
const testMessage = asyncHandler(async (req, res) => {
  const { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    throw validationError('Missing required fields: phoneNumber, message');
  }

  const msgId = await whatsappRepo.createMessage({
    phoneNumber,
    directionCode: 'OUTBOUND',
    messageType: 'OTHER',
    messageBody: message,
    statusCode: 'SENT',
    sourceChannel: 'MANUAL',
    sentAt: new Date(),
  });

  res.json({
    success: true,
    message: 'Test message sent (simulated)',
    data: { msgId },
  });
});

module.exports = {
  webhook,
  getMessages,
  getStats,
  testMessage,
};
