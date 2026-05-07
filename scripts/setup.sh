#!/bin/bash
# ====================================================================
# AutoInfra Agent — Automated Setup Script
# ====================================================================
# This script installs dependencies, creates required directories,
# copies the .env.example to .env, and prepares the project for use.
# ====================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════╗"
echo "║     AutoInfra Agent — Setup Script            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js >= 18 is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm $(npm -v) detected"

# Navigate to project directory
cd "$PROJECT_DIR"

# Create directories
echo ""
echo "📁 Creating required directories..."
mkdir -p logs data temp
echo "✅ Directories created: logs/, data/, temp/"

# Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"

# Setup .env
echo ""
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
    echo "   ⚠️  Please edit .env and set your configuration values."
else
    echo "ℹ️  .env already exists, skipping"
fi

# Run health check
echo ""
echo "🔍 Running setup health check..."
echo ""

cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                    Setup Complete! 🎉                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   Quick Start:                                                ║
║   ─────────────                                              ║
║   npm run dev      → Start in development mode                ║
║   npm start        → Start in production mode                 ║
║   npm run docker   → Start with Docker Compose                ║
║                                                               ║
║   Dashboard:       http://localhost:3000/dashboard            ║
║   Health Check:    http://localhost:3000/health               ║
║   API Docs:        http://localhost:3000/api/system/info      ║
║   WebSocket:       ws://localhost:3001/ws                     ║
║                                                               ║
║   Configuration:   Edit .env to customize your setup          ║
║   Logs:            ./logs/ directory                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF