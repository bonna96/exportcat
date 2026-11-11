const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authGuard');
const { apiLimiter, searchLimiter, enquiryLimiter } = require('../middleware/rateLimit');
const { search, autocomplete } = require('../controllers/searchController');
const {
  listCategories, createCategory, updateCategory,
  listProducts, createProduct, updateProduct,
  publishProduct, unpublishProduct, redirectProduct,
  setPriceBrackets, uploadProductImage, createVariant,
} = require('../controllers/catalogController');
const { submitEnquiry, listEnquiries, updateEnquiryStatus } = require('../controllers/enquiryController');
const {
  getSearchAnalytics, runIrEval, runCrawlAudit,
  getSynonymRules, createSynonymRule, updateSynonymRule, deleteSynonymRule,
} = require('../controllers/analystController');
const {
  listUsers, updateUserRole, getFacetRules, updateFacetRule, getAuditLogs,
  demoLogin,
} = require('../controllers/adminController');
const { upload } = require('../services/imagePipeline');

// Apply general rate limiter to all API routes
router.use(apiLimiter);

// ─── Auth (Demo) ────────────────────────────────────────────────────────────
router.post('/auth/demo-login', demoLogin);

// ─── Search ─────────────────────────────────────────────────────────────────
router.get('/search', searchLimiter, search);
router.get('/autocomplete', searchLimiter, autocomplete);

// ─── Categories (Public) ────────────────────────────────────────────────────
router.get('/categories', listCategories);

// ─── Products (Public) ──────────────────────────────────────────────────────
router.get('/products', listProducts);

// ─── Enquiries (Buyer) ──────────────────────────────────────────────────────
router.post('/enquiries', enquiryLimiter, submitEnquiry);

// ─── Catalogue Management (Manager + Admin) ─────────────────────────────────
router.post('/categories', requireAuth, requireRole('MANAGER', 'ADMIN'), createCategory);
router.put('/categories/:id', requireAuth, requireRole('MANAGER', 'ADMIN'), updateCategory);

router.post('/products', requireAuth, requireRole('MANAGER', 'ADMIN'), createProduct);
router.put('/products/:id', requireAuth, requireRole('MANAGER', 'ADMIN'), updateProduct);
router.post('/products/:id/publish', requireAuth, requireRole('MANAGER', 'ADMIN'), publishProduct);
router.post('/products/:id/unpublish', requireAuth, requireRole('MANAGER', 'ADMIN'), unpublishProduct);
router.post('/products/:id/redirect', requireAuth, requireRole('MANAGER', 'ADMIN'), redirectProduct);
router.put('/products/:productId/price-brackets', requireAuth, requireRole('MANAGER', 'ADMIN'), setPriceBrackets);
router.post('/products/:productId/images', requireAuth, requireRole('MANAGER', 'ADMIN'), upload.single('image'), uploadProductImage);
router.post('/products/:productId/variants', requireAuth, requireRole('MANAGER', 'ADMIN'), createVariant);

// ─── Enquiry Management (Manager + Admin) ───────────────────────────────────
router.get('/enquiries', requireAuth, requireRole('MANAGER', 'ADMIN'), listEnquiries);
router.put('/enquiries/:id/status', requireAuth, requireRole('MANAGER', 'ADMIN'), updateEnquiryStatus);

// ─── Analyst Routes ─────────────────────────────────────────────────────────
router.get('/analytics/search', requireAuth, requireRole('ANALYST', 'ADMIN'), getSearchAnalytics);
router.get('/analytics/ir-eval', requireAuth, requireRole('ANALYST', 'ADMIN'), runIrEval);
router.get('/analytics/crawl-audit', requireAuth, requireRole('ANALYST', 'ADMIN'), runCrawlAudit);
router.get('/synonyms', requireAuth, requireRole('ANALYST', 'MANAGER', 'ADMIN'), getSynonymRules);
router.post('/synonyms', requireAuth, requireRole('MANAGER', 'ADMIN'), createSynonymRule);
router.put('/synonyms/:id', requireAuth, requireRole('MANAGER', 'ADMIN'), updateSynonymRule);
router.delete('/synonyms/:id', requireAuth, requireRole('MANAGER', 'ADMIN'), deleteSynonymRule);

// ─── Admin Routes ───────────────────────────────────────────────────────────
router.get('/users', requireAuth, requireRole('ADMIN'), listUsers);
router.put('/users/:id/role', requireAuth, requireRole('ADMIN'), updateUserRole);
router.get('/facet-rules', requireAuth, requireRole('ADMIN'), getFacetRules);
router.put('/facet-rules/:id', requireAuth, requireRole('ADMIN'), updateFacetRule);
router.get('/audit-logs', requireAuth, requireRole('ADMIN'), getAuditLogs);

module.exports = router;
