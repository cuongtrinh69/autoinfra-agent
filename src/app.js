/**
 * Express Application Setup
 * ====================================================================
 * Configures middleware, routes, error handling for the AutoInfra Agent.
 * ====================================================================
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

const app = express();

// ------------------------------------------------------------------
// 1. Security & parsing middleware
// ------------------------------------------------------------------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ------------------------------------------------------------------
// 2. Rate limiting
// ------------------------------------------------------------------
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ------------------------------------------------------------------
// 3. Request logging
// ------------------------------------------------------------------
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan('short', { stream: morganStream }));

// ------------------------------------------------------------------
// 4. Static files (dashboard)
// ------------------------------------------------------------------
app.use('/dashboard', express.static(path.join(__dirname, '..', 'public')));
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// ------------------------------------------------------------------
// 5. API Routes
// ------------------------------------------------------------------
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Health check (top-level)
app.get('/health', (req, res) => {
  const metrics = app.get('metrics');
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    metrics: metrics ? metrics.getSnapshot() : {},
  });
});

// Root redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// ------------------------------------------------------------------
// 6. Error handling
// ------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;