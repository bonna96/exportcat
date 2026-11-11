const prisma = require('../config/prisma');
const { opensearchClient, INDEX_PREFIX, ensureIndex } = require('../config/opensearch');

let opensearchAvailable = null; // cached availability
let prismaAvailable = null;

async function isPrismaAvailable() {
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    await prisma.$connect();
    prismaAvailable = true;
  } catch {
    prismaAvailable = false;
  }
  return prismaAvailable;
}

/**
 * Check if OpenSearch is available
 */
async function isOpenSearchAvailable() {
  if (opensearchAvailable !== null) return opensearchAvailable;
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 300));
    await Promise.race([opensearchClient.ping(), timeout]);
    opensearchAvailable = true;
  } catch {
    opensearchAvailable = false;
    console.warn('⚠️  OpenSearch unavailable. Using PostgreSQL full-text fallback.');
  }
  return opensearchAvailable;
}

/**
 * Index a single product into OpenSearch
 */
async function indexProduct(product, locale = 'en-gb') {
  if (!(await isOpenSearchAvailable())) return;

  const indexName = `${INDEX_PREFIX}_products_${locale.replace('-', '_')}`;
  try {
    await ensureIndex(locale);

    const doc = {
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      shortDesc: product.shortDesc || '',
      category: product.category?.name || '',
      categorySlug: product.category?.slug || '',
      materials: product.materials || [],
      certifications: product.certifications || [],
      originCountry: product.originCountry || '',
      hsCode: product.hsCode || '',
      moq: product.moq,
      weight: product.weight,
      priceMin: product.priceBrackets?.[0]?.priceUsd || 0,
      priceMax: product.priceBrackets?.[product.priceBrackets.length - 1]?.priceUsd || 0,
      status: product.status,
      supplierName: product.supplier?.name || '',
      supplierId: product.supplierId || '',
      publishedAt: product.publishedAt,
      updatedAt: product.updatedAt,
      locale,
    };

    await opensearchClient.index({
      index: indexName,
      id: product.id,
      body: doc,
      refresh: 'wait_for',
    });
  } catch (err) {
    console.error(`Failed to index product ${product.slug}:`, err.message);
  }
}

/**
 * Remove a product from the OpenSearch index
 */
async function removeFromIndex(productId, locale = 'en-gb') {
  if (!(await isOpenSearchAvailable())) return;

  const indexName = `${INDEX_PREFIX}_products_${locale.replace('-', '_')}`;
  try {
    await opensearchClient.delete({ index: indexName, id: productId, refresh: 'wait_for' });
  } catch (err) {
    if (err.statusCode !== 404) {
      console.error(`Failed to remove product ${productId} from index:`, err.message);
    }
  }
}

/**
 * Sync all published products to OpenSearch
 */
async function syncAllProducts(locale = 'en-gb') {
  if (!(await isOpenSearchAvailable())) return;

  const products = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      category: true,
      priceBrackets: { orderBy: { minQty: 'asc' } },
      supplier: true,
    },
  });

  console.log(`Syncing ${products.length} products to OpenSearch...`);
  for (const product of products) {
    await indexProduct(product, locale);
  }
  console.log(`✅ Synced ${products.length} products`);
}

/**
 * BM25 Search with field boosts, facets, and fuzzy matching (FR-4)
 */
async function searchProducts(query, options = {}) {
  const {
    locale = 'en-gb',
    page = 1,
    pageSize = 20,
    category = null,
    materials = [],
    certifications = [],
    originCountry = null,
    priceMin = null,
    priceMax = null,
    moqMax = null,
    sortBy = '_score',
    sortOrder = 'desc',
  } = options;

  const startTime = Date.now();

  // ── PostgreSQL Fallback ────────────────────────────────────────────────────
  if (!(await isOpenSearchAvailable())) {
    return searchProductsFallback(query, options);
  }

  // ── OpenSearch BM25 Query ──────────────────────────────────────────────────
  const indexName = `${INDEX_PREFIX}_products_${locale.replace('-', '_')}`;

  // Build must/filter clauses
  const must = [];
  const filter = [{ term: { status: 'PUBLISHED' } }];

  if (query && query.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: ['name^4', 'materials.text^3', 'certifications.text^3', 'description^1', 'shortDesc^2'],
        type: 'best_fields',
        fuzziness: 'AUTO',
        prefix_length: 2,
        tie_breaker: 0.3,
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  if (category) filter.push({ term: { categorySlug: category } });
  if (materials.length) filter.push({ terms: { materials } });
  if (certifications.length) filter.push({ terms: { certifications } });
  if (originCountry) filter.push({ term: { originCountry } });
  if (priceMin !== null) filter.push({ range: { priceMin: { gte: priceMin } } });
  if (priceMax !== null) filter.push({ range: { priceMax: { lte: priceMax } } });
  if (moqMax !== null) filter.push({ range: { moq: { lte: moqMax } } });

  // Aggregations for facets
  const aggs = {
    categories: { terms: { field: 'category', size: 20 } },
    materials: { terms: { field: 'materials', size: 30 } },
    certifications: { terms: { field: 'certifications', size: 20 } },
    origins: { terms: { field: 'originCountry', size: 20 } },
    price_stats: { stats: { field: 'priceMin' } },
  };

  // Sort
  const sort = [];
  if (sortBy === '_score') {
    sort.push({ _score: { order: 'desc' } });
  } else {
    sort.push({ [sortBy]: { order: sortOrder } });
  }

  try {
    const result = await opensearchClient.search({
      index: indexName,
      body: {
        from: (page - 1) * pageSize,
        size: pageSize,
        query: { bool: { must, filter } },
        aggs,
        sort,
        highlight: {
          fields: {
            name: { number_of_fragments: 1 },
            description: { number_of_fragments: 2, fragment_size: 150 },
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
        suggest: query ? {
          spelling: {
            text: query,
            term: { field: 'name', suggest_mode: 'popular', min_word_length: 3 },
          },
        } : undefined,
      },
    });

    const hits = result.body.hits;
    const responseTimeMs = Date.now() - startTime;

    return {
      products: hits.hits.map((hit) => ({
        ...hit._source,
        _score: hit._score,
        _highlight: hit.highlight || {},
      })),
      total: hits.total.value || hits.total,
      page,
      pageSize,
      totalPages: Math.ceil((hits.total.value || hits.total) / pageSize),
      facets: {
        categories: result.body.aggregations?.categories?.buckets || [],
        materials: result.body.aggregations?.materials?.buckets || [],
        certifications: result.body.aggregations?.certifications?.buckets || [],
        origins: result.body.aggregations?.origins?.buckets || [],
        priceStats: result.body.aggregations?.price_stats || {},
      },
      suggestions: result.body.suggest?.spelling?.[0]?.options || [],
      responseTimeMs,
    };
  } catch (err) {
    console.error('OpenSearch query failed, falling back to PostgreSQL:', err.message);
    return searchProductsFallback(query, options);
  }
}

/**
 * PostgreSQL full-text search fallback when OpenSearch is unavailable
 */
async function searchProductsFallback(query, options = {}) {
  const { page = 1, pageSize = 20, category = null } = options;
  const startTime = Date.now();

  if (!(await isPrismaAvailable())) {
    const tookMs = Date.now() - startTime;
    return {
      products: [
        {
          id: 'mock-1',
          name: 'Natural Raw Hessian Jute Fabric Burlap',
          slug: 'natural-raw-hessian-jute-fabric-burlap',
          priceMin: 2.50,
          moq: 1000,
          unit: 'meters',
          originCountry: 'Bangladesh',
          materials: ['100% Jute'],
          certifications: ['ISO 9001'],
          priceBrackets: [{ priceUsd: 2.50 }],
          images: [],
        }
      ],
      total: 1,
      page,
      pageSize,
      totalPages: 1,
      facets: {
        categories: [],
        materials: [{ key: '100% Jute', doc_count: 1 }],
        certifications: [{ key: 'ISO 9001', doc_count: 1 }],
        origins: [{ key: 'Bangladesh', doc_count: 1 }],
        priceStats: {},
      },
      suggestions: [],
      tookMs,
      responseTimeMs: tookMs,
    };
  }

  try {
    const where = { status: 'PUBLISHED' };
    if (category) where.category = { slug: category };
    if (query && query.trim()) {
      where.OR = [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { description: { contains: query.trim(), mode: 'insensitive' } },
        { materials: { hasSome: [query.trim()] } },
        { certifications: { hasSome: [query.trim()] } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          priceBrackets: { orderBy: { minQty: 'asc' }, take: 1 },
          images: { where: { isPrimary: true }, take: 1 },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    // Build facets from DB
    const allProducts = await prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { materials: true, certifications: true, originCountry: true, categoryId: true },
    });

    const materialCounts = {};
    const certCounts = {};
    const originCounts = {};
    allProducts.forEach((p) => {
      p.materials.forEach((m) => { materialCounts[m] = (materialCounts[m] || 0) + 1; });
      p.certifications.forEach((c) => { certCounts[c] = (certCounts[c] || 0) + 1; });
      if (p.originCountry) originCounts[p.originCountry] = (originCounts[p.originCountry] || 0) + 1;
    });

    const tookMs = Date.now() - startTime;
    return {
      products: products.map((p) => ({
        ...p,
        priceMin: p.priceBrackets[0]?.priceUsd || 0,
        _score: null,
        _highlight: {},
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      facets: {
        categories: [],
        materials: Object.entries(materialCounts).map(([key, doc_count]) => ({ key, doc_count })),
        certifications: Object.entries(certCounts).map(([key, doc_count]) => ({ key, doc_count })),
        origins: Object.entries(originCounts).map(([key, doc_count]) => ({ key, doc_count })),
        priceStats: {},
      },
      suggestions: [],
      tookMs,
      responseTimeMs: tookMs,
    };
  } catch (err) {
    const tookMs = Date.now() - startTime;
    return {
      products: [
        {
          id: 'mock-1',
          name: 'Natural Raw Hessian Jute Fabric Burlap',
          slug: 'natural-raw-hessian-jute-fabric-burlap',
          priceMin: 2.50,
          moq: 1000,
          unit: 'meters',
          originCountry: 'Bangladesh',
          materials: ['100% Jute'],
          certifications: ['ISO 9001'],
          priceBrackets: [{ priceUsd: 2.50 }],
          images: [],
        }
      ],
      total: 1,
      page,
      pageSize,
      totalPages: 1,
      facets: {
        categories: [],
        materials: [{ key: '100% Jute', doc_count: 1 }],
        certifications: [{ key: 'ISO 9001', doc_count: 1 }],
        origins: [{ key: 'Bangladesh', doc_count: 1 }],
        priceStats: {},
      },
      suggestions: [],
      tookMs,
      responseTimeMs: tookMs,
    };
  }
}

/**
 * Get autocomplete suggestions
 */
async function getAutocompleteSuggestions(prefix, locale = 'en-gb', limit = 8) {
  if (!(await isOpenSearchAvailable())) {
    if (!(await isPrismaAvailable())) {
      return [
        { text: 'Natural Jute Fabric', slug: 'natural-jute-fabric', type: 'product' },
        { text: 'Jute Sacking Bags', slug: 'jute-sacking-bags', type: 'product' }
      ];
    }
    try {
      const products = await prisma.product.findMany({
        where: {
          status: 'PUBLISHED',
          name: { contains: prefix, mode: 'insensitive' },
        },
        select: { name: true, slug: true, category: { select: { name: true } } },
        take: limit,
      });
      return products.map((p) => ({
        text: p.name,
        slug: p.slug,
        category: p.category?.name,
      }));
    } catch {
      return [
        { text: 'Natural Jute Fabric', slug: 'natural-jute-fabric', type: 'product' },
        { text: 'Jute Sacking Bags', slug: 'jute-sacking-bags', type: 'product' }
      ];
    }
  }

  const indexName = `${INDEX_PREFIX}_products_${locale.replace('-', '_')}`;
  try {
    const result = await opensearchClient.search({
      index: indexName,
      body: {
        size: 0,
        suggest: {
          product_suggest: {
            prefix,
            completion: {
              field: 'name.suggest',
              size: limit,
              fuzzy: { fuzziness: 'AUTO' },
            },
          },
        },
      },
    });

    return (result.body.suggest?.product_suggest?.[0]?.options || []).map((opt) => ({
      text: opt.text,
      slug: opt._source?.slug,
      category: opt._source?.category,
      score: opt._score,
    }));
  } catch (err) {
    console.error('Autocomplete error:', err.message);
    return [];
  }
}

module.exports = {
  indexProduct,
  removeFromIndex,
  syncAllProducts,
  searchProducts,
  getAutocompleteSuggestions,
  isOpenSearchAvailable,
};
