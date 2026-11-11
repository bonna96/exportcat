const prisma = require('../config/prisma');
const { generateDemoToken } = require('../middleware/authGuard');

/**
 * ── Admin Controller ──
 * User management, facet rules, audit logs, system settings (FR-15)
 */

async function listUsers(req, res) {
  try {
    const { role, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { managedProducts: true, enquiries: true } },
        },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(pageSize)) });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { role, isActive },
    });

    res.json({ user });
  } catch (err) {
    console.error('updateUserRole error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

async function getFacetRules(req, res) {
  try {
    const rules = await prisma.facetRule.findMany({
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ rules });
  } catch (err) {
    console.error('getFacetRules error:', err);
    res.status(500).json({ error: 'Failed to fetch facet rules' });
  }
}

async function updateFacetRule(req, res) {
  try {
    const { id } = req.params;
    const { action, maxCombinations, isActive } = req.body;

    const rule = await prisma.facetRule.update({
      where: { id },
      data: { action, maxCombinations, isActive },
    });

    res.json({ rule });
  } catch (err) {
    console.error('updateFacetRule error:', err);
    res.status(500).json({ error: 'Failed to update facet rule' });
  }
}

async function getAuditLogs(req, res) {
  try {
    const { page = 1, pageSize = 50, action, entityType } = req.query;
    const where = {};
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true, role: true } } },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(pageSize)) });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

/**
 * Demo login — generates JWT for testing without Supabase
 */
async function demoLogin(req, res) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'Demo user not found. Run: npm run db:seed' });
    }

    const token = generateDemoToken(user);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    if (req.path.startsWith('/api/')) {
      return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    }

    // Redirect based on role
    const redirectMap = {
      ADMIN: '/admin/dashboard',
      MANAGER: '/manager/dashboard',
      ANALYST: '/analyst/dashboard',
      BUYER: '/en-gb',
    };

    res.redirect(redirectMap[user.role] || '/en-gb');
  } catch (err) {
    console.error('demoLogin error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function logout(req, res) {
  res.clearCookie('access_token');
  res.redirect('/login');
}

module.exports = {
  listUsers,
  updateUserRole,
  getFacetRules,
  updateFacetRule,
  getAuditLogs,
  demoLogin,
  logout,
};
