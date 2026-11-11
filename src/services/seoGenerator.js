const prisma = require('../config/prisma');

const SUPPORTED_LOCALES = (process.env.SUPPORTED_LOCALES || 'en-gb').split(',');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Generate JSON-LD structured data for a Product page (FR-8)
 */
function generateProductJsonLd(product, locale = 'en-gb') {
  const url = `${BASE_URL}/${locale}/products/${product.slug}`;
  const priceBrackets = product.priceBrackets || [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.shortDesc || '',
    sku: product.sku,
    url,
    image: product.images?.filter((i) => i.isPrimary).map((i) => `${BASE_URL}${i.webpUrl || i.originalUrl}`) || [],
    brand: {
      '@type': 'Organization',
      name: product.supplier?.name || 'ExportCat',
    },
    manufacturer: {
      '@type': 'Organization',
      name: product.supplier?.name || '',
    },
    category: product.category?.name || '',
    material: product.materials?.join(', ') || '',
    countryOfOrigin: {
      '@type': 'Country',
      name: product.originCountry || 'Bangladesh',
    },
    weight: product.weight ? {
      '@type': 'QuantitativeValue',
      value: product.weight,
      unitCode: product.weightUnit || 'KGM',
    } : undefined,
  };

  // Add AggregateOffer with price brackets
  if (priceBrackets.length > 0) {
    const prices = priceBrackets.map((pb) => (pb.priceUsd !== undefined ? pb.priceUsd : (pb.unitPrice !== undefined ? pb.unitPrice : 0)));
    jsonLd.offers = {
      '@type': 'AggregateOffer',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      priceCurrency: priceBrackets[0].currency || 'USD',
      offerCount: priceBrackets.length,
      availability: 'https://schema.org/InStock',
      url,
      eligibleQuantity: {
        '@type': 'QuantitativeValue',
        minValue: product.moq,
        unitText: 'units',
      },
    };
  }

  return jsonLd;
}

/**
 * Generate BreadcrumbList JSON-LD
 */
function generateBreadcrumbJsonLd(breadcrumbs, locale = 'en-gb') {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.name,
      item: crumb.url ? `${BASE_URL}${crumb.url}` : undefined,
    })),
  };
}

/**
 * Generate Organization JSON-LD for the home page
 */
function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ExportCat',
    url: BASE_URL,
    logo: `${BASE_URL}/images/logo.png`,
    description: 'B2B Export Product Catalogue — Searchable wholesale catalogue for Bangladeshi export products.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales',
      email: 'info@exportcat.com',
    },
  };
}

/**
 * Generate hreflang link tags for a given path
 */
function generateHreflangTags(path, currentLocale) {
  const tags = SUPPORTED_LOCALES.map((locale) => ({
    rel: 'alternate',
    hreflang: locale,
    href: `${BASE_URL}/${locale}${path}`,
  }));

  // x-default points to default locale
  tags.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: `${BASE_URL}/${process.env.DEFAULT_LOCALE || 'en-gb'}${path}`,
  });

  return tags;
}

function generateCanonicalUrl(locale, path = '') {
  const cleanPath = (path.split('?')[0] || '').toLowerCase().replace(/\/+$/, '');
  const cleanLocale = (locale || 'en-gb').toLowerCase();
  return `${BASE_URL}/${cleanLocale}${cleanPath}`;
}

/**
 * Generate SEO meta data for a page
 */
function generateSeoMeta({ title, description, canonical, hreflangTags, jsonLd, robots }) {
  return {
    title: title || 'ExportCat — B2B Export Catalogue',
    metaDescription: description || 'Browse wholesale export products from verified Bangladeshi suppliers.',
    canonical: canonical || BASE_URL,
    hreflangTags: hreflangTags || [],
    jsonLd: jsonLd || null,
    robots: robots || 'index, follow',
  };
}

module.exports = {
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  generateOrganizationJsonLd,
  generateHreflangTags,
  generateCanonicalUrl,
  generateSeoMeta,
  SUPPORTED_LOCALES,
  BASE_URL,
};
