#!/bin/bash

set -euo pipefail

# Simple Docker Compose deployment without k3s

echo "=== Deploying with Docker Compose ==="

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

BUILD_FLAGS=""
if [ "${CLEAN_BUILD:-0}" = "1" ]; then
	BUILD_FLAGS="--no-cache"
	echo "Clean build enabled (CLEAN_BUILD=1)"
fi

# 1. Stop existing containers
echo "Stopping existing containers..."
docker compose down

# 2. Build images one by one
echo "Building API image..."
docker compose build ${BUILD_FLAGS} --progress=plain api

echo "Building Web image..."
docker compose build ${BUILD_FLAGS} --progress=plain web

# 3. Start services
echo "Starting services..."
docker compose up -d

# 4. Wait a moment for services to start
sleep 5

# 5. Show status
echo "=== Deployment Status ==="
docker compose ps

echo ""
echo "=== Logs ==="
docker compose logs --tail=50

echo ""
echo "=== Access your services ==="
echo "Public site (via proxy): http://localhost"
echo "Maintenance fallback page is served automatically if web/api is unavailable"
echo "API: http://localhost:4000"
echo "Web: http://localhost:3000"
echo "Redis: localhost:6379"
echo ""
echo "View logs:"
echo "  docker compose logs -f api"
echo "  docker compose logs -f web"
echo "  docker compose logs -f worker"
echo ""
echo "Rebuild without downtime:"
echo "  docker compose build --no-cache && docker compose up -d --force-recreate"
echo ""
echo "Force clean deploy build:"
echo "  CLEAN_BUILD=1 bash docker-deploy.sh"
