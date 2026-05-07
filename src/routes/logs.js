/**
 * Log Routes
 * ====================================================================
 * Log analysis utility — view, search, and stream server logs.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const { readFileSync, readdirSync, statSync, existsSync } = require('fs');
const { resolve } = require('path');
const logger = require('../utils/logger');
const router = Router();

const LOG_DIR = resolve(__dirname, '..', '..', process.env.LOG_DIR || 'logs');

/**
 * GET /api/logs — List available log files
 */
router.get('/', (req, res) => {
  if (!existsSync(LOG_DIR)) {
    return res.json({ success: true, files: [], directory: LOG_DIR });
  }

  const files = readdirSync(LOG_DIR)
    .filter((f) => f.endsWith('.log'))
    .map((f) => {
      const fullPath = resolve(LOG_DIR, f);
      const stats = statSync(fullPath);
      return {
        name: f,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
      };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);

  res.json({ success: true, files, directory: LOG_DIR });
});

/**
 * GET /api/logs/:file — Read a specific log file
 */
router.get('/:file', (req, res) => {
  const { file } = req.params;
  const lines = parseInt(req.query.lines || '100', 10);
  const search = req.query.search || '';

  // Security: prevent directory traversal
  if (file.includes('..') || file.includes('/')) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  const filePath = resolve(LOG_DIR, file);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: `Log file not found: ${file}` });
  }

  try {
    let content = readFileSync(filePath, 'utf-8');
    let logLines = content.split('\n').filter((l) => l.trim());

    // Apply search filter
    if (search) {
      logLines = logLines.filter((l) => l.toLowerCase().includes(search.toLowerCase()));
    }

    // Get last N lines
    const tail = logLines.slice(-lines);

    res.json({
      success: true,
      file,
      totalLines: logLines.length,
      filteredLines: tail.length,
      lines: tail,
      search: search || null,
    });
  } catch (err) {
    logger.error(`Error reading log file ${file}: ${err.message}`);
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

/**
 * GET /api/logs/:file/stats — Log file statistics
 */
router.get('/:file/stats', (req, res) => {
  const { file } = req.params;
  if (file.includes('..') || file.includes('/')) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  const filePath = resolve(LOG_DIR, file);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Log file not found' });
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    const errorCount = lines.filter((l) => /error|fatal|critical/i.test(l)).length;
    const warnCount = lines.filter((l) => /warn|warning/i.test(l)).length;
    const infoCount = lines.filter((l) => /info|debug|log/i.test(l)).length;

    res.json({
      success: true,
      file,
      stats: {
        totalLines: lines.length,
        errors: errorCount,
        warnings: warnCount,
        info: infoCount,
        errorsPercent: ((errorCount / lines.length) * 100).toFixed(1),
        warningsPercent: ((warnCount / lines.length) * 100).toFixed(1),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze log file' });
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

module.exports = router;