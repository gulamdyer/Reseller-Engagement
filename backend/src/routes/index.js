/**
 * API Routes
 * Centralized route definitions for all modules
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');

// Controllers
const authController = require('../modules/auth/authController');
const creditBackController = require('../modules/creditBack/creditBackController');
const promoController = require('../modules/promo/promoController');
const whatsappController = require('../modules/whatsapp/whatsappController');
const resellerController = require('../modules/reseller/resellerController');
const analyticsController = require('../modules/analytics/analyticsController');

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Auth routes
router.post('/auth/login', authController.login);

// WhatsApp webhook (public endpoint for WhatsApp API)
router.post('/whatsapp/webhook', whatsappController.webhook);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// Apply authentication middleware to all /admin routes
router.use('/admin', authenticateToken);

// --- Auth (Protected) ---
router.post('/auth/logout', authenticateToken, authController.logout);
router.get('/auth/validate', authenticateToken, authController.validateToken);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);

// --- Credit Back ---
router.get('/admin/credit-back/rules', creditBackController.getRules);
router.get('/admin/credit-back/rules/:id', creditBackController.getRuleById);
router.post('/admin/credit-back/rules', creditBackController.createRule);
router.put('/admin/credit-back/rules/:id', creditBackController.updateRule);
router.post('/admin/credit-back/rules/:id/activate', creditBackController.activateRule);
router.post('/admin/credit-back/rules/:id/deactivate', creditBackController.deactivateRule);
router.get('/admin/credit-back/ledger/:resellerId', creditBackController.getResellerLedger);
router.get('/admin/credit-back/balance/:resellerId', creditBackController.getResellerBalance);
router.post('/admin/credit-back/calculate', creditBackController.calculateCredit);
router.post('/admin/credit-back/award', creditBackController.awardCredit);
router.get('/admin/credit-back/stats', creditBackController.getCreditStats);

// --- Promotions ---
router.get('/admin/promos', promoController.getPromos);
router.get('/admin/promos/:id', promoController.getPromoById);
router.post('/admin/promos', promoController.createPromo);
router.put('/admin/promos/:id', promoController.updatePromo);
router.post('/admin/promos/:id/skus', promoController.addPromoSku);
router.post('/admin/promos/:id/send', promoController.sendPromo);
router.get('/admin/promos/candidate-skus/:type', promoController.getCandidateSkus);

// --- Resellers ---
router.get('/admin/resellers', resellerController.getResellers);
router.get('/admin/resellers/:id', resellerController.getResellerDetails);
router.get('/admin/resellers/stats/segmentation', resellerController.getSegmentation);

// --- WhatsApp (Admin) ---
router.get('/admin/whatsapp/messages', whatsappController.getMessages);
router.get('/admin/whatsapp/stats', whatsappController.getStats);
router.post('/admin/whatsapp/test', whatsappController.testMessage);

// --- Analytics ---
router.get('/admin/analytics/overview', analyticsController.getOverview);
router.get('/admin/analytics/sales-trend', analyticsController.getSalesTrend);
router.get('/admin/analytics/whatsapp-engagement', analyticsController.getWhatsAppEngagement);
router.get('/admin/analytics/export/resellers', analyticsController.exportResellers);

module.exports = router;
