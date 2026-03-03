#!/bin/bash

set -euo pipefail

# Simple Docker Compose deployment without k3s

echo "=== Deploying with Docker Compose ==="

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=auto

BUILD_FLAGS=""
if [ "${CLEAN_BUILD:-0}" = "1" ]; then
	BUILD_FLAGS="--no-cache"
	echo "Clean build enabled (CLEAN_BUILD=1)"
fi

# 1. Build images one by one
echo "Building API image..."
docker compose build ${BUILD_FLAGS} api

echo "Building Web image..."
docker compose build ${BUILD_FLAGS} web

echo "Building Worker image..."
docker compose build ${BUILD_FLAGS} worker-fetch

# 2. Start core dependencies if not running
echo "Ensuring Redis is running..."
docker compose up -d redis

# 3. Recreate services one-by-one to minimize downtime
echo "Recreating API service..."
docker compose up -d --no-deps --force-recreate api

echo "Recreating Web service..."
docker compose up -d --no-deps --force-recreate web

echo "Recreating Worker Fetch service..."
docker compose up -d --no-deps --force-recreate worker-fetch

echo "Recreating Worker Browser service..."
docker compose up -d --no-deps --force-recreate worker-browser

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
echo "  docker compose logs -f worker-fetch"
echo "  docker compose logs -f worker-browser"
echo ""
echo "Rebuild without downtime:"
echo "  docker compose build --no-cache api web worker-fetch && docker compose up -d redis && docker compose up -d --no-deps --force-recreate api web worker-fetch worker-browser"
echo ""
echo "Force clean deploy build:"
echo "  CLEAN_BUILD=1 bash docker-deploy.sh"
