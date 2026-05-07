#!/usr/bin/env node

/**
 * AutoInfra Agent — Main Entry Point
 * ====================================================================
 * AI-assisted infrastructure and deployment toolkit.
 * Starts Express server, WebSocket server, task queue, and monitors.
 * ====================================================================
 */

'use strict';

const { createServer } = require('http');
const { resolve } = require('path');
const { existsSync, mkdirSync } = require('fs');

// ------------------------------------------------------------------
// 1. Bootstrap: load environment variables first
// ------------------------------------------------------------------
require('dotenv').config({ path: resolve(__dirname, '..', '.env') });

const app = require('./app');
const logger = require('./utils/logger');
const { wsServer } = require('./ws');
const { TaskQueue } = require('./services/task-queue');
const { DockerMonitor } = require('./services/docker-monitor');
const { HealthScheduler } = require('./services/health-scheduler');
const { ConfigLoader } = require('./config/loader');
const { MetricsCollector } = require('./services/metrics');
const { version } = require('../package.json');

// ------------------------------------------------------------------
// 2. Ensure required directories exist
// ------------------------------------------------------------------
const dirs = ['logs', 'data', 'temp'];
dirs.forEach((dir) => {
  const p = resolve(__dirname, '..', dir);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
});

// ------------------------------------------------------------------
// 3. Configuration
// ------------------------------------------------------------------
const config = ConfigLoader.load();
const PORT = config.server.port || 3000;
const WS_PORT = config.ws.port || 3001;

// ------------------------------------------------------------------
// 4. Create HTTP server
// ------------------------------------------------------------------
const server = createServer(app);

// ------------------------------------------------------------------
// 5. Attach WebSocket server
// ------------------------------------------------------------------
const wss = wsServer(server, WS_PORT);
logger.info(`WebSocket server listening on port ${WS_PORT}`);

// ------------------------------------------------------------------
// 6. Initialize services
// ------------------------------------------------------------------

// 6a. Task Queue
const taskQueue = new TaskQueue({
  concurrency: config.queue.concurrency,
  pollInterval: config.queue.pollIntervalMs,
  maxRetries: config.queue.maxRetries,
  retryDelay: config.queue.retryDelayMs,
});
taskQueue.start();
logger.info('Task queue started', {
  concurrency: config.queue.concurrency,
});

// 6b. Docker Monitor
let dockerMonitor = null;
if (config.docker.enabled) {
  dockerMonitor = new DockerMonitor({
    socketPath: config.docker.socket,
    apiVersion: config.docker.apiVersion,
    watchInterval: config.docker.watchIntervalMs,
  });
  dockerMonitor.start();
  logger.info('Docker monitor started');
}

// 6c. Health Scheduler
const healthScheduler = new HealthScheduler({
  intervalSec: config.health.intervalSec,
  timeoutSec: config.health.timeoutSec,
  alertEmail: config.health.alertEmail,
});
healthScheduler.start();
logger.info('Health scheduler started', {
  intervalSec: config.health.intervalSec,
});

// 6d. Metrics Collector
const metrics = new MetricsCollector({
  retentionHours: config.metrics.retentionHours,
});
metrics.start();
logger.info('Metrics collector started');

// Expose services on app for route access
app.set('taskQueue', taskQueue);
app.set('dockerMonitor', dockerMonitor);
app.set('healthScheduler', healthScheduler);
app.set('metrics', metrics);
app.set('wss', wss);

// ------------------------------------------------------------------
// 7. Graceful shutdown
// ------------------------------------------------------------------
async function shutdown(signal) {
  logger.info(`Received ${signal} — shutting down gracefully...`);

  taskQueue.stop();
  if (dockerMonitor) dockerMonitor.stop();
  healthScheduler.stop();
  metrics.stop();

  wss.close(() => {
    server.close(() => {
      logger.info('Server shut down complete');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

// ------------------------------------------------------------------
// 8. Start listening
// ------------------------------------------------------------------
server.listen(PORT, config.server.host, () => {
  const addr = `http://${config.server.host}:${PORT}`;
  logger.info(`
  ╔══════════════════════════════════════════════════╗
  ║         AutoInfra Agent v${version.padEnd(5)}            ║
  ║  AI-assisted Infrastructure & Deployment Toolkit ║
  ╠══════════════════════════════════════════════════╣
  ║  Server  : ${addr.padEnd(39)}║
  ║  WS      : ws://localhost:${String(WS_PORT).padEnd(4)}                      ║
  ║  Dashboard: ${(addr + '/dashboard').padEnd(37)}║
  ║  Health  : ${(addr + '/health').padEnd(37)}║
  ╚══════════════════════════════════════════════════╝
  `);
});

module.exports = { server, wss };