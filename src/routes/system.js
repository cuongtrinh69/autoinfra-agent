/**
 * System Routes
 * ====================================================================
 * General system-level routes: uptime, version, process info, metrics.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const { version } = require('../../package.json');
const router = Router();

/**
 * GET /api/system/status — Overall system status
 */
router.get('/status', (req, res) => {
  const taskQueue = req.app.get('taskQueue');
  const dockerMonitor = req.app.get('dockerMonitor');
  const healthScheduler = req.app.get('healthScheduler');
  const metrics = req.app.get('metrics');
  const wss = req.app.get('wss');

  const queueState = taskQueue ? taskQueue.getState() : {};
  const health = healthScheduler ? healthScheduler.getLatestHealth() : null;
  const containers = dockerMonitor ? dockerMonitor.getContainers() : [];

  res.json({
    success: true,
    status: {
      version,
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        server: 'running',
        websocket: wss ? 'running' : 'stopped',
        taskQueue: taskQueue ? 'running' : 'stopped',
        dockerMonitor: dockerMonitor ? 'running' : 'stopped',
        healthScheduler: healthScheduler ? 'running' : 'stopped',
        metrics: metrics ? 'running' : 'stopped',
      },
      metrics: metrics ? metrics.getSnapshot() : {},
      queue: queueState,
      containers: {
        total: containers.length,
        running: containers.filter((c) => c.state === 'running').length,
      },
      health,
    },
  });
});

/**
 * GET /api/system/info — Application information
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    info: {
      name: 'AutoInfra Agent',
      version,
      description: 'AI-assisted infrastructure and deployment toolkit',
      homepage: 'https://github.com/autoinfra/autoinfra-agent',
      license: 'MIT',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      pid: process.pid,
      cwd: process.cwd(),
    },
  });
});

/**
 * POST /api/system/restart — Soft restart (reinitialize services)
 */
router.post('/restart', (req, res) => {
  // In a real implementation this would restart services gracefully
  res.json({ success: true, message: 'Restart signal received. Services will be reinitialized.' });
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

module.exports = router;