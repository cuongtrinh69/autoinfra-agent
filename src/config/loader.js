/**
 * Configuration Loader
 * ====================================================================
 * Loads and validates configuration from environment variables
 * with sensible defaults for development and production.
 * ====================================================================
 */

'use strict';

const { resolve } = require('path');
require('dotenv').config({ path: resolve(__dirname, '..', '..', '.env') });

class ConfigLoader {
  static load() {
    return {
      server: {
        port: parseInt(process.env.SERVER_PORT || '3000', 10),
        host: process.env.SERVER_HOST || '0.0.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      ws: {
        port: parseInt(process.env.WS_PORT || '3001', 10),
        maxClients: parseInt(process.env.WS_MAX_CLIENTS || '100', 10),
        pingIntervalMs: parseInt(process.env.WS_PING_INTERVAL_MS || '30000', 10),
      },
      logging: {
        level: process.env.LOG_LEVEL || 'debug',
        dir: process.env.LOG_DIR || './logs',
        retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '7', 10),
        maxFileSizeMB: parseInt(process.env.LOG_MAX_FILE_SIZE_MB || '10', 10),
      },
      docker: {
        enabled: !!process.env.DOCKER_SOCKET,
        socket: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
        apiVersion: process.env.DOCKER_API_VERSION || '1.45',
        watchIntervalMs: parseInt(process.env.CONTAINER_WATCH_INTERVAL_MS || '5000', 10),
      },
      queue: {
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
        pollIntervalMs: parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '1000', 10),
        maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
        retryDelayMs: parseInt(process.env.QUEUE_RETRY_DELAY_MS || '5000', 10),
      },
      ai: {
        provider: process.env.AI_PROVIDER || 'openai',
        endpoint: process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1',
        apiKey: process.env.AI_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4-turbo',
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
        timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
      },
      health: {
        intervalSec: parseInt(process.env.HEALTH_CHECK_INTERVAL_SEC || '60', 10),
        timeoutSec: parseInt(process.env.HEALTH_CHECK_TIMEOUT_SEC || '10', 10),
        alertEmail: process.env.ALERT_EMAIL || '',
      },
      security: {
        rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000', 10),
        rateLimitMax: parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10),
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        jwtSecret: process.env.JWT_SECRET || 'change-me-to-a-random-secret',
        jwtExpiry: process.env.JWT_EXPIRY || '24h',
      },
      metrics: {
        enabled: process.env.METRICS_ENABLED !== 'false',
        retentionHours: parseInt(process.env.METRICS_RETENTION_HOURS || '72', 10),
      },
      notifications: {
        slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
        discordWebhook: process.env.DISCORD_WEBHOOK_URL || '',
      },
    };
  }

  static validate() {
    const cfg = ConfigLoader.load();
    const errors = [];

    if (cfg.server.port < 1 || cfg.server.port > 65535) {
      errors.push('SERVER_PORT must be between 1 and 65535');
    }
    if (cfg.queue.concurrency < 1) {
      errors.push('QUEUE_CONCURRENCY must be >= 1');
    }
    if (cfg.health.intervalSec < 10) {
      errors.push('HEALTH_CHECK_INTERVAL_SEC should be >= 10');
    }
    if (cfg.security.jwtSecret === 'change-me-to-a-random-secret') {
      errors.push('JWT_SECRET should be changed from the default value');
    }

    return { valid: errors.length === 0, errors, config: cfg };
  }
}

module.exports = { ConfigLoader };