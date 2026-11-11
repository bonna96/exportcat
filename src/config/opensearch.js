const { Client } = require('@opensearch-project/opensearch');

const opensearchClient = new Client({
  node: process.env.OPENSEARCH_NODE || 'https://localhost:9200',
  auth: {
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin',
  },
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certs in development
  },
});

const INDEX_PREFIX = process.env.OPENSEARCH_INDEX_PREFIX || 'exportcat';

/**
 * Custom analyser settings preserving B2B tokens like "350 GSM", "ISO 9001"
 */
const PRODUCT_INDEX_SETTINGS = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      char_filter: {
        // Preserve numeric-unit patterns like "350 GSM", "500 GSM"
        unit_preserver: {
          type: 'pattern_replace',
          pattern: '(\\d+)\\s+(GSM|mm|cm|kg|oz|lb|micron)',
          replacement: '$1_$2',
        },
      },
      tokenizer: {
        standard_tokenizer: {
          type: 'standard',
        },
      },
      filter: {
        english_stemmer: {
          type: 'stemmer',
          language: 'english',
        },
        english_stop: {
          type: 'stop',
          stopwords: '_english_',
        },
        // Synonym filter loaded from DB
        b2b_synonyms: {
          type: 'synonym',
          synonyms: [
            'jute, hessian, burlap',
            'fabric, cloth, textile',
            'bag, sack, pouch',
            'organic, natural, eco-friendly',
            'leather, hide, skin',
            'frozen, iqf, blast-frozen',
            'ceramic, pottery, stoneware',
            'dye, colorant, pigment',
            'garment, apparel, clothing',
            'rope, twine, cord',
          ],
        },
      },
      analyzer: {
        b2b_analyzer: {
          type: 'custom',
          char_filter: ['unit_preserver'],
          tokenizer: 'standard_tokenizer',
          filter: ['lowercase', 'english_stop', 'b2b_synonyms', 'english_stemmer'],
        },
        b2b_search_analyzer: {
          type: 'custom',
          char_filter: ['unit_preserver'],
          tokenizer: 'standard_tokenizer',
          filter: ['lowercase', 'english_stop', 'b2b_synonyms'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      slug: { type: 'keyword' },
      sku: { type: 'keyword' },
      name: {
        type: 'text',
        analyzer: 'b2b_analyzer',
        search_analyzer: 'b2b_search_analyzer',
        fields: {
          keyword: { type: 'keyword' },
          suggest: { type: 'completion' },
        },
      },
      description: {
        type: 'text',
        analyzer: 'b2b_analyzer',
        search_analyzer: 'b2b_search_analyzer',
      },
      shortDesc: { type: 'text', analyzer: 'b2b_analyzer' },
      category: {
        type: 'keyword',
        fields: { text: { type: 'text' } },
      },
      categorySlug: { type: 'keyword' },
      materials: {
        type: 'keyword',
        fields: { text: { type: 'text', analyzer: 'b2b_analyzer' } },
      },
      certifications: {
        type: 'keyword',
        fields: { text: { type: 'text', analyzer: 'b2b_analyzer' } },
      },
      originCountry: { type: 'keyword' },
      hsCode: { type: 'keyword' },
      moq: { type: 'integer' },
      weight: { type: 'float' },
      priceMin: { type: 'float' },
      priceMax: { type: 'float' },
      status: { type: 'keyword' },
      supplierName: { type: 'text' },
      supplierId: { type: 'keyword' },
      publishedAt: { type: 'date' },
      updatedAt: { type: 'date' },
      locale: { type: 'keyword' },
    },
  },
};

/**
 * Ensure the product index exists with correct mappings
 */
async function ensureIndex(locale = 'en-gb') {
  const indexName = `${INDEX_PREFIX}_products_${locale.replace('-', '_')}`;
  try {
    const exists = await opensearchClient.indices.exists({ index: indexName });
    if (!exists.body) {
      await opensearchClient.indices.create({
        index: indexName,
        body: PRODUCT_INDEX_SETTINGS,
      });
      console.log(`✅ Created OpenSearch index: ${indexName}`);
    }
  } catch (err) {
    // OpenSearch may not be running; log and continue
    console.warn(`⚠️  OpenSearch index setup skipped (${err.message}). Search features disabled.`);
  }
  return indexName;
}

module.exports = {
  opensearchClient,
  INDEX_PREFIX,
  PRODUCT_INDEX_SETTINGS,
  ensureIndex,
};
