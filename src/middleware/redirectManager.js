const prisma = require('../config/prisma');

/**
 * Redirect Manager Middleware
 *
 * Handles 301 redirects for products that have been redirected (status: REDIRECTED)
 * and 410 Gone for unpublished products
 */
async function redirectManager(req, res, next) {
  try {
    // Only check product routes
    const slugMatch = req.path.match(/\/products\/([a-z0-9-]+)/);
    if (!slugMatch) return next();

    const slug = slugMatch[1];
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { status: true, redirectSlug: true },
    });

    if (!product) return next();

    // Handle redirected products (301)
    if (product.status === 'REDIRECTED' && product.redirectSlug) {
      const locale = req.params.locale || 'en-gb';
      return res.redirect(301, `/${locale}/products/${product.redirectSlug}`);
    }

    // Handle unpublished products (410 Gone)
    if (product.status === 'UNPUBLISHED') {
      return res.status(410).render('pages/error', {
        title: 'Product No Longer Available',
        statusCode: 410,
        message: 'This product has been removed from our catalogue.',
        layout: 'layouts/main',
      });
    }

    next();
  } catch (err) {
    console.error('RedirectManager error:', err);
    next();
  }
}

module.exports = { redirectManager };
