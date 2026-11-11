const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { getProductBySlug, getCategoryBySlug, listCategories } = require('../controllers/catalogController');
const { searchProducts } = require('../services/searchService');
const {
  generateProductJsonLd, generateBreadcrumbJsonLd, generateOrganizationJsonLd,
  generateHreflangTags, generateCanonicalUrl, generateSeoMeta,
} = require('../services/seoGenerator');
const { facetPolicyMiddleware } = require('../middleware/facetPolicy');
const { redirectManager } = require('../middleware/redirectManager');
const { requireAuth, requireRole } = require('../middleware/authGuard');

const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE || 'en-gb';

// ─── Public Pages ───────────────────────────────────────────────────────────

const { demoLogin, logout } = require('../controllers/adminController');

// Root redirect to default locale
router.get('/', (req, res) => {
  res.redirect(302, `/${DEFAULT_LOCALE}`);
});

// Login page
router.get('/login', (req, res) => {
  res.render('pages/login', {
    title: 'Sign In — ExportCat',
    layout: 'layouts/main',
    user: req.user,
    seo: generateSeoMeta({ title: 'Sign In — ExportCat', robots: 'noindex, nofollow' }),
  });
});

router.post('/login', demoLogin);
router.get('/logout', logout);

// ─── Locale-prefixed routes ─────────────────────────────────────────────────

// Home page
router.get('/:locale', async (req, res) => {
  try {
    const { locale } = req.params;
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where: { status: 'PUBLISHED' } } } } },
      orderBy: { sortOrder: 'asc' },
    });

    const featuredProducts = await prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        category: true,
        priceBrackets: { orderBy: { minQty: 'asc' }, take: 1 },
        images: { where: { isPrimary: true }, take: 1 },
      },
      take: 12,
      orderBy: { publishedAt: 'desc' },
    });

    const totalProducts = await prisma.product.count({ where: { status: 'PUBLISHED' } });

    const seo = generateSeoMeta({
      title: 'ExportCat — B2B Wholesale Export Product Catalogue',
      description: 'Browse wholesale export products from verified Bangladeshi suppliers. Jute, textiles, leather, ceramics, and more with MOQ pricing.',
      canonical: generateCanonicalUrl(locale, ''),
      hreflangTags: generateHreflangTags('', locale),
      jsonLd: generateOrganizationJsonLd(),
    });

    res.render('pages/home', {
      layout: 'layouts/main',
      title: seo.title,
      seo,
      locale,
      categories,
      featuredProducts,
      totalProducts,
      user: req.user,
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error',
      statusCode: 500,
      message: 'Something went wrong.',
      layout: 'layouts/main',
    });
  }
});

// Category page with faceted navigation
router.get('/:locale/categories/:slug', facetPolicyMiddleware, async (req, res) => {
  try {
    const { locale, slug } = req.params;
    const category = await getCategoryBySlug(slug);

    if (!category) {
      return res.status(404).render('pages/error', {
        title: 'Category Not Found',
        statusCode: 404,
        message: 'The category you are looking for does not exist.',
        layout: 'layouts/main',
        user: req.user,
      });
    }

    // Search within category
    const results = await searchProducts(req.query.q || '', {
      locale,
      category: slug,
      page: parseInt(req.query.page) || 1,
      pageSize: 20,
      materials: req.query.material ? [].concat(req.query.material) : [],
      certifications: req.query.certification ? [].concat(req.query.certification) : [],
      originCountry: req.query.origin,
    });

    const breadcrumbs = [
      { name: 'Home', url: `/${locale}` },
      { name: category.name, url: null },
    ];

    const seo = generateSeoMeta({
      title: category.metaTitle || `${category.name} — Wholesale Export | ExportCat`,
      description: category.metaDesc || category.description,
      canonical: res.locals.canonicalUrl || generateCanonicalUrl(locale, `/categories/${slug}`),
      hreflangTags: generateHreflangTags(`/categories/${slug}`, locale),
      jsonLd: generateBreadcrumbJsonLd(breadcrumbs, locale),
    });

    res.render('pages/category', {
      layout: 'layouts/main',
      title: seo.title,
      seo,
      locale,
      category,
      products: results.products,
      total: results.total,
      page: results.page,
      totalPages: results.totalPages,
      facets: results.facets,
      breadcrumbs,
      query: req.query,
      user: req.user,
    });
  } catch (err) {
    console.error('Category page error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error',
      statusCode: 500,
      message: 'Something went wrong.',
      layout: 'layouts/main',
    });
  }
});

// Product detail page
router.get('/:locale/products/:slug', redirectManager, async (req, res) => {
  try {
    const { locale, slug } = req.params;
    const product = await getProductBySlug(slug);

    if (!product || product.status === 'DRAFT') {
      return res.status(404).render('pages/error', {
        title: 'Product Not Found',
        statusCode: 404,
        message: 'The product you are looking for does not exist.',
        layout: 'layouts/main',
        user: req.user,
      });
    }

    const breadcrumbs = [
      { name: 'Home', url: `/${locale}` },
      { name: product.category.name, url: `/${locale}/categories/${product.category.slug}` },
      { name: product.name, url: null },
    ];

    // Related products in same category
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: 'PUBLISHED',
        id: { not: product.id },
      },
      include: {
        priceBrackets: { orderBy: { minQty: 'asc' }, take: 1 },
        images: { where: { isPrimary: true }, take: 1 },
      },
      take: 4,
    });

    const seo = generateSeoMeta({
      title: product.metaTitle || `${product.name} — Export | ExportCat`,
      description: product.metaDesc || product.shortDesc || product.description?.substring(0, 155),
      canonical: generateCanonicalUrl(locale, `/products/${slug}`),
      hreflangTags: generateHreflangTags(`/products/${slug}`, locale),
      jsonLd: [
        generateProductJsonLd(product, locale),
        generateBreadcrumbJsonLd(breadcrumbs, locale),
      ],
    });

    res.render('pages/product', {
      layout: 'layouts/main',
      title: seo.title,
      seo,
      locale,
      product,
      breadcrumbs,
      relatedProducts,
      user: req.user,
    });
  } catch (err) {
    console.error('Product page error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error',
      statusCode: 500,
      message: 'Something went wrong.',
      layout: 'layouts/main',
    });
  }
});

// Search results page
router.get('/:locale/search', async (req, res) => {
  try {
    const { locale } = req.params;
    const query = req.query.q || '';

    const results = await searchProducts(query, {
      locale,
      page: parseInt(req.query.page) || 1,
      pageSize: 20,
      materials: req.query.material ? [].concat(req.query.material) : [],
      certifications: req.query.certification ? [].concat(req.query.certification) : [],
      originCountry: req.query.origin,
    });

    const breadcrumbs = [
      { name: 'Home', url: `/${locale}` },
      { name: `Search: "${query}"`, url: null },
    ];

    const seo = generateSeoMeta({
      title: `Search: "${query}" — ExportCat`,
      description: `Found ${results.total} products for "${query}".`,
      robots: 'noindex, follow',
    });

    res.render('pages/search', {
      layout: 'layouts/main',
      title: seo.title,
      seo,
      locale,
      query,
      results,
      breadcrumbs,
      user: req.user,
    });
  } catch (err) {
    console.error('Search page error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error',
      statusCode: 500,
      message: 'Something went wrong.',
      layout: 'layouts/main',
    });
  }
});

// Compare products page
router.get('/:locale/compare', async (req, res) => {
  try {
    const { locale } = req.params;
    const slugs = req.query.products ? req.query.products.split(',') : [];

    const products = slugs.length > 0
      ? await prisma.product.findMany({
          where: { slug: { in: slugs }, status: 'PUBLISHED' },
          include: {
            category: true,
            variants: true,
            priceBrackets: { orderBy: { minQty: 'asc' } },
            images: { where: { isPrimary: true }, take: 1 },
            supplier: true,
          },
        })
      : [];

    res.render('pages/compare', {
      layout: 'layouts/main',
      title: 'Compare Products — ExportCat',
      seo: generateSeoMeta({ title: 'Compare Products', robots: 'noindex, nofollow' }),
      locale,
      products,
      user: req.user,
    });
  } catch (err) {
    console.error('Compare page error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error',
      statusCode: 500,
      message: 'Something went wrong.',
      layout: 'layouts/main',
    });
  }
});

// ─── Manager Dashboard ──────────────────────────────────────────────────────

router.get('/manager/dashboard', requireAuth, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: req.user.role === 'MANAGER' ? { managerId: req.user.id } : {},
      include: { category: true, _count: { select: { enquiries: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const stats = {
      total: products.length,
      published: products.filter((p) => p.status === 'PUBLISHED').length,
      draft: products.filter((p) => p.status === 'DRAFT').length,
      enquiries: products.reduce((sum, p) => sum + p._count.enquiries, 0),
    };

    res.render('pages/manager-dashboard', {
      layout: 'layouts/main',
      title: 'Catalogue Manager — ExportCat',
      seo: generateSeoMeta({ title: 'Manager Dashboard', robots: 'noindex, nofollow' }),
      user: req.user,
      products,
      categories,
      stats,
    });
  } catch (err) {
    console.error('Manager dashboard error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error', statusCode: 500, message: 'Something went wrong.', layout: 'layouts/main',
    });
  }
});

// ─── Analyst Dashboard ──────────────────────────────────────────────────────

router.get('/analyst/dashboard', requireAuth, requireRole('ANALYST', 'ADMIN'), async (req, res) => {
  try {
    const recentSearches = await prisma.searchQueryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const synonyms = await prisma.synonymRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalSearches = await prisma.searchQueryLog.count();
    const zeroResults = await prisma.searchQueryLog.count({ where: { resultCount: 0 } });

    res.render('pages/analyst-dashboard', {
      layout: 'layouts/main',
      title: 'Search & SEO Analyst — ExportCat',
      seo: generateSeoMeta({ title: 'Analyst Dashboard', robots: 'noindex, nofollow' }),
      user: req.user,
      recentSearches,
      synonyms,
      totalSearches,
      zeroResults,
    });
  } catch (err) {
    console.error('Analyst dashboard error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error', statusCode: 500, message: 'Something went wrong.', layout: 'layouts/main',
    });
  }
});

// ─── Admin Dashboard ────────────────────────────────────────────────────────

router.get('/admin/dashboard', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const [userCount, productCount, enquiryCount, searchCount] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.quoteEnquiry.count(),
      prisma.searchQueryLog.count(),
    ]);

    const recentLogs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.render('pages/admin-dashboard', {
      layout: 'layouts/main',
      title: 'Site Administrator — ExportCat',
      seo: generateSeoMeta({ title: 'Admin Dashboard', robots: 'noindex, nofollow' }),
      user: req.user,
      stats: { userCount, productCount, enquiryCount, searchCount },
      recentLogs,
      users,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).render('pages/error', {
      title: 'Server Error', statusCode: 500, message: 'Something went wrong.', layout: 'layouts/main',
    });
  }
});

module.exports = router;
