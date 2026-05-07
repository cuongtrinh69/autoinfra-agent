/**
 * Container Routes
 * ====================================================================
 * Docker/container status monitoring and management API.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const logger = require('../utils/logger');
const router = Router();

/**
 * GET /api/containers — List all containers with stats
 */
router.get('/', (req, res) => {
  const dockerMonitor = req.app.get('dockerMonitor');
  if (!dockerMonitor) {
    return res.json({ success: true, containers: [], message: 'Docker monitor not active' });
  }

  const containers = dockerMonitor.getContainers();
  res.json({
    success: true,
    containers,
    total: containers.length,
    running: containers.filter((c) => c.state === 'running').length,
    stopped: containers.filter((c) => c.state !== 'running').length,
  });
});

/**
 * GET /api/containers/:id — Get single container details
 */
router.get('/:id', (req, res) => {
  const dockerMonitor = req.app.get('dockerMonitor');
  if (!dockerMonitor) {
    return res.status(503).json({ error: 'Docker monitor not active' });
  }

  const container = dockerMonitor.getContainer(req.params.id);
  if (!container) {
    return res.status(404).json({ error: 'Container not found' });
  }

  res.json({ success: true, container });
});

/**
 * GET /api/containers/stats/summary — Aggregated container stats
 */
router.get('/stats/summary', (req, res) => {
  const dockerMonitor = req.app.get('dockerMonitor');
  if (!dockerMonitor) {
    return res.json({ success: true, stats: { total: 0, running: 0, avgCpu: 0, avgMemory: 0 } });
  }

  const containers = dockerMonitor.getContainers();
  const running = containers.filter((c) => c.state === 'running');

  const avgCpu = running.length > 0
    ? running.reduce((sum, c) => sum + (c.stats?.cpu || 0), 0) / running.length
    : 0;

  const avgMemory = running.length > 0
    ? running.reduce((sum, c) => sum + (c.stats?.memory?.percent || 0), 0) / running.length
    : 0;

  res.json({
    success: true,
    stats: {
      total: containers.length,
      running: running.length,
      stopped: containers.length - running.length,
      avgCpu: Math.round(avgCpu * 10) / 10,
      avgMemory: Math.round(avgMemory * 10) / 10,
    },
  });
});

module.exports = router;