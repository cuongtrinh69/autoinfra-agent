/**
 * Error Handling Middleware
 * ====================================================================
 * Global error handler and 404 handler for the Express application.
 * ====================================================================
 */

'use strict';

const logger = require('../utils/logger');

// ------------------------------------------------------------------
// 404 Not Found
// ------------------------------------------------------------------
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
}

// ------------------------------------------------------------------
// Global Error Handler
// ------------------------------------------------------------------
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    logger.error(`[${req.method} ${req.originalUrl}] ${err.message}`, {
      stack: err.stack,
      body: req.body,
      query: req.query,
    });
  } else {
    logger.warn(`[${req.method} ${req.originalUrl}] ${err.message}`);
  }

  const response = {
    error: isServerError ? 'Internal Server Error' : err.message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack.split('\n').map((s) => s.trim());
  }

  res.status(statusCode).json(response);
}

module.exports = { errorHandler, notFoundHandler };