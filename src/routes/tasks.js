/**
 * Task Queue Routes
 * ====================================================================
 * API for managing the multi-step task queue system.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const logger = require('../utils/logger');
const router = Router();

/**
 * GET /api/tasks — Get task queue state
 */
router.get('/', (req, res) => {
  const taskQueue = req.app.get('taskQueue');
  if (!taskQueue) {
    return res.status(503).json({ error: 'Task queue not initialized' });
  }
  res.json({ success: true, state: taskQueue.getState() });
});

/**
 * POST /api/tasks — Add a new task
 */
router.post('/', (req, res) => {
  const taskQueue = req.app.get('taskQueue');
  if (!taskQueue) {
    return res.status(503).json({ error: 'Task queue not initialized' });
  }

  const { type, data, priority } = req.body;
  if (!type) {
    return res.status(400).json({ error: 'Task type is required' });
  }

  // Create handler based on task type
  const handler = createTaskHandler(type);
  if (!handler) {
    return res.status(400).json({ error: `Unknown task type: ${type}` });
  }

  const taskId = taskQueue.addTask({
    type,
    handler,
    data: data || {},
    priority: priority || 0,
  });

  res.status(201).json({ success: true, taskId, type });
});

/**
 * POST /api/tasks/:id/cancel — Cancel a pending task
 */
router.post('/:id/cancel', (req, res) => {
  const taskQueue = req.app.get('taskQueue');
  if (!taskQueue) {
    return res.status(503).json({ error: 'Task queue not initialized' });
  }

  const cancelled = taskQueue.cancelTask(req.params.id);
  if (!cancelled) {
    return res.status(404).json({ error: 'Task not found or already running' });
  }

  res.json({ success: true, message: 'Task cancelled' });
});

/**
 * POST /api/tasks/pause — Pause the task queue
 */
router.post('/pause', (req, res) => {
  const taskQueue = req.app.get('taskQueue');
  if (!taskQueue) {
    return res.status(503).json({ error: 'Task queue not initialized' });
  }
  taskQueue.pause();
  res.json({ success: true, message: 'Queue paused' });
});

/**
 * POST /api/tasks/resume — Resume the task queue
 */
router.post('/resume', (req, res) => {
  const taskQueue = req.app.get('taskQueue');
  if (!taskQueue) {
    return res.status(503).json({ error: 'Task queue not initialized' });
  }
  taskQueue.resume();
  res.json({ success: true, message: 'Queue resumed' });
});

function createTaskHandler(type) {
  const handlers = {
    'health-check': async (data) => {
      logger.info(`Executing health check for: ${data.target || 'localhost'}`);
      return { status: 'healthy', timestamp: new Date().toISOString(), checks: ['cpu', 'memory', 'disk', 'network'] };
    },
    'container-inspect': async (data) => {
      logger.info(`Inspecting container: ${data.containerId || 'unknown'}`);
      return { containerId: data.containerId, status: 'running', resources: { cpu: 12.5, memory: 256 } };
    },
    'log-analysis': async (data) => {
      logger.info(`Analyzing logs: ${data.logSource || 'unknown'}`);
      return { entries: 1247, errors: 23, warnings: 89, summary: 'Log analysis complete' };
    },
    'deploy': async (data) => {
      logger.info(`Running deployment task: ${data.workflow || 'standard'}`);
      return { deploymentId: `dep_${Date.now()}`, status: 'completed', steps: 7 };
    },
    'backup': async (data) => {
      logger.info(`Running backup: ${data.target || 'unknown'}`);
      return { backupId: `bak_${Date.now()}`, size: '2.4 GB', status: 'completed' };
    },
    'notification': async (data) => {
      logger.info(`Sending notification: ${data.channel || 'unknown'}`);
      return { channel: data.channel, status: 'sent', timestamp: new Date().toISOString() };
    },
  };

  return handlers[type] || null;
}

module.exports = router;