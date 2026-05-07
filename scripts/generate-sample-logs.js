/**
 * Sample Log Generator
 * ====================================================================
 * Generates realistic-looking server logs for demonstration purposes.
 * Run: node scripts/generate-sample-logs.js
 * ====================================================================
 */

'use strict';

const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { resolve } = require('path');

const LOG_DIR = resolve(__dirname, '..', 'logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const services = ['api-server', 'task-queue', 'docker-monitor', 'health-check', 'ai-agent', 'websocket', 'deploy-engine'];
const messages = {
  'api-server': [
    'Incoming request: GET /api/health — 200 OK (12ms)',
    'Incoming request: POST /api/deploy — 201 Created (234ms)',
    'Incoming request: GET /api/containers — 200 OK (45ms)',
    'Rate limit exceeded for IP 192.168.1.100',
    'Request body validation failed: missing required field "workflowId"',
    'CORS preflight request handled for origin http://dashboard.local',
    'Response compressed: 1.2MB → 340KB (72% reduction)',
  ],
  'task-queue': [
    'Task a1b2c3d4 (health-check) started execution',
    'Task e5f6g7h8 (deploy) completed successfully in 12.4s',
    'Task i9j0k1l2 (backup) failed after 3 retries: connection timeout',
    'Queue concurrency at 3/3 — processing at capacity',
    'Task m3n4o5p6 (log-analysis) queued with priority 5',
    'Retry attempt 2/3 for task q7r8s9t0 (container-inspect)',
    'Task queue paused by administrator',
  ],
  'docker-monitor': [
    'Polling Docker daemon at /var/run/docker.sock',
    'Container autoinfra-api is running (Up 14 hours)',
    'Container postgres-db is running (Up 14 days)',
    'Container old-nginx exited (0) 2 days ago',
    'High CPU alert: container redis-cache at 87.3%',
    'New container detected: prometheus (image: prom/prometheus:latest)',
    'Container autoinfra-api stopped — initiating restart policy',
  ],
  'health-check': [
    'System health check completed — all services healthy',
    'CPU: 32.4% | Memory: 4.2GB/8GB (52.5%) | Disk: 46.9%',
    'Warning: Memory usage trending upward (↑ 0.5% in last 5 min)',
    'Critical: Disk I/O latency above threshold (245ms avg)',
    'Health endpoint response time: 23ms (p99: 145ms)',
    'Database connection pool: 12/20 active connections',
    'Uptime: 14 days, 7 hours, 32 minutes',
  ],
  'ai-agent': [
    'AI analysis request received for deployment logs (2.4MB)',
    'OpenAI API call completed in 3.2s (model: gpt-4-turbo)',
    'Generated deployment configuration for Node.js + PostgreSQL stack',
    'Log analysis complete: 23 errors, 89 warnings, 1135 info entries',
    'Simulated response sent (AI_API_KEY not configured)',
    'Workflow step "health-check" completed — proceeding to "switch-traffic"',
    'Conversation history reset (50 messages cleared)',
  ],
  'websocket': [
    'Client connected: ws-client-4f8a (192.168.1.50)',
    'Client disconnected: ws-client-4f8a (session duration: 32m)',
    'Broadcasting health update to 4 subscribers on channel "health"',
    'Broadcasting container update to 2 subscribers on channel "containers"',
    'WebSocket ping/pong successful — 3 active connections',
    'Message received: {"action":"subscribe","channel":"tasks"}',
    'Connection limit warning: 98/100 clients connected',
  ],
  'deploy-engine': [
    'Starting deployment: dep_a1b2c3d4 (Quick Deploy)',
    'Step 1/7: git-clone — Cloning repository (12.4 MB)',
    'Step 3/7: run-tests — 127 tests passed, 0 failed',
    'Step 5/7: container-build — Image built in 14.3s',
    'Step 7/7: switch-traffic — Traffic switched successfully',
    'Deployment completed: dep_a1b2c3d4 (42.7s total)',
    'Rollback initiated: dep_e5f6g7h8 — reverting to v1.1.0',
  ],
};

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateLogLine() {
  const timestamp = new Date(Date.now() - Math.random() * 86400000 * 7).toISOString();
  const level = Math.random() > 0.8 ? randomItem(['ERROR', 'WARN']) : randomItem(['INFO', 'DEBUG']);
  const service = randomItem(services);
  const msg = randomItem(messages[service]);
  return `${timestamp} [${level}] [${service}] ${msg}`;
}

function generateLogFile(filename, lines) {
  const content = [];
  for (let i = 0; i < lines; i++) {
    content.push(generateLogLine());
  }
  const path = resolve(LOG_DIR, filename);
  writeFileSync(path, content.join('\n') + '\n');
  console.log(`✅ Generated ${lines} lines → ${filename}`);
}

console.log('📝 Generating sample log files...\n');
generateLogFile('combined.log', 500);
generateLogFile('error.log', 150);
generateLogFile('deployment.log', 300);
generateLogFile('access.log', 400);

console.log(`\n📁 Logs written to: ${LOG_DIR}/`);
console.log('Sample logs generated successfully!');