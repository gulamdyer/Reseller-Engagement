/**
 * Analytics Controller
 * API endpoints for analytics and KPIs
 */

const erpRepo = require('../../repositories/erpRepository');
const creditBackRepo = require('../creditBack/creditBackRepository');
const whatsappRepo = require('../whatsapp/whatsappRepository');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * GET /api/admin/analytics/overview
 * Get dashboard overview statistics
 */
const getOverview = asyncHandler(async (req, res) => {
  // Get reseller segmentation
  const resellers = await erpRepo.getResellersWithActivity();

  const segmentation = {
    total: resellers.length,
    active: 0,
    dormant: 0,
    churned: 0,
  };

  resellers.forEach(r => {
    const lastOrderDate = r.LAST_ORDER_DATE ? new Date(r.LAST_ORDER_DATE) : null;
    const daysSince = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSince <= 30) segmentation.active++;
    else if (daysSince <= 90) segmentation.dormant++;
    else segmentation.churned++;
  });

  // Get Credit Back outstanding
  const creditOutstanding = await creditBackRepo.getTotalOutstanding();

  // Get WhatsApp stats (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const whatsappStats = await whatsappRepo.getMessageStats({
    fromDate: thirtyDaysAgo,
  });

  res.json({
    success: true,
    data: {
      resellers: segmentation,
      creditBack: {
        totalOutstanding: creditOutstanding,
      },
      whatsapp: whatsappStats,
    },
  });
});

/**
 * GET /api/admin/analytics/sales-trend
 * Get sales trend data (last 6 months)
 */
const getSalesTrend = asyncHandler(async (req, res) => {
  // This is a placeholder - in production, you'd query aggregated sales data
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
      sales: Math.floor(Math.random() * 500000) + 300000, // Placeholder
      promoSales: Math.floor(Math.random() * 100000) + 50000, // Placeholder
    });
  }

  res.json({
    success: true,
    data: months,
  });
});

/**
 * GET /api/admin/analytics/whatsapp-engagement
 * Get WhatsApp engagement metrics
 */
const getWhatsAppEngagement = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.query;

  const filters = {};
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;

  const stats = await whatsappRepo.getMessageStats(filters);

  // Calculate engagement rates
  const deliveryRate = stats.OUTBOUND_COUNT > 0
    ? (stats.DELIVERED_COUNT / stats.OUTBOUND_COUNT) * 100
    : 0;

  const readRate = stats.DELIVERED_COUNT > 0
    ? (stats.READ_COUNT / stats.DELIVERED_COUNT) * 100
    : 0;

  const replyRate = stats.READ_COUNT > 0
    ? (stats.REPLIED_COUNT / stats.READ_COUNT) * 100
    : 0;

  res.json({
    success: true,
    data: {
      ...stats,
      rates: {
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        readRate: Math.round(readRate * 100) / 100,
        replyRate: Math.round(replyRate * 100) / 100,
      },
    },
  });
});

/**
 * GET /api/admin/analytics/export/resellers
 * Export resellers data as CSV
 */
const exportResellers = asyncHandler(async (req, res) => {
  const resellers = await erpRepo.getResellersWithActivity();

  // Create CSV
  const csvRows = [
    ['Reseller ID', 'Name', 'Region', 'Last Order Date', 'Orders (12M)', 'Sales (12M)', 'Status'],
  ];

  resellers.forEach(r => {
    const lastOrderDate = r.LAST_ORDER_DATE ? new Date(r.LAST_ORDER_DATE) : null;
    const daysSince = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let status = 'CHURNED';
    if (daysSince <= 30) status = 'ACTIVE';
    else if (daysSince <= 90) status = 'DORMANT';

    csvRows.push([
      r.RESELLER_ID,
      r.RESELLER_NAME,
      r.REGION || '',
      lastOrderDate ? lastOrderDate.toISOString().split('T')[0] : '',
      r.ORDERS_LAST_12M || 0,
      r.SALES_LAST_12M || 0,
      status,
    ]);
  });

  const csv = csvRows.map(row => row.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=resellers.csv');
  res.send(csv);
});

module.exports = {
  getOverview,
  getSalesTrend,
  getWhatsAppEngagement,
  exportResellers,
};
