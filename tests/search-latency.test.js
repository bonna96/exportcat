/**
 * Search Latency & Performance Test Suite
 * FR-3, FR-4: Sub-200ms Search & Autocomplete SLA
 */

const { getAutocompleteSuggestions, searchProducts } = require('../src/services/searchService');

describe('Search Latency & Performance Suite', () => {
  beforeAll(async () => {
    // Warm up service and connection caches
    await getAutocompleteSuggestions('warmup', 'en-gb');
  });

  test('Autocomplete suggestions execute under 200ms SLA', async () => {
    const start = Date.now();
    const suggestions = await getAutocompleteSuggestions('jute', 'en-gb');
    const elapsed = Date.now() - start;

    expect(Array.isArray(suggestions)).toBe(true);
    expect(elapsed).toBeLessThan(200);
  });

  test('Search products returns structured results with total, facets, and pagination', async () => {
    const start = Date.now();
    const results = await searchProducts('cotton', {
      locale: 'en-gb',
      page: 1,
      pageSize: 10
    });
    const elapsed = Date.now() - start;

    expect(results).toHaveProperty('products');
    expect(results).toHaveProperty('total');
    expect(results).toHaveProperty('facets');
    expect(results).toHaveProperty('page', 1);
    expect(results.tookMs).toBeDefined();
    expect(elapsed).toBeLessThan(500);
  });

  afterAll(async () => {
    try {
      const prisma = require('../src/config/prisma');
      await prisma.$disconnect();
    } catch (_) {}
  });
});
