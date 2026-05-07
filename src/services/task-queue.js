/**
 * Multi-step Task Queue System
 * ====================================================================
 * Manages asynchronous task execution with concurrency control,
 * retry logic, priority queuing, and real-time status updates via WebSocket.
 * ====================================================================
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { ws } = require('../ws');
const { EventEmitter } = require('events');

// Task status constants
const STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying',
};

class TaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.queue = [];
    this.running = new Map();
    this.completed = [];
    this.failed = [];
    this.concurrency = options.concurrency || 3;
    this.pollInterval = options.pollInterval || 1000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this._timer = null;
    this._running = false;
    this._paused = false;
  }

  /**
   * Start processing the task queue
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._processLoop();
    logger.info('Task queue processing started', {
      concurrency: this.concurrency,
      pollInterval: this.pollInterval,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Stop processing the task queue
   */
  stop() {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    logger.info('Task queue processing stopped');
  }

  /**
   * Pause queue processing (running tasks continue to completion)
   */
  pause() {
    this._paused = true;
    logger.info('Task queue paused');
  }

  /**
   * Resume queue processing
   */
  resume() {
    this._paused = false;
    logger.info('Task queue resumed');
  }

  /**
   * Add a task to the queue
   * @param {Object} task - Task definition
   * @param {string} task.type - Task type identifier
   * @param {Function} task.handler - Async function to execute
   * @param {Object} [task.data] - Data payload for the handler
   * @param {number} [task.priority=0] - Higher = processed first
   * @returns {string} taskId
   */
  addTask(task) {
    const taskId = uuidv4();
    const entry = {
      id: taskId,
      type: task.type,
      handler: task.handler,
      data: task.data || {},
      priority: task.priority || 0,
      status: STATUS.PENDING,
      retries: 0,
      maxRetries: task.maxRetries || this.maxRetries,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    };

    this.queue.push(entry);
    // Sort by priority (descending), then by creation time
    this.queue.sort((a, b) => b.priority - a.priority);

    logger.debug(`Task added to queue: ${taskId} (${task.type})`, {
      priority: entry.priority,
      queueLength: this.queue.length,
    });

    this._emitUpdate(entry);
    return taskId;
  }

  /**
   * Cancel a pending task
   */
  cancelTask(taskId) {
    const idx = this.queue.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      const task = this.queue[idx];
      if (task.status === STATUS.PENDING) {
        task.status = STATUS.CANCELLED;
        this.completed.push(task);
        this.queue.splice(idx, 1);
        this._emitUpdate(task);
        logger.info(`Task cancelled: ${taskId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Get the current state of the queue
   */
  getState() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed.length,
      failed: this.failed.length,
      isPaused: this._paused,
      concurrency: this.concurrency,
      tasks: {
        pending: this.queue.filter((t) => t.status === STATUS.PENDING).length,
        running: Array.from(this.running.values()).map((t) => ({
          id: t.id,
          type: t.type,
          startedAt: t.startedAt,
        })),
        recentCompleted: this.completed.slice(-10),
        recentFailed: this.failed.slice(-10),
      },
    };
  }

  /**
   * Main processing loop
   */
  async _processLoop() {
    if (!this._running) return;

    if (!this._paused) {
      while (this.running.size < this.concurrency && this.queue.length > 0) {
        const task = this.queue.shift();
        if (task.status === STATUS.CANCELLED) continue;
        this._executeTask(task);
      }
    }

    this._timer = setTimeout(() => this._processLoop(), this.pollInterval);
  }

  /**
   * Execute a single task with retry logic
   */
  async _executeTask(task) {
    task.status = STATUS.RUNNING;
    task.startedAt = new Date();
    this.running.set(task.id, task);
    this._emitUpdate(task);

    try {
      logger.info(`Executing task: ${task.id} (${task.type})`);
      const result = await task.handler(task.data);
      task.status = STATUS.COMPLETED;
      task.completedAt = new Date();
      task.result = result;
      this.running.delete(task.id);
      this.completed.push(task);
      this._emitUpdate(task);
      logger.info(`Task completed: ${task.id} (${task.type})`);
    } catch (err) {
      logger.warn(`Task failed: ${task.id} (${task.type}): ${err.message}`);

      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = STATUS.RETRYING;
        this._emitUpdate(task);
        logger.info(`Retrying task: ${task.id} (attempt ${task.retries}/${task.maxRetries})`);

        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        this.queue.unshift(task);
        this.running.delete(task.id);
      } else {
        task.status = STATUS.FAILED;
        task.completedAt = new Date();
        task.error = err.message;
        this.running.delete(task.id);
        this.failed.push(task);
        this._emitUpdate(task);
        logger.error(`Task failed permanently: ${task.id} (${task.type})`, {
          retries: task.retries,
          error: err.message,
        });
      }
    }
  }

  /**
   * Emit task update via WebSocket and EventEmitter
   */
  _emitUpdate(task) {
    const payload = {
      id: task.id,
      type: task.type,
      status: task.status,
      retries: task.retries,
      maxRetries: task.maxRetries,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      error: task.error,
    };

    this.emit('taskUpdate', payload);
    ws.broadcast('tasks', 'taskUpdate', payload);
  }
}

module.exports = { TaskQueue, STATUS };