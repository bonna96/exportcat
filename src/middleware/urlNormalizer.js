/**
 * URL Normaliser Middleware
 *
 * Enforces consistent URL format:
 * - Lowercase paths
 * - No trailing slashes (except root)
 * - Redirect non-canonical URLs with 301
 */
function urlNormalizer(req, res, next) {
  // Skip API routes, static files, and POST requests
  if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/public/')) {
    return next();
  }

  let canonical = req.path;
  let needsRedirect = false;

  // 1. Enforce lowercase
  const lowered = canonical.toLowerCase();
  if (canonical !== lowered) {
    canonical = lowered;
    needsRedirect = true;
  }

  // 2. Remove trailing slash (except root)
  if (canonical.length > 1 && canonical.endsWith('/')) {
    canonical = canonical.slice(0, -1);
    needsRedirect = true;
  }

  if (needsRedirect) {
    const qs = Object.keys(req.query).length > 0
      ? '?' + new URLSearchParams(req.query).toString()
      : '';
    return res.redirect(301, canonical + qs);
  }

  next();
}

module.exports = { urlNormalizer };
