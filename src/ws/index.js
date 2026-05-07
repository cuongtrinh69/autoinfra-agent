/**
 * WebSocket Server
 * ====================================================================
 * Real-time bidirectional communication for terminal logs,
 * container events, task queue updates, and system metrics.
 * ====================================================================
 */

'use strict';

const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class AutoInfraWebSocket {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.channels = new Map();
  }

  /**
   * Initialize WebSocket server on the given HTTP server
   */
  init(server, port) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      const clientIp = req.socket.remoteAddress;

      logger.info(`WebSocket client connected: ${clientId} (${clientIp})`);

      // Store client
      this.clients.set(clientId, {
        ws,
        ip: clientIp,
        connectedAt: new Date(),
        channels: new Set(),
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to AutoInfra Agent WebSocket',
      }));

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this._handleMessage(clientId, msg);
        } catch (err) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON message format',
          }));
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        logger.info(`WebSocket client disconnected: ${clientId}`);
        const client = this.clients.get(clientId);
        if (client) {
          client.channels.forEach((channel) => {
            this._leaveChannel(clientId, channel);
          });
        }
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (err) => {
        logger.error(`WebSocket error for client ${clientId}: ${err.message}`);
        this.clients.delete(clientId);
      });

      // Ping/pong for keep-alive
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
    });

    // Ping interval
    const pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(pingInterval));

    return this.wss;
  }

  /**
   * Handle incoming WebSocket messages
   */
  _handleMessage(clientId, msg) {
    const { action, channel, payload } = msg;
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (action) {
      case 'subscribe':
        this._joinChannel(clientId, channel || 'default');
        break;
      case 'unsubscribe':
        this._leaveChannel(clientId, channel || 'default');
        break;
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      default:
        client.ws.send(JSON.stringify({
          type: 'unknown-action',
          action,
          message: `Unknown action: ${action}`,
        }));
    }
  }

  /**
   * Subscribe client to a channel
   */
  _joinChannel(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(clientId);
    client.channels.add(channel);

    client.ws.send(JSON.stringify({
      type: 'subscribed',
      channel,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Unsubscribe client from a channel
   */
  _leaveChannel(clientId, channel) {
    if (this.channels.has(channel)) {
      this.channels.get(channel).delete(clientId);
      if (this.channels.get(channel).size === 0) {
        this.channels.delete(channel);
      }
    }
    const client = this.clients.get(clientId);
    if (client) client.channels.delete(channel);
  }

  /**
   * Broadcast a message to all clients subscribed to a channel
   */
  broadcast(channel, event, data) {
    const channelClients = this.channels.get(channel);
    if (!channelClients) return;

    const message = JSON.stringify({
      type: 'event',
      channel,
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    channelClients.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Send a message to a specific client
   */
  sendTo(clientId, event, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify({
        type: 'direct',
        event,
        data,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(event, data) {
    const message = JSON.stringify({
      type: 'broadcast',
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  /**
   * Close the WebSocket server
   */
  close() {
    if (this.wss) {
      this.wss.clients.forEach((ws) => ws.close());
      this.wss.close();
    }
  }
}

const wsInstance = new AutoInfraWebSocket();

function wsServer(server, port) {
  return wsInstance.init(server, port);
}

module.exports = { wsServer, ws: wsInstance };