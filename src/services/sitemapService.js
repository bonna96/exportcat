const prisma = require('../config/prisma');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPPORTED_LOCALES = (process.env.SUPPORTED_LOCALES || 'en-gb').split(',');

/**
 * Generate robots.txt content dynamically (FR-7)
 */
function generateRobotsTxt() {
  let content = `# ExportCat robots.txt
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${BASE_URL}/sitemap-index.xml

# Block admin and API endpoints
Disallow: /admin/
Disallow: /api/
Disallow: /manager/
Disallow: /analyst/
Disallow: /login
Disallow: /register

# Block facet URL combinations that are BLOCKED
Disallow: /*?*material=*certification=*origin_country=*

# Allow search engines to discover all locale versions
Allow: /en-gb/
Allow: /de-de/
Allow: /fr-fr/
Allow: /es-es/
Allow: /ja-jp/
`;
  return content;
}

/**
 * Generate sitemap index XML
 */
async function generateSitemapIndex() {
  let categories = [];
  try {
    categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
  } catch (err) {
    categories = [
      { slug: 'jute-natural-fibers' },
      { slug: 'textiles-fabrics' },
      { slug: 'leather-goods' }
    ];
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const locale of SUPPORTED_LOCALES) {
    // Main pages sitemap
    xml += `  <sitemap>\n`;
    xml += `    <loc>${BASE_URL}/sitemaps/${locale}/pages.xml</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += `  </sitemap>\n`;

    // Per-category product sitemaps
    for (const cat of categories) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${BASE_URL}/sitemaps/${locale}/${cat.slug}.xml</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += `  </sitemap>\n`;
    }
  }

  xml += '</sitemapindex>';
  return xml;
}

/**
 * Generate per-locale, per-category product sitemap (FR-7)
 */
async function generateCategorySitemap(locale, categorySlug) {
  const products = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      category: { slug: categorySlug },
    },
    select: {
      slug: true,
      updatedAt: true,
      images: { where: { isPrimary: true }, take: 1, select: { webpUrl: true, originalUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  for (const product of products) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/${locale}/products/${product.slug}</loc>\n`;
    xml += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;

    // Hreflang alternates
    for (const alt of SUPPORTED_LOCALES) {
      xml += `    <xhtml:link rel="alternate" hreflang="${alt}" href="${BASE_URL}/${alt}/products/${product.slug}" />\n`;
    }
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en-gb/products/${product.slug}" />\n`;

    // Image
    if (product.images[0]) {
      const imgUrl = product.images[0].webpUrl || product.images[0].originalUrl;
      xml += '    <image:image>\n';
      xml += `      <image:loc>${BASE_URL}${imgUrl}</image:loc>\n`;
      xml += '    </image:image>\n';
    }

    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Generate pages sitemap (home, category pages)
 */
async function generatePagesSitemap(locale) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Home page
  xml += '  <url>\n';
  xml += `    <loc>${BASE_URL}/${locale}</loc>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  for (const alt of SUPPORTED_LOCALES) {
    xml += `    <xhtml:link rel="alternate" hreflang="${alt}" href="${BASE_URL}/${alt}" />\n`;
  }
  xml += '  </url>\n';

  // Category pages
  for (const cat of categories) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/${locale}/categories/${cat.slug}</loc>\n`;
    xml += `    <lastmod>${cat.updatedAt.toISOString()}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    for (const alt of SUPPORTED_LOCALES) {
      xml += `    <xhtml:link rel="alternate" hreflang="${alt}" href="${BASE_URL}/${alt}/categories/${cat.slug}" />\n`;
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

module.exports = {
  generateRobotsTxt,
  generateSitemapIndex,
  generateCategorySitemap,
  generatePagesSitemap,
};
