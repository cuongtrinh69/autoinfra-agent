#!/bin/bash
# ====================================================================
# AutoInfra Agent — API Usage Examples
# ====================================================================
# This script demonstrates common API operations using curl.
# Run against a running AutoInfra Agent instance.
# ====================================================================

BASE_URL="${1:-http://localhost:3000}"
echo "Using API base URL: $BASE_URL"
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║     AutoInfra Agent — API Examples              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 1. Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/health" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/health"
echo ""
echo ""

# 2. System Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 2. System Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/api/system/status" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/system/status"
echo ""
echo ""

# 3. List Available Workflows
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 3. Available Deployment Workflows"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/api/deploy/workflows" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/deploy/workflows"
echo ""
echo ""

# 4. Start a Deployment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 4. Start a New Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "quick-deploy",
    "target": "staging-01.example.com",
    "branch": "release/v1.2.0",
    "environment": "staging"
  }' | python -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/deploy" \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"quick-deploy","target":"staging-01.example.com","branch":"release/v1.2.0","environment":"staging"}'
echo ""
echo ""

# 5. List Containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 5. List Docker Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/api/containers" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/containers"
echo ""
echo ""

# 6. Task Queue Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 6. Task Queue Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/api/tasks" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/tasks"
echo ""
echo ""

# 7. Add a Task
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 7. Add a Task to the Queue"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{"type": "health-check", "data": {"target": "localhost"}, "priority": 1}' | python -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{"type":"health-check","data":{"target":"localhost"},"priority":1}'
echo ""
echo ""

# 8. AI Analysis
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 8. AI-Powered Log Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/ai/analyze-logs" \
  -H "Content-Type: application/json" \
  -d '{"logs": "2026-05-07 ERROR: Connection timeout to database\n2026-05-07 WARN: High memory usage detected\n2026-05-07 INFO: Health check passed"}' | python -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/ai/analyze-logs" \
  -H "Content-Type: application/json" \
  -d '{"logs":"ERROR: Connection timeout\nWARN: High memory usage\nINFO: Health check passed"}'
echo ""
echo ""

# 9. Container Stats Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 9. Container Stats Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/api/containers/stats/summary" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/containers/stats/summary"
echo ""
echo ""

# 10. Get Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 10. Active Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$BASE_URL/api/config" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/config"
echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All example requests completed."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"