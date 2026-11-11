const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   🐱  ExportCat — B2B Export Catalogue                   ║
  ║                                                          ║
  ║   Server running on http://localhost:${PORT}                ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(39)}║
  ║                                                          ║
  ║   Demo Accounts:                                         ║
  ║   • admin@exportcat.com     (Site Administrator)         ║
  ║   • manager@exportcat.com   (Catalogue Manager)          ║
  ║   • analyst@exportcat.com   (Search & SEO Analyst)       ║
  ║   • buyer@exportcat.com     (Buyer)                      ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
});
