/**
 * Promo Controller
 * API endpoints for promotions management
 */

const promoRepo = require('./promoRepository');
const promoService = require('./promoService');
const erpRepo = require('../../repositories/erpRepository');
const { asyncHandler, validationError, notFoundError } = require('../../middleware/errorHandler');

/**
 * GET /api/admin/promos
 */
const getPromos = asyncHandler(async (req, res) => {
  const { status, targetSegment } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (targetSegment) filters.targetSegment = targetSegment;

  const promos = await promoRepo.getAllPromos(filters);

  res.json({
    success: true,
    data: promos,
    count: promos.length,
  });
});

/**
 * GET /api/admin/promos/:id
 */
const getPromoById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const promo = await promoRepo.getPromoById(parseInt(id, 10));

  if (!promo) {
    throw notFoundError('Promotion');
  }

  res.json({
    success: true,
    data: promo,
  });
});

/**
 * POST /api/admin/promos
 */
const createPromo = asyncHandler(async (req, res) => {
  const { promoName, description, startDt, endDt, targetSegment } = req.body;

  if (!promoName || !startDt || !endDt) {
    throw validationError('Missing required fields: promoName, startDt, endDt');
  }

  const promoData = {
    promoName,
    description,
    startDt,
    endDt,
    targetSegment: targetSegment || 'DORMANT',
    statusCode: 'DRAFT',
  };

  const promoId = await promoRepo.createPromo(promoData, req.user.username);

  res.status(201).json({
    success: true,
    message: 'Promotion created successfully',
    data: { promoId },
  });
});

/**
 * PUT /api/admin/promos/:id
 */
const updatePromo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await promoRepo.getPromoById(parseInt(id, 10));
  if (!existing) {
    throw notFoundError('Promotion');
  }

  const success = await promoRepo.updatePromo(parseInt(id, 10), req.body, req.user.username);

  res.json({
    success,
    message: 'Promotion updated successfully',
  });
});

/**
 * POST /api/admin/promos/:id/skus
 */
const addPromoSku = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { skuId, skuCode, beforePrice, offerPrice, captionEn, captionAr } = req.body;

  if (!skuId || !beforePrice || !offerPrice) {
    throw validationError('Missing required fields: skuId, beforePrice, offerPrice');
  }

  // Get SKU details from ERP
  const sku = await erpRepo.getSKU(skuId);

  if (!sku) {
    throw notFoundError('SKU');
  }

  const promoSkuData = {
    promoId: parseInt(id, 10),
    skuId,
    skuCode: sku.SKU_CODE,
    skuName: sku.SKU_NAME,
    beforePrice,
    offerPrice,
    captionEn: captionEn || `Special offer on ${sku.SKU_NAME}! Now only AED ${offerPrice}!`,
    captionAr: captionAr || `عرض خاص على ${sku.SKU_NAME}! الآن فقط ${offerPrice} درهم!`,
  };

  const promoSkuId = await promoRepo.addPromoSku(promoSkuData);

  res.status(201).json({
    success: true,
    message: 'SKU added to promotion',
    data: { promoSkuId },
  });
});

/**
 * POST /api/admin/promos/:id/send
 */
const sendPromo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await promoService.sendPromotion(parseInt(id, 10), req.user.username);

  res.json({
    success: true,
    message: 'Promotion sent successfully',
    data: result,
  });
});

/**
 * GET /api/admin/promos/candidate-skus/:type
 */
const getCandidateSkus = asyncHandler(async (req, res) => {
  const { type } = req.params;

  let skus = [];

  if (type === 'slow-moving') {
    skus = await erpRepo.getSlowMovingSkus({ monthsBack: 6, maxSalesQty: 10 });
  } else if (type === 'overstocked') {
    skus = await erpRepo.getOverstockedSkus({ overstockMultiplier: 3 });
  } else {
    throw validationError('Invalid type. Use: slow-moving or overstocked');
  }

  res.json({
    success: true,
    data: skus,
    count: skus.length,
  });
});

module.exports = {
  getPromos,
  getPromoById,
  createPromo,
  updatePromo,
  addPromoSku,
  sendPromo,
  getCandidateSkus,
};
