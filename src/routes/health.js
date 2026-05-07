/**
 * Health Monitoring Routes
 * ====================================================================
 * Server health status, metrics history, and system information.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const os = require('os');
const router = Router();

/**
 * GET /api/health — Current system health status
 */
router.get('/', (req, res) => {
  const healthScheduler = req.app.get('healthScheduler');
  const metrics = req.app.get('metrics');

  const health = healthScheduler ? healthScheduler.getLatestHealth() : null;
  const metricsSnapshot = metrics ? metrics.getSnapshot() : {};

  res.json({
    success: true,
    health,
    metrics: metricsSnapshot,
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * GET /api/health/history — Health history data
 */
router.get('/history', (req, res) => {
  const healthScheduler = req.app.get('healthScheduler');
  const limit = parseInt(req.query.limit || '60', 10);

  const history = healthScheduler
    ? healthScheduler.getHealthHistory(limit)
    : [];

  res.json({ success: true, history, total: history.length });
});

/**
 * GET /api/health/system — Detailed system information
 */
router.get('/system', (req, res) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  res.json({
    success: true,
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      type: os.type(),
      cpus: cpus.length,
      cpuModel: cpus[0]?.model || 'N/A',
      memory: {
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: ((1 - freeMem / totalMem) * 100).toFixed(1),
      },
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      nodeVersion: process.version,
      pid: process.pid,
    },
  });
});

module.exports = router;