require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');

const { verifyToken } = require('./middleware/authGuard');
const { urlNormalizer } = require('./middleware/urlNormalizer');
const apiRoutes = require('./routes/apiRoutes');
const seoRoutes = require('./routes/seoRoutes');
const ssrRoutes = require('./routes/ssrRoutes');

const app = express();

// ─── Security & Compression ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors());
app.use(compression());

// ─── Body Parsing & Cookies ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Static Assets ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
}));

// ─── View Engine (EJS) ────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ─── URL Normaliser ────────────────────────────────────────────────────────
app.use(urlNormalizer);

// ─── Auth Middleware (populates req.user) ──────────────────────────────────
app.use(verifyToken);

// ─── Request Timing ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req._startTime = Date.now();
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);
app.use(seoRoutes);
app.use(ssrRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.status(404).render('pages/error', {
    title: 'Page Not Found — ExportCat',
    statusCode: 404,
    message: 'The page you are looking for does not exist.',
    layout: 'layouts/main',
    user: req.user,
  });
});

// ─── Error Handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).render('pages/error', {
    title: 'Server Error — ExportCat',
    statusCode: 500,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
    layout: 'layouts/main',
    user: req.user,
  });
});

module.exports = app;
