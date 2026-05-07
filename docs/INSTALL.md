# AutoInfra Agent — Installation Guide

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** (optional, for container monitoring)
- **Docker Compose** (optional, for containerized deployment)
- **Git** (for cloning the repository)

## Quick Install (Linux/macOS)

```bash
# Clone the repository
git clone https://github.com/autoinfra/autoinfra-agent.git
cd autoinfra-agent

# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start the server
npm start
```

## Quick Install (Windows)

```powershell
# Clone the repository
git clone https://github.com/autoinfra/autoinfra-agent.git
cd autoinfra-agent

# Install dependencies
npm install

# Copy environment configuration
copy .env.example .env

# Generate sample log files
node scripts\generate-sample-logs.js

# Start in development mode
npm run dev
```

## Docker Installation

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop when done
docker-compose down
```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your preferences:
   - Set `SERVER_PORT` and `SERVER_HOST`
   - Configure `AI_API_KEY` for AI features
   - Adjust `LOG_LEVEL` for verbosity
   - Set `CORS_ORIGIN` for dashboard access

3. Validate your configuration:
   ```bash
   curl http://localhost:3000/api/config/validate
   ```

## Verifying Installation

```bash
# Health check
curl http://localhost:3000/health

# System info
curl http://localhost:3000/api/system/info

# Dashboard
open http://localhost:3000/dashboard
```

You should see JSON responses confirming the server is running.

## Directory Structure After Installation

```
autoinfra-agent/
├── logs/           # Application logs
├── data/           # Persistent data
├── temp/           # Temporary files
├── node_modules/   # Dependencies
├── .env            # Your configuration
└── ... (source files)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Change `SERVER_PORT` in `.env` |
| Docker not available | Agent runs in mock mode automatically |
| AI features not working | Set `AI_API_KEY` in `.env` |
| Dashboard not loading | Check `CORS_ORIGIN` setting |
| Permission denied (Linux) | Run `chmod +x scripts/*.sh` |

## Next Steps

- Read the [README.md](../README.md) for full documentation
- Check [API examples](../examples/api-usage.sh)
- Review [ARCHITECTURE.md](./ARCHITECTURE.md)
- See [ROADMAP.md](./ROADMAP.md) for planned features