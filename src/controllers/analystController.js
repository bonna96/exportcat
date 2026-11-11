const prisma = require('../config/prisma');
const { runIrEvaluation, runPageRankCrawler } = require('../services/pythonBridge');

/**
 * ── Analyst Controller ──
 * Search & SEO analysis, IR evaluation, PageRank, query logs (FR-14)
 */

async function getSearchAnalytics(req, res) {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Top queries
    const topQueries = await prisma.$queryRaw`
      SELECT query, COUNT(*) as count, AVG(result_count) as avg_results, AVG(response_time_ms) as avg_response_ms
      FROM search_query_logs
      WHERE created_at >= ${since}
      GROUP BY query
      ORDER BY count DESC
      LIMIT 50
    `;

    // Zero-result queries
    const zeroResultQueries = await prisma.searchQueryLog.findMany({
      where: { createdAt: { gte: since }, resultCount: 0 },
      select: { query: true, createdAt: true, locale: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Search volume over time
    const dailyVolume = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as searches
      FROM search_query_logs
      WHERE created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Response time percentiles
    const responseTimes = await prisma.searchQueryLog.findMany({
      where: { createdAt: { gte: since }, responseTimeMs: { not: null } },
      select: { responseTimeMs: true },
      orderBy: { responseTimeMs: 'asc' },
    });

    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]?.responseTimeMs || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]?.responseTimeMs || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]?.responseTimeMs || 0;

    res.json({
      topQueries,
      zeroResultQueries,
      dailyVolume,
      responseTimePercentiles: { p50, p95, p99 },
      totalSearches: responseTimes.length,
    });
  } catch (err) {
    console.error('getSearchAnalytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

async function runIrEval(req, res) {
  try {
    const results = await runIrEvaluation();
    res.json(results);
  } catch (err) {
    console.error('IR Evaluation error:', err);
    res.status(500).json({ error: 'IR evaluation failed', details: err.message });
  }
}

async function runCrawlAudit(req, res) {
  try {
    const baseUrl = req.query.baseUrl || process.env.BASE_URL || 'http://localhost:3000';
    const results = await runPageRankCrawler(baseUrl);
    res.json(results);
  } catch (err) {
    console.error('Crawl audit error:', err);
    res.status(500).json({ error: 'Crawl audit failed', details: err.message });
  }
}

async function getSynonymRules(req, res) {
  try {
    const synonyms = await prisma.synonymRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ synonyms });
  } catch (err) {
    console.error('getSynonymRules error:', err);
    res.status(500).json({ error: 'Failed to fetch synonyms' });
  }
}

async function createSynonymRule(req, res) {
  try {
    const { synonyms, locale = 'en-gb' } = req.body;
    const rule = await prisma.synonymRule.create({
      data: { synonyms, locale },
    });
    res.status(201).json({ rule });
  } catch (err) {
    console.error('createSynonymRule error:', err);
    res.status(500).json({ error: 'Failed to create synonym rule' });
  }
}

async function updateSynonymRule(req, res) {
  try {
    const { id } = req.params;
    const { synonyms, isActive } = req.body;
    const rule = await prisma.synonymRule.update({
      where: { id },
      data: { synonyms, isActive },
    });
    res.json({ rule });
  } catch (err) {
    console.error('updateSynonymRule error:', err);
    res.status(500).json({ error: 'Failed to update synonym rule' });
  }
}

async function deleteSynonymRule(req, res) {
  try {
    const { id } = req.params;
    await prisma.synonymRule.delete({ where: { id } });
    res.json({ message: 'Synonym rule deleted' });
  } catch (err) {
    console.error('deleteSynonymRule error:', err);
    res.status(500).json({ error: 'Failed to delete synonym rule' });
  }
}

module.exports = {
  getSearchAnalytics,
  runIrEval,
  runCrawlAudit,
  getSynonymRules,
  createSynonymRule,
  updateSynonymRule,
  deleteSynonymRule,
};
