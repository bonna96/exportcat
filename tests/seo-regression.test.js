/**
 * SEO Regression Test Suite
 * FR-7, FR-8, FR-9, FR-11: Canonical, Hreflang, Schema.org, Robots.txt, XML Sitemaps
 */

const {
  generateCanonicalUrl,
  generateHreflangTags,
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  generateOrganizationJsonLd,
  generateSeoMeta
} = require('../src/services/seoGenerator');

const {
  generateRobotsTxt,
  generateSitemapIndex,
  generateCategorySitemap
} = require('../src/services/sitemapService');

describe('SEO Regression Suite', () => {
  describe('Canonical URL Generator', () => {
    test('generates absolute canonical URL with lowercase locale and path', () => {
      const canonical = generateCanonicalUrl('EN-GB', '/Products/Jute-Bag/');
      expect(canonical).toBe('http://localhost:3000/en-gb/products/jute-bag');
    });

    test('strips query parameters from canonical URL', () => {
      const canonical = generateCanonicalUrl('en-gb', '/categories/textiles?sort=price&page=2');
      expect(canonical).toBe('http://localhost:3000/en-gb/categories/textiles');
    });
  });

  describe('Hreflang Tags Generator', () => {
    test('generates hreflang entries for all supported locales plus x-default', () => {
      const tags = generateHreflangTags('/products/hessian-cloth', 'en-gb');
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThanOrEqual(5);

      const xDefault = tags.find(t => t.hreflang === 'x-default');
      expect(xDefault).toBeDefined();
      expect(xDefault.href).toContain('http://localhost:3000/en-gb/products/hessian-cloth');

      const jaJp = tags.find(t => t.hreflang === 'ja-jp');
      expect(jaJp).toBeDefined();
      expect(jaJp.href).toContain('http://localhost:3000/ja-jp/products/hessian-cloth');
    });
  });

  describe('Schema.org Structured Data (JSON-LD)', () => {
    test('Product JSON-LD conforms to Schema.org/Product specification', () => {
      const sampleProduct = {
        name: 'Natural Jute Hessian Fabric',
        description: '100% natural biodegradable jute fiber woven cloth',
        slug: 'natural-jute-hessian-fabric',
        sku: 'JUTE-HESS-001',
        originCountry: 'Bangladesh',
        images: [{ url: 'uploads/jute.jpg' }],
        priceBrackets: [
          { minQty: 1000, unitPrice: 2.50 },
          { minQty: 5000, unitPrice: 2.10 }
        ],
        supplier: { name: 'Bengal Jute Mills Ltd.' }
      };

      const jsonLd = generateProductJsonLd(sampleProduct, 'en-gb');
      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('Product');
      expect(jsonLd.name).toBe(sampleProduct.name);
      expect(jsonLd.sku).toBe(sampleProduct.sku);
      expect(jsonLd.offers).toBeDefined();
      expect(jsonLd.offers['@type']).toBe('AggregateOffer');
      expect(jsonLd.offers.priceCurrency).toBe('USD');
      expect(jsonLd.offers.lowPrice).toBe(2.10);
      expect(jsonLd.offers.highPrice).toBe(2.50);
    });

    test('BreadcrumbList JSON-LD outputs correct ItemListElement hierarchy', () => {
      const crumbs = [
        { name: 'Home', url: '/en-gb' },
        { name: 'Jute & Natural Fibers', url: '/en-gb/categories/jute-natural-fibers' },
        { name: 'Natural Hessian Cloth', url: null }
      ];

      const jsonLd = generateBreadcrumbJsonLd(crumbs, 'en-gb');
      expect(jsonLd['@type']).toBe('BreadcrumbList');
      expect(jsonLd.itemListElement.length).toBe(3);
      expect(jsonLd.itemListElement[0].position).toBe(1);
      expect(jsonLd.itemListElement[0].name).toBe('Home');
      expect(jsonLd.itemListElement[2].position).toBe(3);
    });

    test('Organization JSON-LD outputs valid Organization schema', () => {
      const jsonLd = generateOrganizationJsonLd();
      expect(jsonLd['@type']).toBe('Organization');
      expect(jsonLd.name).toBe('ExportCat');
      expect(jsonLd.url).toBe('http://localhost:3000');
    });
  });

  describe('Robots.txt & XML Sitemaps', () => {
    test('dynamic robots.txt allows public pages, disallows admin/manager, includes sitemap link', () => {
      const robots = generateRobotsTxt();
      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Disallow: /admin/');
      expect(robots).toContain('Disallow: /manager/');
      expect(robots).toContain('Disallow: /api/');
      expect(robots).toContain('Sitemap: http://localhost:3000/sitemap-index.xml');
    });

    test('sitemap index contains valid XML envelope with sub-sitemaps', async () => {
      const xml = await generateSitemapIndex();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('pages.xml</loc>');
    });
  });

  afterAll(async () => {
    try {
      const prisma = require('../src/config/prisma');
      await prisma.$disconnect();
    } catch (_) {}
  });
});
