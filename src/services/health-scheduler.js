/**
 * Server Health Monitoring Scheduler
 * ====================================================================
 * Periodically checks system health (CPU, memory, disk, uptime)
 * and emits alerts via WebSocket.
 * ====================================================================
 */

'use strict';

const os = require('os');
const { execSync } = require('child_process');
const logger = require('../utils/logger');
const { ws } = require('../ws');
const { EventEmitter } = require('events');

class HealthScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.intervalSec = options.intervalSec || 60;
    this.timeoutSec = options.timeoutSec || 10;
    this.alertEmail = options.alertEmail || '';
    this._timer = null;
    this._running = false;
    this._history = [];
    this._maxHistoryPoints = 1440; // 24 hours at 1-min intervals
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._check();
    this._timer = setInterval(() => this._check(), this.intervalSec * 1000);
    logger.info('Health scheduler started', {
      intervalSec: this.intervalSec,
      maxHistoryPoints: this._maxHistoryPoints,
    });
  }

  stop() {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    logger.info('Health scheduler stopped');
  }

  async _check() {
    try {
      const health = await this._collectHealthMetrics();

      // Store history
      this._history.push(health);
      if (this._history.length > this._maxHistoryPoints) {
        this._history.shift();
      }

      // Check thresholds and emit alerts
      this._evaluateHealth(health);

      // Broadcast via WebSocket
      ws.broadcast('health', 'healthUpdate', {
        health,
        timestamp: new Date().toISOString(),
      });

      this.emit('update', health);
    } catch (err) {
      logger.error(`Health check error: ${err.message}`);
    }
  }

  async _collectHealthMetrics() {
    const cpus = os.cpus();
    const totalCpu = cpus.length;
    const cpuLoad = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    let diskInfo = {};
    try {
      const dfOutput = execSync('df -h /', { timeout: 3000 }).toString();
      const lines = dfOutput.trim().split('\n');
      const parts = lines[1]?.split(/\s+/) || [];
      diskInfo = {
        total: parts[1] || 'N/A',
        used: parts[2] || 'N/A',
        available: parts[3] || 'N/A',
        usedPercent: parseFloat(parts[4]?.replace('%', '') || 0),
        mountedOn: parts[5] || '/',
      };
    } catch {
      // Mock disk info for non-Linux environments
      diskInfo = {
        total: '64G',
        used: '32G',
        available: '32G',
        usedPercent: 50,
        mountedOn: '/',
      };
    }

    const uptimeSeconds = os.uptime();
    const uptimeFormatted = this._formatUptime(uptimeSeconds);

    const networkInterfaces = os.networkInterfaces();
    const activeInterfaces = Object.entries(networkInterfaces)
      .filter(([, ifaces]) => ifaces?.some((i) => !i.internal))
      .map(([name]) => name);

    return {
      cpu: {
        cores: totalCpu,
        loadAvg1m: cpuLoad[0]?.toFixed(2) || 0,
        loadAvg5m: cpuLoad[1]?.toFixed(2) || 0,
        loadAvg15m: cpuLoad[2]?.toFixed(2) || 0,
        usagePercent: ((cpuLoad[0] / totalCpu) * 100).toFixed(1),
      },
      memory: {
        total: this._formatBytes(totalMem),
        used: this._formatBytes(usedMem),
        free: this._formatBytes(freeMem),
        percent: parseFloat(memPercent),
      },
      disk: diskInfo,
      os: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        type: os.type(),
      },
      uptime: {
        seconds: uptimeSeconds,
        formatted: uptimeFormatted,
      },
      network: {
        interfaces: activeInterfaces,
      },
      timestamp: new Date().toISOString(),
    };
  }

  _evaluateHealth(health) {
    const alerts = [];

    if (health.cpu.usagePercent > 80) {
      alerts.push({
        type: 'critical',
        message: `High CPU usage: ${health.cpu.usagePercent}%`,
      });
    }

    if (health.memory.percent > 85) {
      alerts.push({
        type: 'critical',
        message: `High memory usage: ${health.memory.percent}%`,
      });
    }

    if (health.disk.usedPercent > 90) {
      alerts.push({
        type: 'critical',
        message: `High disk usage: ${health.disk.usedPercent}%`,
      });
    }

    if (alerts.length > 0) {
      ws.broadcast('alerts', 'systemAlert', {
        alerts,
        health,
        timestamp: new Date().toISOString(),
      });
      this.emit('alerts', alerts);
    }
  }

  _formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ') || '< 1m';
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  getLatestHealth() {
    return this._history.length > 0 ? this._history[this._history.length - 1] : null;
  }

  getHealthHistory(limit = 60) {
    return this._history.slice(-limit);
  }
}

module.exports = { HealthScheduler };