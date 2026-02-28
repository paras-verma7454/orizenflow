# Quick Reference Guide

Quick reference for common Orizen Flow development tasks.

## 🚀 Common Commands

### Development

```bash
# Start all services
bun dev

# Start individual services
bun --cwd apps/web dev    # Next.js on port 3000
bun --cwd apps/api dev    # Hono API on port 4000
bun --cwd apps/worker dev # Background worker

# Install dependencies
bun install

# Add dependency to specific app
bun --cwd apps/web add package-name
bun --cwd apps/api add package-name
```

### Database

```bash
# Create new migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (dev only, skips migrations)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio

# Reset database (DANGER: deletes all data)
bun run db:reset
```

### Build & Deploy

```bash
# Build all apps
bun run build

# Type check
bun run check-types

# Lint
bun run lint

# Format code
bun run format

# Check formatting without changes
bun run format:check
```

### Docker

```bash
# Build images sequentially (prevents freeze)
./build-images.sh

# Start with Docker Compose
docker compose up -d

# View logs
docker compose logs -f [service]

# Rebuild and restart
docker compose build --no-cache api
docker compose build --no-cache web
docker compose up -d --force-recreate

# Stop all services
docker compose down

# Clean rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Kubernetes (k3s)

```bash
# Deploy to k3s
./k3s-deploy.sh

# Manual deployment
kubectl apply -f k8s/ -n orizen-flow

# View resources
kubectl get all -n orizen-flow

# View logs
kubectl logs -f deployment/api -n orizen-flow
kubectl logs -f deployment/web -n orizen-flow

# Scale deployment
kubectl scale deployment api --replicas=3 -n orizen-flow

# Port forward for local testing
kubectl port-forward svc/web 3000:3000 -n orizen-flow
kubectl port-forward svc/api 4000:4000 -n orizen-flow

# Delete all resources
kubectl delete namespace orizen-flow
```

## 📁 File Locations

### Adding New Features

| Task               | Location                          |
| ------------------ | --------------------------------- |
| New API route      | `apps/api/src/routers/`           |
| New page           | `apps/web/src/app/`               |
| New component      | `apps/web/src/components/`        |
| New database table | `packages/db/src/schema/`         |
| New background job | `apps/worker/src/lib/`            |
| Email template     | `packages/email/src/templates.ts` |
| Environment config | `packages/config/src/`            |

### Configuration Files

| File                            | Purpose                            |
| ------------------------------- | ---------------------------------- |
| `.env`                          | Environment variables (not in git) |
| `.env.example`                  | Environment template               |
| `turbo.json`                    | Turborepo build config             |
| `docker-compose.yml`            | Docker services                    |
| `lefthook.yml`                  | Git hooks                          |
| `packages/db/drizzle.config.ts` | Drizzle ORM config                 |
| `apps/web/next.config.ts`       | Next.js config                     |

## 🔧 Troubleshooting

### Common Issues

**Port already in use**

```bash
# Find process using port
lsof -i :3000
lsof -i :4000

# Kill process
kill -9 <PID>
```

**Database connection fails**

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in .env
echo $POSTGRES_URL

# Test connection
psql $POSTGRES_URL
```

**Redis connection fails**

```bash
# Check Redis is running
redis-cli ping  # Should return "PONG"

# Start Redis (if not running)
redis-server
```

**Dependencies out of sync**

```bash
# Clean install
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
bun install
```

**Build fails**

```bash
# Clean Turborepo cache
rm -rf .turbo
rm -rf apps/*/.turbo
rm -rf packages/*/.turbo

# Clean build outputs
bun run clean

# Rebuild
bun run build
```

**Docker build freezes**

```bash
# Use sequential build script
./build-images.sh

# Or build one at a time
docker compose build --no-cache api
docker compose build --no-cache web
```

**Worker not processing jobs**

```bash
# Check Redis connection
redis-cli ping

# Check worker logs
docker compose logs -f worker
# or
bun --cwd apps/worker dev

# View queue status in Drizzle Studio
bun run db:studio
```

## 🔐 Environment Variables

### Required

```env
POSTGRES_URL=postgresql://user:password@localhost:5432/orizenflow
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=your-32-char-secret
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
HONO_APP_URL=http://localhost:4000
HONO_TRUSTED_ORIGINS=http://localhost:3000
```

### Optional

```env
SARVAM_API_KEY=xxx                    # AI evaluation
RESEND_API_KEY=xxx                    # Email
RESEND_FROM_EMAIL=noreply@domain.com
ADMIN_EMAILS=admin@domain.com         # Admin access
WORKER_CONCURRENCY=2                  # Worker threads
NEXT_PUBLIC_POSTHOG_HOST=xxx          # Analytics
NEXT_PUBLIC_POSTHOG_KEY=xxx
NEXT_PUBLIC_USERJOT_URL=xxx           # Feedback
```

## 📦 Adding Dependencies

### Frontend Package

```bash
cd apps/web
bun add package-name
# or
bun --cwd apps/web add package-name
```

### Backend Package

```bash
cd apps/api
bun add package-name
# or
bun --cwd apps/api add package-name
```

### Shared Package

```bash
cd packages/db  # or auth, config, etc.
bun add package-name
```

### Workspace-wide

```bash
# Add to root (for dev tools)
bun add -D package-name
```

## 🧪 Testing

```bash
# Run all tests (when implemented)
bun test

# Run specific test file
bun test path/to/test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## 🔄 Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit (triggers lefthook)
git commit -m "feat: add my feature"

# Push to remote
git push origin feature/my-feature

# Create PR on GitHub
```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `perf:` - Performance
- `test:` - Tests
- `chore:` - Maintenance
- `ci:` - CI/CD

## 📊 Monitoring

### Local Development

```bash
# API health check
curl http://localhost:4000/health

# View API docs
open http://localhost:4000/api/docs

# Database GUI
bun run db:studio

# Container stats
docker stats
```

### Production

```bash
# Kubernetes dashboard
kubectl get all -n orizen-flow

# View pod logs
kubectl logs -f deployment/api -n orizen-flow

# Describe pod (for errors)
kubectl describe pod <pod-name> -n orizen-flow

# Get events
kubectl get events -n orizen-flow --sort-by='.lastTimestamp'
```

## 🔗 Useful Links

- [Main README](README.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Claude Instructions](CLAUDE.md)
- [License](LICENSE.md)
- [Changelog](CHANGELOG.md)

## 💡 Tips

- Use `bun dev` for local development (fastest)
- Use Docker Compose for testing production builds
- Use k3s for actual production deployments
- Keep `.env` file secure and never commit it
- Run `bun run format` before committing
- Use `@/` imports for cleaner paths in Next.js
- Check `lefthook.yml` for pre-commit hooks
- Use Drizzle Studio for database inspection
- Enable Turborepo remote caching for faster builds
