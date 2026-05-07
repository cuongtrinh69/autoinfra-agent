/**
 * Docker Container Status Monitor
 * ====================================================================
 * Watches Docker containers, collects stats (CPU, memory, network),
 * and emits events when container state changes.
 * ====================================================================
 */

'use strict';

const Docker = require('dockerode');
const logger = require('../utils/logger');
const { ws } = require('../ws');
const { EventEmitter } = require('events');

class DockerMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.socketPath = options.socketPath || '/var/run/docker.sock';
    this.apiVersion = options.apiVersion || '1.45';
    this.watchInterval = options.watchInterval || 5000;
    this._timer = null;
    this._running = false;
    this._containers = new Map();
    this._previousStats = new Map();

    try {
      this.docker = new Docker({
        socketPath: this.socketPath,
        version: this.apiVersion,
      });
      this._available = true;
    } catch (err) {
      logger.warn(`Docker not available: ${err.message}. Running in mock mode.`);
      this._available = false;
      this._mockMode = true;
    }
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._poll();
    logger.info('Docker monitor started', {
      interval: this.watchInterval,
      mode: this._mockMode ? 'mock' : 'live',
    });
  }

  stop() {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    logger.info('Docker monitor stopped');
  }

  async _poll() {
    if (!this._running) return;

    try {
      const containers = this._mockMode
        ? this._getMockContainers()
        : await this._getContainers();

      const currentIds = new Set(containers.map((c) => c.id));
      const previousIds = new Set(this._containers.keys());

      // Detect new containers
      for (const id of currentIds) {
        if (!previousIds.has(id)) {
          const container = containers.find((c) => c.id === id);
          this._emitContainerEvent('container-started', container);
        }
      }

      // Detect removed containers
      for (const id of previousIds) {
        if (!currentIds.has(id)) {
          const container = this._containers.get(id);
          this._emitContainerEvent('container-stopped', container);
        }
      }

      // Update stats for all containers
      for (const container of containers) {
        const stats = this._mockMode
          ? this._getMockStats(container)
          : await this._getStats(container.id);

        if (stats) {
          const prev = this._previousStats.get(container.id);
          this._checkThresholds(container, stats, prev);
          this._previousStats.set(container.id, stats);
          container.stats = stats;
        }
      }

      this._containers.clear();
      containers.forEach((c) => this._containers.set(c.id, c));

      // Broadcast full state
      ws.broadcast('containers', 'containersUpdate', {
        containers: Array.from(this._containers.values()),
        timestamp: new Date().toISOString(),
      });

      this.emit('update', containers);
    } catch (err) {
      logger.error(`Docker monitor poll error: ${err.message}`);
    }

    this._timer = setTimeout(() => this._poll(), this.watchInterval);
  }

  async _getContainers() {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map((c) => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace(/^\//, '') || 'unknown',
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports,
      created: new Date(c.Created * 1000).toISOString(),
    }));
  }

  async _getStats(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });
      return {
        cpu: this._calculateCPUPercent(stats),
        memory: {
          usage: stats.memory_stats.usage || 0,
          limit: stats.memory_stats.limit || 0,
          percent: ((stats.memory_stats.usage || 0) / (stats.memory_stats.limit || 1)) * 100,
        },
        network: stats.networks
          ? Object.values(stats.networks).reduce(
              (acc, n) => ({
                rxBytes: acc.rxBytes + (n.rx_bytes || 0),
                txBytes: acc.txBytes + (n.tx_bytes || 0),
              }),
              { rxBytes: 0, txBytes: 0 }
            )
          : { rxBytes: 0, txBytes: 0 },
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  _calculateCPUPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage -
      stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * numCpus * 100;
    }
    return 0;
  }

  _getMockContainers() {
    const statuses = ['running', 'running', 'running', 'exited', 'running'];
    const names = [
      'autoinfra-api',
      'postgres-db',
      'redis-cache',
      'old-nginx',
      'prometheus',
    ];
    const images = [
      'autoinfra-agent:latest',
      'postgres:16-alpine',
      'redis:7-alpine',
      'nginx:1.25',
      'prom/prometheus:latest',
    ];

    return names.map((name, i) => ({
      id: `cont_${(i + 1).toString().padStart(8, '0')}`,
      name,
      image: images[i],
      state: statuses[i],
      status: statuses[i] === 'running'
        ? `Up ${Math.floor(Math.random() * 72)} hours`
        : 'Exited (0) 2 days ago',
      ports: [
        { privatePort: 3000 + i, publicPort: 80 + i, type: 'tcp' },
      ],
      created: new Date(Date.now() - i * 86400000).toISOString(),
      stats: this._getMockStats({ id: `cont_${(i + 1).toString().padStart(8, '0')}` }),
    }));
  }

  _getMockStats(container) {
    const memoryBase = 256 + Math.floor(Math.random() * 128);
    return {
      cpu: 5 + Math.random() * 40,
      memory: {
        usage: memoryBase * 1024 * 1024,
        limit: 512 * 1024 * 1024,
        percent: (memoryBase / 512) * 100,
      },
      network: {
        rxBytes: 1024 * 1024 * (10 + Math.floor(Math.random() * 90)),
        txBytes: 1024 * 1024 * (5 + Math.floor(Math.random() * 45)),
      },
      timestamp: new Date().toISOString(),
    };
  }

  _checkThresholds(container, stats, prev) {
    const cpuThreshold = 80;
    const memThreshold = 85;

    if (stats.cpu > cpuThreshold) {
      this._emitAlert('high-cpu', container, { cpu: stats.cpu });
    }
    if (stats.memory.percent > memThreshold) {
      this._emitAlert('high-memory', container, { memoryPercent: stats.memory.percent });
    }
  }

  _emitContainerEvent(event, container) {
    ws.broadcast('containers', event, {
      container,
      timestamp: new Date().toISOString(),
    });
    this.emit(event, container);
  }

  _emitAlert(type, container, data) {
    ws.broadcast('alerts', 'containerAlert', {
      type,
      container: { id: container.id, name: container.name },
      data,
      timestamp: new Date().toISOString(),
    });
    this.emit('alert', { type, container, data });
  }

  getContainers() {
    return Array.from(this._containers.values());
  }

  getContainer(id) {
    return this._containers.get(id);
  }
}

module.exports = { DockerMonitor };