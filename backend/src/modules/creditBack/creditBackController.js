/**
 * Credit Back Controller
 * API endpoints for Credit Back management
 */

const creditBackRepo = require('./creditBackRepository');
const creditBackService = require('./creditBackService');
const { asyncHandler, validationError, notFoundError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');

/**
 * GET /api/admin/credit-back/rules
 * Get all Credit Back rules
 */
const getRules = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const filters = {};
  if (isActive !== undefined) {
    filters.isActive = isActive === 'true';
  }

  const rules = await creditBackRepo.getAllRules(filters);

  res.json({
    success: true,
    data: rules,
    count: rules.length,
  });
});

/**
 * GET /api/admin/credit-back/rules/:id
 * Get a single Credit Back rule with brackets
 */
const getRuleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rule = await creditBackRepo.getRuleById(parseInt(id, 10));

  if (!rule) {
    throw notFoundError('Credit Back rule');
  }

  res.json({
    success: true,
    data: rule,
  });
});

/**
 * POST /api/admin/credit-back/rules
 * Create a new Credit Back rule
 */
const createRule = asyncHandler(async (req, res) => {
  const { ruleName, validFrom, validTo, modeCode, brackets } = req.body;

  // Validation
  if (!ruleName || !validFrom || !validTo || !modeCode) {
    throw validationError('Missing required fields', {
      required: ['ruleName', 'validFrom', 'validTo', 'modeCode'],
    });
  }

  if (!['NEXT_ORDER', 'NEXT_WITHIN', 'ANYTIME'].includes(modeCode)) {
    throw validationError('Invalid mode code', {
      allowedValues: ['NEXT_ORDER', 'NEXT_WITHIN', 'ANYTIME'],
    });
  }

  if (!brackets || brackets.length === 0) {
    throw validationError('At least one bracket is required');
  }

  // Validate brackets
  for (const bracket of brackets) {
    if (bracket.minSalesAmount === undefined || bracket.creditPercent === undefined) {
      throw validationError('Invalid bracket data', {
        required: ['minSalesAmount', 'creditPercent'],
      });
    }
  }

  const ruleData = {
    ruleName,
    validFrom,
    validTo,
    modeCode,
    isActive: req.body.isActive !== false,
    brackets,
  };

  const ruleId = await creditBackRepo.createRule(ruleData, req.user.username);

  res.status(201).json({
    success: true,
    message: 'Credit Back rule created successfully',
    data: { ruleId },
  });
});

/**
 * PUT /api/admin/credit-back/rules/:id
 * Update a Credit Back rule
 */
const updateRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ruleName, validFrom, validTo, modeCode, brackets, isActive } = req.body;

  // Check if rule exists
  const existingRule = await creditBackRepo.getRuleById(parseInt(id, 10));
  if (!existingRule) {
    throw notFoundError('Credit Back rule');
  }

  // Validation
  if (!ruleName || !validFrom || !validTo || !modeCode) {
    throw validationError('Missing required fields');
  }

  const ruleData = {
    ruleName,
    validFrom,
    validTo,
    modeCode,
    isActive,
    brackets,
  };

  await creditBackRepo.updateRule(parseInt(id, 10), ruleData, req.user.username);

  res.json({
    success: true,
    message: 'Credit Back rule updated successfully',
  });
});

/**
 * POST /api/admin/credit-back/rules/:id/activate
 * Activate a Credit Back rule
 */
const activateRule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const success = await creditBackRepo.toggleRuleActive(parseInt(id, 10), true, req.user.username);

  if (!success) {
    throw notFoundError('Credit Back rule');
  }

  res.json({
    success: true,
    message: 'Credit Back rule activated',
  });
});

/**
 * POST /api/admin/credit-back/rules/:id/deactivate
 * Deactivate a Credit Back rule
 */
const deactivateRule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const success = await creditBackRepo.toggleRuleActive(parseInt(id, 10), false, req.user.username);

  if (!success) {
    throw notFoundError('Credit Back rule');
  }

  res.json({
    success: true,
    message: 'Credit Back rule deactivated',
  });
});

/**
 * GET /api/admin/credit-back/ledger/:resellerId
 * Get Credit Back ledger for a reseller
 */
const getResellerLedger = asyncHandler(async (req, res) => {
  const { resellerId } = req.params;
  const { status } = req.query;

  const filters = {};
  if (status) {
    filters.statusCode = status;
  }

  const ledgerEntries = await creditBackRepo.getLedgerEntriesByReseller(
    parseInt(resellerId, 10),
    filters
  );

  res.json({
    success: true,
    data: ledgerEntries,
    count: ledgerEntries.length,
  });
});

/**
 * GET /api/admin/credit-back/balance/:resellerId
 * Get Credit Back balance for a reseller
 */
const getResellerBalance = asyncHandler(async (req, res) => {
  const { resellerId } = req.params;

  const summary = await creditBackService.getResellerCreditSummary(parseInt(resellerId, 10));

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * POST /api/admin/credit-back/calculate
 * Calculate Credit Back for an order (dry run)
 */
const calculateCredit = asyncHandler(async (req, res) => {
  const { resellerId, orderAmount, orderDate } = req.body;

  if (!resellerId || !orderAmount || !orderDate) {
    throw validationError('Missing required fields', {
      required: ['resellerId', 'orderAmount', 'orderDate'],
    });
  }

  const calculation = await creditBackService.calculateCreditBack(
    parseInt(resellerId, 10),
    parseFloat(orderAmount),
    orderDate
  );

  res.json({
    success: true,
    data: calculation,
  });
});

/**
 * POST /api/admin/credit-back/award
 * Award Credit Back to a reseller
 */
const awardCredit = asyncHandler(async (req, res) => {
  const { resellerId, orderAmount, orderDate, orderId } = req.body;

  if (!resellerId || !orderAmount || !orderDate) {
    throw validationError('Missing required fields');
  }

  // Calculate credit
  const calculation = await creditBackService.calculateCreditBack(
    parseInt(resellerId, 10),
    parseFloat(orderAmount),
    orderDate,
    orderId
  );

  if (!calculation.applicable) {
    res.json({
      success: false,
      message: calculation.reason || 'Credit Back not applicable',
      data: calculation,
    });
    return;
  }

  // Award credit
  const result = await creditBackService.awardCreditBack(
    parseInt(resellerId, 10),
    calculation,
    req.user.username
  );

  res.status(201).json({
    success: true,
    message: 'Credit Back awarded successfully',
    data: result,
  });
});

/**
 * GET /api/admin/credit-back/stats
 * Get overall Credit Back statistics
 */
const getCreditStats = asyncHandler(async (req, res) => {
  const totalOutstanding = await creditBackRepo.getTotalOutstanding();

  res.json({
    success: true,
    data: {
      totalOutstanding,
    },
  });
});

module.exports = {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  activateRule,
  deactivateRule,
  getResellerLedger,
  getResellerBalance,
  calculateCredit,
  awardCredit,
  getCreditStats,
};
