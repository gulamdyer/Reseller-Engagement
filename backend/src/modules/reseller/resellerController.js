/**
 * Reseller Controller
 * API endpoints for reseller data and activity
 */

const erpRepo = require('../../repositories/erpRepository');
const creditBackRepo = require('../creditBack/creditBackRepository');
const whatsappRepo = require('../whatsapp/whatsappRepository');
const { asyncHandler, notFoundError } = require('../../middleware/errorHandler');

/**
 * GET /api/admin/resellers
 * Get all resellers with activity summary
 */
const getResellers = asyncHandler(async (req, res) => {
  const { region, searchTerm } = req.query;

  const filters = {};
  if (region) filters.region = region;
  if (searchTerm) filters.searchTerm = searchTerm;

  const resellers = await erpRepo.getResellersWithActivity(filters);

  // Calculate status based on last order date
  const enrichedResellers = resellers.map(r => {
    const lastOrderDate = r.LAST_ORDER_DATE ? new Date(r.LAST_ORDER_DATE) : null;
    const daysSinceOrder = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let activityStatus = 'CHURNED';
    if (daysSinceOrder <= 30) activityStatus = 'ACTIVE';
    else if (daysSinceOrder <= 90) activityStatus = 'DORMANT';

    return {
      ...r,
      DAYS_SINCE_LAST_ORDER: lastOrderDate ? daysSinceOrder : null,
      ACTIVITY_STATUS: activityStatus,
    };
  });

  res.json({
    success: true,
    data: enrichedResellers,
    count: enrichedResellers.length,
  });
});

/**
 * GET /api/admin/resellers/:id
 * Get reseller details with credit, promos, and WhatsApp history
 */
const getResellerDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const resellerId = parseInt(id, 10);

  const reseller = await erpRepo.getResellerById(resellerId);

  if (!reseller) {
    throw notFoundError('Reseller');
  }

  // Get credit balance
  const creditBalance = await creditBackRepo.getCreditBalance(resellerId);

  // Get recent credit transactions
  const creditLedger = await creditBackRepo.getLedgerEntriesByReseller(resellerId, {});

  // Get WhatsApp history
  const whatsappHistory = await whatsappRepo.getMessages({
    resellerId,
    limit: 50,
  });

  res.json({
    success: true,
    data: {
      reseller,
      creditBalance,
      recentCreditTransactions: creditLedger.slice(0, 10),
      recentWhatsAppMessages: whatsappHistory.slice(0, 20),
    },
  });
});

/**
 * GET /api/admin/resellers/stats/segmentation
 * Get reseller segmentation stats
 */
const getSegmentation = asyncHandler(async (req, res) => {
  const resellers = await erpRepo.getResellersWithActivity();

  const stats = {
    total: resellers.length,
    active: 0,
    dormant: 0,
    churned: 0,
  };

  resellers.forEach(r => {
    const lastOrderDate = r.LAST_ORDER_DATE ? new Date(r.LAST_ORDER_DATE) : null;
    const daysSinceOrder = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceOrder <= 30) stats.active++;
    else if (daysSinceOrder <= 90) stats.dormant++;
    else stats.churned++;
  });

  res.json({
    success: true,
    data: stats,
  });
});

module.exports = {
  getResellers,
  getResellerDetails,
  getSegmentation,
};
