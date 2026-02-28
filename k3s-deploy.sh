#!/bin/bash

# K3s Deployment Script for Orizen Flow

echo "=== Setting up k3s deployment ==="

# 1. Configure kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
export KUBECONFIG=~/.kube/config

# 2. Verify k3s
echo "Checking k3s status..."
kubectl get nodes

# 3. Build Docker images one by one
echo "Building API image..."
docker compose build --no-cache api

echo "Building Web image..."
docker compose build --no-cache web

# 4. Import images to k3s
echo "Importing images to k3s..."
docker save orizen-flow-api:latest | sudo k3s ctr images import -
docker save orizen-flow-web:latest | sudo k3s ctr images import -
docker save oven/bun:1 | sudo k3s ctr images import -

# 5. Create namespace
echo "Creating namespace..."
kubectl create namespace orizen-flow --dry-run=client -o yaml | kubectl apply -f -

# 6. Create secrets from .env
echo "Creating secrets..."
kubectl create secret generic app-secrets --from-env-file=.env -n orizen-flow --dry-run=client -o yaml | kubectl apply -f -

# 7. Install kompose if not exists
if ! command -v kompose &> /dev/null; then
    echo "Installing kompose..."
    curl -L https://github.com/kubernetes/kompose/releases/download/v1.31.2/kompose-linux-amd64 -o kompose
    chmod +x kompose
    sudo mv kompose /usr/local/bin/
fi

# 8. Convert docker-compose to k8s manifests
echo "Converting docker-compose.yml to Kubernetes manifests..."
mkdir -p k8s
kompose convert -f docker-compose.yml -o k8s/

# 9. Update imagePullPolicy to Never (for local images)
echo "Updating imagePullPolicy..."
find k8s/ -name "*.yaml" -type f -exec sed -i 's/imagePullPolicy: ""/imagePullPolicy: Never/g' {} \;

# 10. Deploy to k3s
echo "Deploying to k3s..."
kubectl apply -f k8s/ -n orizen-flow

# 11. Wait for deployments
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n orizen-flow

# 12. Show status
echo "=== Deployment Status ==="
kubectl get all -n orizen-flow

echo ""
echo "=== Access your services ==="
echo "API: http://localhost:4000"
echo "Web: http://localhost:3000"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/api -n orizen-flow"
echo "  kubectl logs -f deployment/web -n orizen-flow"
echo "  kubectl logs -f deployment/worker -n orizen-flow"
