/**
 * Authentication Middleware
 * ====================================================================
 * JWT-based authentication for protected API routes.
 * ====================================================================
 */

'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'change-me-to-a-random-secret';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`JWT verification failed: ${err.message}`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'change-me-to-a-random-secret';

  try {
    req.user = jwt.verify(token, secret);
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticate, optionalAuth };