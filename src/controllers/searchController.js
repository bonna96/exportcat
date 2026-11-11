const { searchProducts, getAutocompleteSuggestions } = require('../services/searchService');
const prisma = require('../config/prisma');

/**
 * ── Search Controller ──
 * BM25 search, autocomplete, and query logging (FR-3, FR-4)
 */

async function search(req, res) {
  try {
    const {
      q: query,
      page = 1,
      pageSize = 20,
      category,
      material,
      certification,
      origin,
      priceMin,
      priceMax,
      moqMax,
      sort = '_score',
      order = 'desc',
      locale = 'en-gb',
    } = req.query;

    const startTime = Date.now();

    const results = await searchProducts(query, {
      locale,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      category,
      materials: material ? (Array.isArray(material) ? material : [material]) : [],
      certifications: certification ? (Array.isArray(certification) ? certification : [certification]) : [],
      originCountry: origin,
      priceMin: priceMin ? parseFloat(priceMin) : null,
      priceMax: priceMax ? parseFloat(priceMax) : null,
      moqMax: moqMax ? parseInt(moqMax) : null,
      sortBy: sort,
      sortOrder: order,
    });

    // Log search query asynchronously
    logSearchQuery(query, locale, results.total, req).catch(() => {});

    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
}

async function autocomplete(req, res) {
  try {
    const { q: prefix, locale = 'en-gb', limit = 8 } = req.query;

    if (!prefix || prefix.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await getAutocompleteSuggestions(prefix, locale, parseInt(limit));
    res.json({ suggestions });
  } catch (err) {
    console.error('Autocomplete error:', err);
    res.json({ suggestions: [] });
  }
}

/**
 * Log search query for analytics
 */
async function logSearchQuery(query, locale, resultCount, req) {
  if (!query) return;
  try {
    await prisma.searchQueryLog.create({
      data: {
        query,
        locale,
        resultCount,
        userId: req.user?.id || null,
        sessionId: req.cookies?.sessionId || null,
        responseTimeMs: Date.now() - (req._startTime || Date.now()),
        facetsUsed: req.query.material || req.query.certification ? req.query : null,
      },
    });
  } catch (err) {
    console.error('Search log error:', err);
  }
}

module.exports = { search, autocomplete };
