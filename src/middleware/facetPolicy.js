const prisma = require('../config/prisma');

/**
 * Facet Policy Middleware (FR-6)
 *
 * 1. Sort query parameters alphabetically to produce canonical URLs
 * 2. Look up FacetRule from DB to determine indexation action
 * 3. Set appropriate headers: canonical, X-Robots-Tag, redirects
 */
async function facetPolicyMiddleware(req, res, next) {
  try {
    const queryKeys = Object.keys(req.query);
    if (queryKeys.length === 0) {
      return next();
    }

    // 1. Sort query params alphabetically for canonical consistency
    const sortedParams = {};
    queryKeys.sort().forEach((key) => {
      const value = req.query[key];
      // Normalise array values
      if (Array.isArray(value)) {
        sortedParams[key] = value.sort();
      } else {
        sortedParams[key] = value;
      }
    });

    // Check if params were reordered → 301 to canonical order
    const originalQs = new URLSearchParams(req.query).toString();
    const sortedQs = new URLSearchParams(sortedParams).toString();

    if (originalQs !== sortedQs) {
      const canonicalUrl = `${req.path}?${sortedQs}`;
      return res.redirect(301, canonicalUrl);
    }

    // 2. Determine facet keys from query params
    const facetKeys = queryKeys.filter((k) =>
      ['material', 'certification', 'origin_country', 'price_range', 'moq_range'].includes(k)
    );

    if (facetKeys.length === 0) {
      return next();
    }

    // 3. Look up facet rules for the current category
    const categorySlug = req.params.categorySlug || req.params.slug;
    let rules = [];

    if (categorySlug) {
      rules = await prisma.facetRule.findMany({
        where: {
          category: { slug: categorySlug },
          facetKey: { in: facetKeys },
          isActive: true,
        },
      });
    }

    // Default to CANONICAL_TO_PARENT if no specific rule
    if (rules.length === 0) {
      rules = [{ action: 'CANONICAL_TO_PARENT', maxCombinations: 2 }];
    }

    // 4. Count combinations and apply policy
    const totalCombinations = facetKeys.reduce((count, key) => {
      const val = sortedParams[key];
      return count + (Array.isArray(val) ? val.length : 1);
    }, 0);

    // Determine the most restrictive action
    let action = 'INDEX';
    for (const rule of rules) {
      if (totalCombinations > rule.maxCombinations) {
        // Escalate: INDEX < CANONICAL_TO_PARENT < NOINDEX < BLOCKED
        const hierarchy = { INDEX: 0, CANONICAL_TO_PARENT: 1, NOINDEX: 2, BLOCKED: 3 };
        if ((hierarchy[rule.action] || 0) > (hierarchy[action] || 0)) {
          action = rule.action;
        }
      }
    }

    // 5. Apply the determined action
    switch (action) {
      case 'BLOCKED':
        res.set('X-Robots-Tag', 'noindex, nofollow');
        break;

      case 'NOINDEX':
        res.set('X-Robots-Tag', 'noindex, follow');
        break;

      case 'CANONICAL_TO_PARENT':
        // Set canonical to the unfaceted parent URL
        res.locals.canonicalUrl = `${req.protocol}://${req.get('host')}${req.path}`;
        break;

      case 'INDEX':
      default:
        // Allow indexing; canonical is self-referencing
        res.locals.canonicalUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        break;
    }

    req.facetParams = sortedParams;
    req.facetAction = action;

    next();
  } catch (err) {
    console.error('FacetPolicy middleware error:', err);
    next();
  }
}

module.exports = { facetPolicyMiddleware };
