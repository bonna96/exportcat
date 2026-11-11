const express = require('express');
const router = express.Router();
const { generateRobotsTxt, generateSitemapIndex, generateCategorySitemap, generatePagesSitemap } = require('../services/sitemapService');

// Dynamic robots.txt (FR-7)
router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(generateRobotsTxt());
});

// Sitemap index
router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const xml = await generateSitemapIndex();
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap index error:', err);
    res.status(500).send('Error generating sitemap index');
  }
});

// Per-locale, per-category sitemaps
router.get('/sitemaps/:locale/pages.xml', async (req, res) => {
  try {
    const xml = await generatePagesSitemap(req.params.locale);
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Pages sitemap error:', err);
    res.status(500).send('Error generating pages sitemap');
  }
});

router.get('/sitemaps/:locale/:categorySlug.xml', async (req, res) => {
  try {
    const xml = await generateCategorySitemap(req.params.locale, req.params.categorySlug);
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Category sitemap error:', err);
    res.status(500).send('Error generating category sitemap');
  }
});

module.exports = router;
