/**
 * Configuration Routes
 * ====================================================================
 * View and validate the current environment configuration.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const { ConfigLoader } = require('../config/loader');
const router = Router();

/**
 * GET /api/config — Get current configuration (sanitized)
 */
router.get('/', (req, res) => {
  const config = ConfigLoader.load();

  // Sanitize sensitive values
  const sanitized = {
    server: config.server,
    ws: config.ws,
    logging: { ...config.logging, dir: undefined },
    docker: { ...config.docker, socket: '***' },
    queue: config.queue,
    ai: {
      provider: config.ai.provider,
      model: config.ai.model,
      maxTokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
      configured: !!config.ai.apiKey,
    },
    health: config.health,
    metrics: config.metrics,
  };

  res.json({ success: true, config: sanitized });
});

/**
 * GET /api/config/validate — Validate configuration
 */
router.get('/validate', (req, res) => {
  const result = ConfigLoader.validate();
  res.json({
    success: result.valid,
    valid: result.valid,
    errors: result.errors,
  });
});

/**
 * GET /api/config/env — List environment variables (safe only)
 */
router.get('/env', (req, res) => {
  const safeKeys = [
    'NODE_ENV', 'SERVER_PORT', 'SERVER_HOST',
    'LOG_LEVEL', 'LOG_RETENTION_DAYS',
    'QUEUE_CONCURRENCY', 'QUEUE_MAX_RETRIES',
    'AI_PROVIDER', 'AI_MODEL', 'AI_MAX_TOKENS', 'AI_TEMPERATURE',
    'HEALTH_CHECK_INTERVAL_SEC',
    'METRICS_ENABLED', 'METRICS_RETENTION_HOURS',
    'CORS_ORIGIN',
  ];

  const env = {};
  safeKeys.forEach((key) => {
    if (process.env[key]) env[key] = process.env[key];
  });

  res.json({ success: true, environment: env });
});

module.exports = router;