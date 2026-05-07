/**
 * Metrics Collector
 * ====================================================================
 * Collects, stores, and exposes application metrics for monitoring
 * and dashboard visualization.
 * ====================================================================
 */

'use strict';

const logger = require('../utils/logger');
const { ws } = require('../ws');
const { EventEmitter } = require('events');

class MetricsCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.retentionHours = options.retentionHours || 72;
    this._timer = null;
    this._running = false;

    this._metrics = {
      requests: { total: 0, success: 0, failed: 0, byEndpoint: {} },
      tasks: { total: 0, completed: 0, failed: 0, running: 0 },
      websocket: { totalConnections: 0, activeConnections: 0 },
      uptime: { startTime: Date.now() },
      custom: {},
    };

    this._timeSeries = [];
    this._maxDataPoints = (this.retentionHours * 3600) / 30; // 30s intervals
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._timer = setInterval(() => this._recordSnapshot(), 30000);
    logger.info('Metrics collector started', {
      retentionHours: this.retentionHours,
      maxDataPoints: this._maxDataPoints,
    });
  }

  stop() {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Record an API request
   */
  recordRequest(endpoint, statusCode, durationMs) {
    this._metrics.requests.total++;
    if (statusCode < 400) {
      this._metrics.requests.success++;
    } else {
      this._metrics.requests.failed++;
    }

    if (!this._metrics.requests.byEndpoint[endpoint]) {
      this._metrics.requests.byEndpoint[endpoint] = { total: 0, success: 0, failed: 0, avgDuration: 0 };
    }
    const ep = this._metrics.requests.byEndpoint[endpoint];
    ep.total++;
    if (statusCode < 400) ep.success++;
    else ep.failed++;
    ep.avgDuration = ((ep.avgDuration * (ep.total - 1)) + durationMs) / ep.total;
  }

  /**
   * Record task metrics
   */
  recordTask(status) {
    this._metrics.tasks.total++;
    if (status === 'completed') this._metrics.tasks.completed++;
    else if (status === 'failed') this._metrics.tasks.failed++;
    else if (status === 'running') this._metrics.tasks.running++;
  }

  /**
   * Record WebSocket connection
   */
  recordWSConnection(type) {
    if (type === 'connect') {
      this._metrics.websocket.totalConnections++;
      this._metrics.websocket.activeConnections++;
    } else if (type === 'disconnect') {
      this._metrics.websocket.activeConnections =
        Math.max(0, this._metrics.websocket.activeConnections - 1);
    }
  }

  /**
   * Set a custom metric
   */
  setCustomMetric(name, value) {
    this._metrics.custom[name] = value;
  }

  /**
   * Record a time-series data point
   */
  _recordSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      requests: {
        total: this._metrics.requests.total,
        success: this._metrics.requests.success,
        failed: this._metrics.requests.failed,
      },
      tasks: { ...this._metrics.tasks },
      websocket: { activeConnections: this._metrics.websocket.activeConnections },
      memory: process.memoryUsage(),
      uptime: Math.floor((Date.now() - this._metrics.uptime.startTime) / 1000),
    };

    this._timeSeries.push(snapshot);
    if (this._timeSeries.length > this._maxDataPoints) {
      this._timeSeries.shift();
    }

    ws.broadcast('metrics', 'metricsSnapshot', snapshot);
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot() {
    return {
      ...this._metrics,
      uptime: {
        ...this._metrics.uptime,
        seconds: Math.floor((Date.now() - this._metrics.uptime.startTime) / 1000),
      },
    };
  }

  /**
   * Get time-series data
   */
  getTimeSeries(limit = 120) {
    return this._timeSeries.slice(-limit);
  }

  /**
   * Reset all metrics
   */
  reset() {
    this._metrics = {
      requests: { total: 0, success: 0, failed: 0, byEndpoint: {} },
      tasks: { total: 0, completed: 0, failed: 0, running: 0 },
      websocket: { totalConnections: 0, activeConnections: 0 },
      uptime: { startTime: Date.now() },
      custom: {},
    };
    this._timeSeries = [];
    logger.info('Metrics have been reset');
  }
}

module.exports = { MetricsCollector };