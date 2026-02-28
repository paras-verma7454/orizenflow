# Deployment Guide

## Option 1: Docker Compose (Recommended for VPS)

Simple deployment using Docker Compose:

```bash
# On your VPS
chmod +x docker-deploy.sh
./docker-deploy.sh
```

Or manually:

```bash
# Build and start
docker compose build --no-cache
docker compose up -d

# Build images one by one (if build freezes)
docker compose build --no-cache api
docker compose build --no-cache web
docker compose up -d

# Or use the build script
chmod +x build-images.sh
./build-images.sh
docker compose up -d

# View logs
docker compose logs -f

# Rebuild without downtime
docker compose build --no-cache && docker compose up -d --force-recreate
```

## Option 2: Kubernetes (k3s)

Full Kubernetes deployment with k3s:

```bash
# On your VPS
chmod +x k3s-deploy.sh
./k3s-deploy.sh
```

Or manually:

```bash
# Configure kubectl
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Build images
docker compose build

# Import to k3s
docker save orizen-flow-api:latest | sudo k3s ctr images import -
docker save orizen-flow-web:latest | sudo k3s ctr images import -

# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.31.2/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv kompose /usr/local/bin/

# Convert and deploy
kompose convert -f docker-compose.yml -o k8s/
kubectl create namespace orizen-flow
kubectl create secret generic app-secrets --from-env-file=.env -n orizen-flow
kubectl apply -f k8s/ -n orizen-flow

# Check status
kubectl get all -n orizen-flow
```

## Option 3: Native Development (Local Only)

For local development without Docker:

```bash
# Install dependencies
bun install

# Start all services with Turborepo
bun dev

# Or run individual services
bun --cwd apps/api dev   # Hono API (port 4000)
bun --cwd apps/web dev   # Next.js (port 3000)
```

## Useful Commands

### Docker Compose

```bash
# View logs
docker compose logs -f [service]

# Restart service
docker compose restart [service]

# Stop all
docker compose down

# Clean rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Kubernetes (k3s)

```bash
# View logs
kubectl logs -f deployment/api -n orizen-flow

# Scale deployment
kubectl scale deployment api --replicas=3 -n orizen-flow

# Restart deployment
kubectl rollout restart deployment/api -n orizen-flow

# Delete all
kubectl delete namespace orizen-flow
```

## Environment Variables

Ensure your `.env` file contains all required variables:

```env
# Database
DATABASE_URL=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Redis
REDIS_URL=redis://redis:6379

# API
INTERNAL_API_URL=http://api:4000
```

## Ports

- Web: `3000`
- API: `4000`
- Redis: `6379`

## Troubleshooting

### Docker

```bash
# Check container status
docker compose ps

# View specific logs
docker compose logs api

# Execute shell in container
docker compose exec api sh

# Clean up
docker system prune -a --volumes
```

### Kubernetes

```bash
# Check pod status
kubectl get pods -n orizen-flow

# Describe pod
kubectl describe pod <pod-name> -n orizen-flow

# Get events
kubectl get events -n orizen-flow --sort-by='.lastTimestamp'

# Port forward
kubectl port-forward svc/web 3000:3000 -n orizen-flow
```
