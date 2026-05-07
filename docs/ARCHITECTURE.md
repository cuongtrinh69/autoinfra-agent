# AutoInfra Agent — Architecture Overview

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         HTTP Clients                             │
│              (Dashboard · curl · API consumers)                  │
└─────────────────┬────────────────────────────────────────────────┘
                  │  HTTP/WebSocket
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Express Server                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Middleware   │  │  API Routes  │  │   Static Files        │  │
│  │  · CORS      │  │  · /deploy   │  │   (Dashboard GUI)     │  │
│  │  · Helmet    │  │  · /contain  │  │                       │  │
│  │  · Rate Lim  │  │  · /health   │  │   index.html          │  │
│  │  · Morgan    │  │  · /tasks    │  │   styles.css          │  │
│  │  · Error H   │  │  · /ai       │  │   app.js              │  │
│  └──────────────┘  │  · /logs     │  └───────────────────────┘  │
│                     │  · /config   │                             │
│                     │  · /system   │                             │
│                     └──────┬───────┘                             │
└────────────────────────────┼─────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌────────────────┐
│  WebSocket       │ │ Task Queue   │ │ Health Monitor │
│  · Real-time     │ │ · Concurr.   │ │ · CPU/Mem/Disk │
│  · Channels      │ │ · Retry      │ │ · Alerts       │
│  · Broadcast     │ │ · Priority   │ │ · History      │
└──────────────────┘ └──────────────┘ └────────────────┘
       │                     │                  │
       ▼                     ▼                  ▼
┌──────────────────┐ ┌──────────────┐ ┌────────────────┐
│  Docker Monitor  │ │ AI Agent     │ │ Metrics        │
│  · Containers    │ │ · OpenAI     │ │ · Request Cnt  │
│  · Stats         │ │ · Claude     │ │ · Time Series  │
│  · Alerts        │ │ · Simulated  │ │ · Snapshots    │
└──────────────────┘ └──────────────┘ └────────────────┘
```

## Core Components

### 1. Express Server (`src/index.js`)
The main entry point that boots up the HTTP server, attaches WebSocket, initializes all services, and manages graceful shutdown.

### 2. Application Layer (`src/app.js`)
Configures Express middleware stack: security (helmet, CORS, rate limiting), compression, request logging, static file serving, and API routing.

### 3. Configuration System (`src/config/`)
- **loader.js**: Reads environment variables with typed defaults
- **defaults.js**: Static deployment workflows and thresholds

### 4. WebSocket Server (`src/ws/`)
Real-time event bus with channel-based subscriptions:
- `health` channel — system metrics stream
- `containers` channel — Docker container lifecycle
- `tasks` channel — task queue status updates
- `alerts` channel — system and container alerts

### 5. Task Queue (`src/services/task-queue.js`)
Concurrent task executor with:
- Priority-based scheduling
- Automatic retry with exponential backoff
- Pause/resume capabilities
- Real-time status via WebSocket

### 6. Docker Monitor (`src/services/docker-monitor.js`)
Periodically polls Docker daemon for:
- Container lifecycle events (start/stop)
- Resource usage (CPU, memory, network)
- Threshold-based alerts
- Falls back to mock data when Docker unavailable

### 7. Health Scheduler (`src/services/health-scheduler.js`)
Collects system-wide health metrics:
- CPU load averages
- Memory utilization
- Disk usage
- Network interface status
- 24-hour rolling history

### 8. AI Agent (`src/services/ai-agent.js`)
Abstraction layer for AI providers:
- OpenAI API integration
- Simulated responses when API key not set
- Log analysis, deployment generation, health analysis
- Multi-step workflow execution

### 9. Metrics Collector (`src/services/metrics.js`)
Aggregates application-level metrics:
- Request counts by endpoint
- Task statistics
- WebSocket connection tracking
- 30-second time-series snapshots

## Data Flow

```
User Request → Express Router → Route Handler → Service Layer → Response
                                                      │
                                                      ▼
                                              WebSocket Broadcast
                                                      │
                                                      ▼
                                              Dashboard Update
```

## Security Model

- Helmet for HTTP headers
- CORS with configurable origins
- Rate limiting on all `/api/*` routes
- JWT authentication for protected endpoints
- Input sanitization on all request bodies
- Path traversal protection on file-based endpoints

## Deployment Options

1. **Direct Node.js**: `npm start` or `npm run dev`
2. **Docker**: `docker-compose up -d`
3. **Process Manager**: PM2, systemd, or supervisor

## Dependencies

| Category | Libraries |
|----------|-----------|
| Server Framework | express |
| WebSocket | ws |
| Docker | dockerode |
| Logging | winston, morgan |
| Security | helmet, cors, express-rate-limit, jsonwebtoken |
| AI | axios (for OpenAI/Claude API) |
| Utilities | dotenv, uuid, chalk, compression, node-cron |
| Testing | jest, supertest |

See [ROADMAP.md](./ROADMAP.md) for planned enhancements.