const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { supabase } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Verify JWT token from Authorization header or cookie
 */
async function verifyToken(req, res, next) {
  try {
    let token = null;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to cookie
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    // Try Supabase verification first
    if (supabase) {
      try {
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
        if (supabaseUser && !error) {
          const dbUser = await prisma.user.findUnique({
            where: { supabaseUid: supabaseUser.id },
          });
          if (dbUser && dbUser.isActive) {
            req.user = dbUser;
            return next();
          }
        }
      } catch (_) {
        // Fall through to JWT verification
      }
    }

    // Fallback JWT verification (demo mode)
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.sub },
    });

    if (dbUser && dbUser.isActive) {
      req.user = dbUser;
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

/**
 * Require authentication — 401 if not authenticated
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login');
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) middleware factory
 * @param {...string} roles - Allowed roles (ADMIN, MANAGER, ANALYST, BUYER)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect('/login');
    }

    if (!roles.includes(req.user.role)) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(403).render('pages/error', {
        title: 'Access Denied',
        statusCode: 403,
        message: 'You do not have permission to access this resource.',
        layout: 'layouts/main',
      });
    }

    next();
  };
}

/**
 * Generate a demo JWT for development/testing
 */
function generateDemoToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  verifyToken,
  requireAuth,
  requireRole,
  generateDemoToken,
};
