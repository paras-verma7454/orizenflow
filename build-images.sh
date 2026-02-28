#!/bin/bash

# Build Docker images one by one to prevent freezing

echo "=== Building Orizen Flow Docker Images ==="

BUILD_FLAGS=""
if [ "${CLEAN_BUILD}" = "1" ]; then
    BUILD_FLAGS="--no-cache"
    echo "Clean build enabled (CLEAN_BUILD=1)"
fi

# Build API
echo ""
echo "[1/2] Building API image..."
docker compose build ${BUILD_FLAGS} api
if [ $? -eq 0 ]; then
    echo "✓ API image built successfully"
else
    echo "✗ API image build failed"
    exit 1
fi

# Build Web
echo ""
echo "[2/2] Building Web image..."
docker compose build ${BUILD_FLAGS} web
if [ $? -eq 0 ]; then
    echo "✓ Web image built successfully"
else
    echo "✗ Web image build failed"
    exit 1
fi

# Worker uses pre-built image, no build needed
echo ""
echo "=== Build Complete ==="
echo "Images built:"
echo "  - orizen-flow-api:latest"
echo "  - orizen-flow-web:latest"
echo ""
echo "To start services:"
echo "  docker compose up -d"
echo ""
echo "To force a clean rebuild:"
echo "  CLEAN_BUILD=1 bash build-images.sh"
