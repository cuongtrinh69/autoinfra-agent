/**
 * AutoInfra Agent — Dashboard Frontend
 * ====================================================================
 * Interactive single-page dashboard with real-time updates.
 * Communicates with the REST API and WebSocket.
 */

const API_BASE = '/api';
let ws = null;
let isConnected = false;

// ------------------------------------------------------------------
// Initialize
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  connectWebSocket();
  loadOverview();
  loadWorkflows();
  loadConfig();
  loadLogFiles();

  // Periodic refresh
  setInterval(loadOverview, 10000);
  setInterval(loadDeployments, 5000);
  setInterval(loadContainers, 5000);
  setInterval(loadTaskQueue, 5000);
});

// ------------------------------------------------------------------
// WebSocket
// ------------------------------------------------------------------
function initWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}/ws`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected = true;
    document.getElementById('connectionStatus').querySelector('.status-dot').className = 'status-dot online';
    document.getElementById('connectionStatus').querySelector('.status-text').textContent = 'Connected';
    ws.send(JSON.stringify({ action: 'subscribe', channel: 'health' }));
    ws.send(JSON.stringify({ action: 'subscribe', channel: 'containers' }));
    ws.send(JSON.stringify({ action: 'subscribe', channel: 'tasks' }));
  };

  ws.onclose = () => {
    isConnected = false;
    document.getElementById('connectionStatus').querySelector('.status-dot').className = 'status-dot offline';
    document.getElementById('connectionStatus').querySelector('.status-text').textContent = 'Disconnected';
    setTimeout(connectWebSocket, 3000);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWSMessage(msg);
    } catch (e) { /* ignore */ }
  };
}

function connectWebSocket() {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    initWebSocket();
  }
}

function handleWSMessage(msg) {
  if (msg.type === 'event') {
    if (msg.event === 'healthUpdate') refreshHealthTab();
    if (msg.event === 'containersUpdate') loadContainers();
    if (msg.event === 'taskUpdate') loadTaskQueue();
  }
}

// ------------------------------------------------------------------
// Tab Switching
// ------------------------------------------------------------------
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));

  const tabEl = document.getElementById(`tab-${tab}`);
  if (tabEl) tabEl.classList.add('active');

  const navEl = document.querySelector(`[data-tab="${tab}"]`);
  if (navEl) navEl.classList.add('active');

  // Load data when switching to specific tabs
  if (tab === 'deploy') loadDeployments();
  if (tab === 'containers') loadContainers();
  if (tab === 'tasks') loadTaskQueue();
  if (tab === 'health') refreshHealthTab();
  if (tab === 'logs') loadLogFiles();
  if (tab === 'ai') checkAIStatus();
  if (tab === 'config') loadConfig();
}

// ------------------------------------------------------------------
// API Helper
// ------------------------------------------------------------------
async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    return await res.json();
  } catch (err) {
    console.error(`API GET ${path} failed:`, err);
    return null;
  }
}

async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`API POST ${path} failed:`, err);
    return null;
  }
}

// ------------------------------------------------------------------
// Overview Tab
// ------------------------------------------------------------------
async function loadOverview() {
  const healthData = await apiGet('/health');
  if (!healthData) return;

  const health = healthData.health || {};
  const metrics = healthData.metrics || {};
  const tasks = metrics.tasks || {};

  document.getElementById('statContainers').textContent = health?.os?.hostname ? 'N/A' : '5';
  document.getElementById('statDeployments').textContent = healthData.metrics?.requests?.total || 0;
  document.getElementById('statTasks').textContent = tasks.total || 0;
  document.getElementById('statCpu').textContent = health?.cpu?.usagePercent ? `${health.cpu.usagePercent}%` : '--';
  document.getElementById('statMemory').textContent = health?.memory?.percent ? `${health.memory.percent}%` : '--';
  document.getElementById('statUptime').textContent = health?.uptime?.formatted || '--';
  document.getElementById('overviewUptime').textContent = `Uptime: ${health?.uptime?.formatted || '--'}`;
}

// ------------------------------------------------------------------
// Deployments Tab
// ------------------------------------------------------------------
async function loadWorkflows() {
  const data = await apiGet('/deploy/workflows');
  if (!data || !data.workflows) return;

  const container = document.getElementById('workflows');
  container.innerHTML = data.workflows.map((w) => `
    <div class="workflow-card" onclick="openDeployModal('${w.id}')">
      <h4>${w.name}</h4>
      <p>${w.description}</p>
      <small style="color:var(--text-muted)">${w.steps.length} steps · ~${w.estimateSeconds}s</small>
    </div>
  `).join('');
}

async function loadDeployments() {
  const data = await apiGet('/deploy');
  if (!data || !data.deployments) return;

  const tbody = document.getElementById('deploymentTableBody');
  if (data.deployments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No deployments yet.</td></tr>';
    return;
  }

  tbody.innerHTML = data.deployments.slice(-10).reverse().map((d) => `
    <tr>
      <td><code>${d.id.substring(0, 8)}</code></td>
      <td>${d.workflow}</td>
      <td>${d.target}</td>
      <td><span class="status-badge ${d.status}">● ${d.status}</span></td>
      <td>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${d.progress}%"></div>
        </div>
        <small>${d.progress}%</small>
      </td>
      <td><button class="btn btn-secondary btn-sm" onclick="viewDeployment('${d.id}')">View</button></td>
    </tr>
  `).join('');
}

function openDeployModal(workflowId) {
  document.getElementById('deployModal').classList.add('active');
  const select = document.getElementById('modalWorkflow');
  select.innerHTML = '';
  apiGet('/deploy/workflows').then((data) => {
    if (data && data.workflows) {
      data.workflows.forEach((w) => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        if (w.id === workflowId) opt.selected = true;
        select.appendChild(opt);
      });
    }
  });
}

function closeModal() {
  document.getElementById('deployModal').classList.remove('active');
}

async function submitDeployment() {
  const workflow = document.getElementById('modalWorkflow').value;
  const target = document.getElementById('modalTarget').value;
  const branch = document.getElementById('modalBranch').value;
  const env = document.getElementById('modalEnv').value;

  await apiPost('/deploy', { workflowId: workflow, target, branch, environment: env });
  closeModal();
  loadDeployments();
}

function startDeployment() { openDeployModal('quick-deploy'); }
function viewDeployment(id) { switchTab('deploy'); }

// ------------------------------------------------------------------
// Containers Tab
// ------------------------------------------------------------------
async function loadContainers() {
  const data = await apiGet('/containers');
  if (!data) return;

  const containers = data.containers || [];
  const stats = data;

  document.getElementById('contTotal').textContent = data.total || containers.length;
  document.getElementById('contRunning').textContent = data.running || 0;
  document.getElementById('contStopped').textContent = data.stopped || 0;

  // Get stats summary
  const statsData = await apiGet('/containers/stats/summary');
  if (statsData && statsData.stats) {
    document.getElementById('contAvgCpu').textContent = `${statsData.stats.avgCpu || 0}%`;
    document.getElementById('contAvgMem').textContent = `${statsData.stats.avgMemory || 0}%`;
  }

  const tbody = document.getElementById('containerTableBody');
  if (containers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No containers detected.</td></tr>';
    return;
  }

  tbody.innerHTML = containers.map((c) => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><code>${c.image}</code></td>
      <td><span class="status-badge ${c.state === 'running' ? 'running' : 'stopped'}">● ${c.state}</span></td>
      <td>${c.stats ? `${c.stats.cpu.toFixed(1)}%` : '--'}</td>
      <td>${c.stats ? `${c.stats.memory.percent.toFixed(1)}%` : '--'}</td>
      <td>${c.status || '--'}</td>
    </tr>
  `).join('');
}

// ------------------------------------------------------------------
// Task Queue
// ------------------------------------------------------------------
async function loadTaskQueue() {
  const data = await apiGet('/tasks');
  if (!data || !data.state) return;

  const state = data.state;
  const tasks = state.tasks || {};

  document.getElementById('taskQueued').textContent = tasks.pending || 0;
  document.getElementById('taskRunning').textContent = state.running || 0;
  document.getElementById('taskCompleted').textContent = state.completed || 0;
  document.getElementById('taskFailed').textContent = state.failed || 0;

  // Recent completed
  const completedEl = document.getElementById('completedTasks');
  const completed = tasks.recentCompleted || [];
  completedEl.innerHTML = completed.length === 0
    ? '<p class="empty-state">No completed tasks</p>'
    : completed.map((t) => `
      <div class="service-item">
        <span>${t.type} <code>#${t.id?.substring(0, 8)}</code></span>
        <span class="status-badge running">● completed</span>
      </div>
    `).join('');

  // Recent failures
  const failedEl = document.getElementById('failedTasks');
  const failed = tasks.recentFailed || [];
  failedEl.innerHTML = failed.length === 0
    ? '<p class="empty-state">No failed tasks</p>'
    : failed.map((t) => `
      <div class="service-item">
        <span>${t.type} <code>#${t.id?.substring(0, 8)}</code></span>
        <span class="status-badge stopped">● ${t.error || 'failed'}</span>
      </div>
    `).join('');
}

async function addTask() {
  const type = document.getElementById('taskTypeSelect').value;
  await apiPost('/tasks', { type, data: {} });
  loadTaskQueue();
}

async function pauseQueue() { await apiPost('/tasks/pause', {}); }
async function resumeQueue() { await apiPost('/tasks/resume', {}); }

// ------------------------------------------------------------------
// Health Tab
// ------------------------------------------------------------------
async function refreshHealthTab() {
  const data = await apiGet('/health');
  if (!data || !data.health) return;

  const h = data.health;

  document.getElementById('healthCpu').textContent = h.cpu ? `${h.cpu.usagePercent}%` : '--';
  document.getElementById('healthMemory').textContent = h.memory ? `${h.memory.percent}%` : '--';
  document.getElementById('healthDisk').textContent = h.disk ? `${h.disk.usedPercent}%` : '--';
  document.getElementById('healthUptime').textContent = h.uptime?.formatted || '--';

  const sysInfo = document.getElementById('systemInfo');
  if (h.os) {
    sysInfo.innerHTML = Object.entries(h.os).map(([key, val]) => `
      <div class="info-item">
        <div class="label">${key}</div>
        <div class="value">${val}</div>
      </div>
    `).join('');
  }
}

// ------------------------------------------------------------------
// Logs Tab
// ------------------------------------------------------------------
async function loadLogFiles() {
  const data = await apiGet('/logs');
  if (!data || !data.files) return;

  const select = document.getElementById('logFileSelect');
  select.innerHTML = '<option value="">Select a log file...</option>' +
    data.files.map((f) => `<option value="${f.name}">${f.name} (${f.sizeFormatted})</option>`).join('');
}

async function loadLogs() {
  const file = document.getElementById('logFileSelect').value;
  const lines = document.getElementById('logLines').value || 50;
  const search = document.getElementById('logSearch').value;

  if (!file) {
    document.getElementById('logViewer').textContent = 'Please select a log file.';
    return;
  }

  const data = await apiGet(`/logs/${file}?lines=${lines}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
  if (!data || !data.lines) {
    document.getElementById('logViewer').textContent = 'No log data available.';
    return;
  }

  document.getElementById('logViewer').textContent = data.lines.join('\n');
}

// ------------------------------------------------------------------
// AI Agent Tab
// ------------------------------------------------------------------
async function checkAIStatus() {
  const data = await apiGet('/ai/status');
  if (data) {
    const badge = document.getElementById('aiStatus');
    if (data.simulated) {
      badge.className = 'status-badge warning';
      badge.textContent = '● Simulated Mode';
    } else {
      badge.className = 'status-badge running';
      badge.textContent = `● ${data.provider} (${data.model})`;
    }
  }
}

async function analyzeLogs() {
  const logs = document.getElementById('aiLogInput').value;
  if (!logs) return;

  const resultEl = document.getElementById('aiLogResult');
  resultEl.textContent = 'Analyzing...';

  const data = await apiPost('/ai/analyze-logs', { logs });
  if (data) {
    resultEl.textContent = data.analysis || 'No analysis generated.';
  } else {
    resultEl.textContent = 'Analysis failed.';
  }
}

async function generateDeploy() {
  const req = document.getElementById('aiDeployInput').value;
  if (!req) return;

  const resultEl = document.getElementById('aiDeployResult');
  resultEl.textContent = 'Generating...';

  const data = await apiPost('/ai/generate-deployment', { requirements: req });
  if (data) {
    resultEl.textContent = data.config || 'No configuration generated.';
  } else {
    resultEl.textContent = 'Generation failed.';
  }
}

// ------------------------------------------------------------------
// Config Tab
// ------------------------------------------------------------------
async function loadConfig() {
  const data = await apiGet('/config');
  if (data && data.config) {
    document.getElementById('configDisplay').textContent = JSON.stringify(data.config, null, 2);
  }
}