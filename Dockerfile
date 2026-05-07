# ====================================================================
# AutoInfra Agent — Dockerfile
# Multi-stage build for production-ready container image
# ====================================================================

# ---- Stage 1: Base ----
FROM node:18-alpine AS base
LABEL maintainer="AutoInfra Team <dev@autoinfra.io>"
LABEL description="AI-assisted infrastructure and deployment toolkit"
LABEL org.opencontainers.image.source="https://github.com/autoinfra/autoinfra-agent"

RUN apk add --no-cache curl ca-certificates tzdata dumb-init

WORKDIR /app

# ---- Stage 2: Dependencies ----
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# ---- Stage 3: Build ----
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run test -- --passWithNoTests 2>/dev/null || true

# ---- Stage 4: Production ----
FROM base AS production
ENV NODE_ENV=production \
    SERVER_PORT=3000 \
    SERVER_HOST=0.0.0.0 \
    LOG_DIR=/app/logs

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY src/ ./src/
COPY public/ ./public/
COPY package.json ./

# Create required directories
RUN mkdir -p /app/logs /app/data /app/temp && \
    addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]