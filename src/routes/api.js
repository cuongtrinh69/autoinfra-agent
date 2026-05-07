/**
 * API Routes — Infrastructure Management
 * ====================================================================
 * RESTful JSON API for all AutoInfra Agent operations:
 * deployment, containers, health, tasks, AI agent, logs, config.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const logger = require('../utils/logger');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { ConfigLoader } = require('../config/loader');
const router = Router();

// ------------------------------------------------------------------
// Mount sub-routers
// ------------------------------------------------------------------
router.use('/deploy', require('./deploy'));
router.use('/containers', require('./containers'));
router.use('/health', require('./health'));
router.use('/tasks', require('./tasks'));
router.use('/ai', require('./ai'));
router.use('/logs', require('./logs'));
router.use('/config', require('./config'));
router.use('/system', require('./system'));

module.exports = router;