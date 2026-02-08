# Production Deployment Guide

**Last updated**: 2026-02-01

Complete guide for deploying the catering event management system to production environments including cloud platforms, containerization, monitoring, and maintenance procedures.

## Table of Contents

- [Current Production Environment](#current-production-environment) ⬅️ **START HERE**
- [Deployment Architecture](#deployment-architecture)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Platform Guides](#cloud-platform-guides)
- [Database Setup](#database-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Security Configuration](#security-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Maintenance & Updates](#maintenance--updates)

---

## Current Production Environment

**Live deployment** (as of 2026-02):

| Service | Platform | URL/Config |
|---------|----------|------------|
| Web App | Vercel | `https://catering-dev.vercel.app` (auto-deploys from `main`) |
| Scheduler | Fly.io | App: `catering-scheduler-dev`, Region: `ord` (Chicago) |
| Database | Supabase | Project: `catering-event-manager`, Region: `us-west-2`, PostgreSQL 17.6 |

**Supabase Project Details**:
- **Project ID**: `mjcoyhnecepcizffppzq`
- **API URL**: `https://mjcoyhnecepcizffppzq.supabase.co`
- **Database Host**: `db.mjcoyhnecepcizffppzq.supabase.co`
- **Dashboard**: [Supabase Dashboard](https://supabase.com/dashboard/project/mjcoyhnecepcizffppzq)

### Production Quick Reference

#### URLs & Endpoints

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Web Application | `https://catering-dev.vercel.app` | Main application UI |
| Scheduler Service | `https://catering-scheduler-dev.fly.dev` | Go scheduling service |
| Health Check (Web) | `https://catering-dev.vercel.app/api/health` | Next.js health endpoint |
| Health Check (Scheduler) | `https://catering-scheduler-dev.fly.dev/api/v1/health` | Go service health endpoint |

#### Deployment Commands

**Next.js (Vercel)**: Automatic via GitHub integration

```bash
# Production deploy: Push to main branch
git push origin main

# Preview deploy: Create pull request
git push origin feature-branch
gh pr create --title "Feature" --body "Description"
```

**Go Scheduler (Fly.io)**: Automatic via CI pipeline on push to `main`

```bash
# Automatic deployment: Push to main branch (after build + migrations)
git push origin main
# CI runs: build → migrate → deploy-go-production (parallel with Vercel deploy)

# Manual deployment (if needed):
cd apps/scheduling-service
fly deploy

# Check deployment status
fly status

# View live logs
fly logs

# View logs with filtering
fly logs --app catering-scheduler-dev | grep -i error

# Set environment variables
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set LOG_LEVEL=info

# SSH into running machine (debugging)
fly ssh console

# Scale the service
fly scale count 2  # Run 2 instances

# Rollback to previous release
fly releases list -a catering-scheduler-dev
fly deploy --image <previous-image>  # Or revert the git commit and push
```

**CI Pipeline Dependency Graph**:
```
build ─────┬─→ migrate ─┬─→ deploy-go-production (Fly.io)
           │            └─→ deploy-production (Vercel)
           └─→ deploy-preview (PRs only)
```

**Required GitHub Secret**: `FLY_API_TOKEN` — Fly.io API token with deploy permissions for the `catering-scheduler-dev` app.

**Database (Supabase)**:

```bash
# Schema changes (run locally, affects production)
cd packages/database
DATABASE_URL="your-supabase-connection-string" pnpm db:push

# Generate and apply migrations (preferred for production)
DATABASE_URL="your-supabase-connection-string" pnpm db:migrate

# View current schema in Supabase dashboard
# https://supabase.com/dashboard/project/YOUR_PROJECT/editor
```

### Environment Variables by Platform

#### Vercel Dashboard Settings

Configure in Vercel Project Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase connection string | `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres` |
| `NEXTAUTH_SECRET` | Auth secret (32+ chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL | `https://catering-dev.vercel.app` |
| `SCHEDULING_SERVICE_URL` | Fly.io scheduler URL | `https://catering-scheduler-dev.fly.dev` |
| `RESEND_API_KEY` | Email service API key | `re_...` |
| `EMAIL_FROM` | Sender email address | `noreply@your-domain.com` |

#### Fly.io Secrets

Set via `fly secrets set`:

```bash
# Required
fly secrets set DATABASE_URL="postgresql://..."

# Optional (PORT is in fly.toml)
fly secrets set LOG_LEVEL=info
fly secrets set CORS_ALLOWED_ORIGINS="https://catering-dev.vercel.app"
```

**Note**: `PORT=8080` is already configured in `fly.toml`.

### Monitoring & Logs

| Platform | Access Method |
|----------|---------------|
| Vercel | Dashboard → Project → Deployments → Function Logs |
| Fly.io | `fly logs` or Fly.io Dashboard → Monitoring |
| Supabase | Dashboard → Project → Logs (filter by service) |

#### Quick Health Checks

```bash
# Check all services
curl -s https://catering-dev.vercel.app/api/health | jq
curl -s https://catering-scheduler-dev.fly.dev/api/v1/health | jq

# Verify database connectivity (via scheduler health)
curl -s https://catering-scheduler-dev.fly.dev/api/v1/health | jq '.database'
```

### Troubleshooting Production

#### Web App (Vercel) Issues

```bash
# View deployment logs
# Vercel Dashboard → Deployments → Click deployment → View Function Logs

# Check build output
# Vercel Dashboard → Deployments → Click deployment → Building

# Rollback to previous deployment
# Vercel Dashboard → Deployments → Click previous → Promote to Production
```

#### Scheduler (Fly.io) Issues

```bash
# Check machine status
fly status

# View recent logs (last 100 lines)
fly logs -n 100

# Check machine resources
fly scale show

# Restart the service
fly apps restart catering-scheduler-dev

# View machine metrics
fly dashboard
```

#### Database (Supabase) Issues

```bash
# Check connection from scheduler logs
fly logs | grep -i database

# Test connection locally
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" -c "SELECT 1;"

# View query performance
# Supabase Dashboard → Database → Query Performance
```

---

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web App Pods   │    │  Database Cluster │
│   (nginx/ALB)   │────│  (Next.js x3)    │────│  (PostgreSQL 17) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                │
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Scheduler Pods   │    │   Redis Cache   │
                       │   (Go x2)        │────│  (Analytics)    │
                       └──────────────────┘    └─────────────────┘
```

### Component Requirements

| Component | Min Requirements | Recommended | Instances |
|-----------|------------------|-------------|-----------|
| **Web App** (Next.js) | 1 CPU, 512MB RAM | 2 CPU, 1GB RAM | 3 |
| **Scheduler** (Go) | 0.5 CPU, 256MB RAM | 1 CPU, 512MB RAM | 2 |
| **Database** (PostgreSQL) | 2 CPU, 4GB RAM | 4 CPU, 8GB RAM | 1 (primary) |
| **Cache** (Redis) | 0.5 CPU, 256MB RAM | 1 CPU, 512MB RAM | 1 |
| **Load Balancer** | 1 CPU, 256MB RAM | 2 CPU, 512MB RAM | 2 |

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 22.04 LTS recommended)
- **Container Runtime**: Docker 24+ or Podman
- **Orchestration**: Kubernetes 1.28+ (optional but recommended)
- **Database**: PostgreSQL 15+ (17 recommended)
- **Cache**: Redis 7+ (optional but recommended for analytics)
- **SSL/TLS**: Valid SSL certificate (Let's Encrypt or commercial)
- **Domain**: Registered domain with DNS control

### Required Accounts & Services

- **Container Registry**: Docker Hub, AWS ECR, or Google Container Registry
- **DNS Provider**: Cloudflare, Route 53, or equivalent
- **SSL Provider**: Let's Encrypt (free) or commercial CA
- **Monitoring**: Grafana Cloud, DataDog, or self-hosted Prometheus

### Build Dependencies

- **Node.js**: 20 LTS
- **pnpm**: 10+
- **Go**: 1.24.0+
- **Docker**: 24+
- **kubectl**: (if using Kubernetes)

## Environment Configuration

### Production Environment Variables

Create production `.env` files:

```bash
# .env.production
NODE_ENV="production"
DATABASE_URL="postgresql://username:password@db-host:5432/catering_production"
NEXTAUTH_SECRET="your-super-secure-64-character-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"
SCHEDULING_SERVICE_URL="https://scheduler.your-domain.com"

# Redis cache (optional but recommended)
REDIS_URL="redis://redis-host:6379"
ANALYTICS_CACHE_TTL="300"
CONFLICT_CACHE_TTL="30"

# Logging
LOG_LEVEL="info"
ENABLE_REQUEST_LOGGING="true"

# Security
ALLOWED_ORIGINS="https://your-domain.com"
RATE_LIMIT_MAX="1000"
RATE_LIMIT_WINDOW="60000"

# External services
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn"
ANALYTICS_TRACKING_ID="your-analytics-id"
```

### Secrets Management

**Kubernetes Secrets:**

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: catering-secrets
  namespace: catering
type: Opaque
stringData:
  database-url: "postgresql://username:password@postgres:5432/catering_production"
  nextauth-secret: "your-super-secure-64-character-secret-key-here"
  redis-url: "redis://redis:6379"
  smtp-password: "your-smtp-password"
  sentry-dsn: "https://your-sentry-dsn"
```

**Docker Secrets:**

```bash
# Create Docker secrets
echo "your-database-url" | docker secret create db_url -
echo "your-nextauth-secret" | docker secret create nextauth_secret -
echo "your-smtp-password" | docker secret create smtp_password -
```

## Docker Deployment

### Docker Compose Production

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: catering_production
      POSTGRES_USER: catering_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    networks:
      - backend
    ports:
      - "5432:5432" # Remove in production
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U catering_user -d catering_production"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass $(cat /run/secrets/redis_password)
    volumes:
      - redis_data:/data
    networks:
      - backend
    secrets:
      - redis_password
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  scheduler:
    image: catering-scheduler:latest
    restart: unless-stopped
    environment:
      DATABASE_URL_FILE: /run/secrets/database_url
      PORT: "8080"
      LOG_LEVEL: "info"
      NODE_ENV: "production"
    networks:
      - backend
    depends_on:
      postgres:
        condition: service_healthy
    secrets:
      - database_url
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  web:
    image: catering-web:latest
    restart: unless-stopped
    environment:
      DATABASE_URL_FILE: /run/secrets/database_url
      NEXTAUTH_SECRET_FILE: /run/secrets/nextauth_secret
      NEXTAUTH_URL: "https://your-domain.com"
      SCHEDULING_SERVICE_URL: "http://scheduler:8080"
      REDIS_URL_FILE: /run/secrets/redis_url
      NODE_ENV: "production"
    ports:
      - "3000:3000"
    networks:
      - frontend
      - backend
    depends_on:
      postgres:
        condition: service_healthy
      scheduler:
        condition: service_healthy
    secrets:
      - database_url
      - nextauth_secret
      - redis_url
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - frontend
    depends_on:
      - web
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  frontend:
    driver: overlay
    attachable: true
  backend:
    driver: overlay
    internal: true

secrets:
  db_password:
    external: true
  database_url:
    external: true
  nextauth_secret:
    external: true
  redis_password:
    external: true
  redis_url:
    external: true
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    upstream scheduler {
        server scheduler:8080;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=web:10m rate=300r/m;

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript;

        # API routes to scheduler service
        location /api/v1/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://scheduler;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Web application
        location / {
            limit_req zone=web burst=50 nodelay;
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support for real-time updates
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Static assets caching
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://web;
        }
    }
}
```

### Build & Deployment Script

```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e

echo "🚀 Starting production deployment..."

# Configuration
REGISTRY="your-registry.com"
PROJECT="catering-event-manager"
VERSION="${1:-$(git rev-parse --short HEAD)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if all required tools are available
command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { log_error "pnpm is required but not installed."; exit 1; }
command -v go >/dev/null 2>&1 || { log_error "Go is required but not installed."; exit 1; }

# Check if we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    log_warn "You're not on the main branch. Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    log_error "You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Run tests
log_info "Running tests..."
pnpm test
if [ $? -ne 0 ]; then
    log_error "Tests failed. Deployment aborted."
    exit 1
fi

# Build and push web application
log_info "Building web application..."
docker build -f Dockerfile.web -t $REGISTRY/$PROJECT-web:$VERSION .
docker build -f Dockerfile.web -t $REGISTRY/$PROJECT-web:latest .

log_info "Building Go scheduler service..."
docker build -f Dockerfile.scheduler -t $REGISTRY/$PROJECT-scheduler:$VERSION ./apps/scheduling-service
docker build -f Dockerfile.scheduler -t $REGISTRY/$PROJECT-scheduler:latest ./apps/scheduling-service

# Push to registry
log_info "Pushing images to registry..."
docker push $REGISTRY/$PROJECT-web:$VERSION
docker push $REGISTRY/$PROJECT-web:latest
docker push $REGISTRY/$PROJECT-scheduler:$VERSION
docker push $REGISTRY/$PROJECT-scheduler:latest

# Deploy to production
log_info "Deploying to production..."

# Update docker-compose files with new version
sed -i "s|image: catering-web:.*|image: $REGISTRY/$PROJECT-web:$VERSION|g" docker-compose.production.yml
sed -i "s|image: catering-scheduler:.*|image: $REGISTRY/$PROJECT-scheduler:$VERSION|g" docker-compose.production.yml

# Deploy using Docker Swarm or Docker Compose
if docker node ls >/dev/null 2>&1; then
    # Docker Swarm deployment
    log_info "Deploying to Docker Swarm..."
    docker stack deploy -c docker-compose.production.yml catering
else
    # Docker Compose deployment
    log_info "Deploying with Docker Compose..."
    docker-compose -f docker-compose.production.yml pull
    docker-compose -f docker-compose.production.yml up -d
fi

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 30

# Health checks
log_info "Performing health checks..."

# Check web application
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    log_info "✅ Web application is healthy"
else
    log_error "❌ Web application health check failed"
    exit 1
fi

# Check scheduler service
if curl -f http://localhost:8080/api/v1/health >/dev/null 2>&1; then
    log_info "✅ Scheduler service is healthy"
else
    log_error "❌ Scheduler service health check failed"
    exit 1
fi

# Run database migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.production.yml exec web pnpm db:migrate

# Tag this deployment
git tag "deploy-$VERSION-$(date +%Y%m%d-%H%M%S)"
git push origin --tags

log_info "🎉 Deployment completed successfully!"
log_info "Version: $VERSION"
log_info "Web: https://your-domain.com"
log_info "Scheduler: https://scheduler.your-domain.com"
```

## Kubernetes Deployment

### Namespace and RBAC

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: catering
  labels:
    name: catering
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: catering-sa
  namespace: catering
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: catering
  name: catering-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: catering-binding
  namespace: catering
subjects:
- kind: ServiceAccount
  name: catering-sa
  namespace: catering
roleRef:
  kind: Role
  name: catering-role
  apiGroup: rbac.authorization.k8s.io
```

### Database Deployment

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: catering
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:17-alpine
        env:
        - name: POSTGRES_DB
          value: "catering_production"
        - name: POSTGRES_USER
          value: "catering_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: catering-secrets
              key: postgres-password
        - name: PGDATA
          value: "/var/lib/postgresql/data/pgdata"
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - catering_user
            - -d
            - catering_production
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - catering_user
            - -d
            - catering_production
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
      storageClassName: fast-ssd
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: catering
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

### Application Deployments

```yaml
# k8s/scheduler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scheduler
  namespace: catering
spec:
  replicas: 2
  selector:
    matchLabels:
      app: scheduler
  template:
    metadata:
      labels:
        app: scheduler
    spec:
      serviceAccountName: catering-sa
      containers:
      - name: scheduler
        image: your-registry.com/catering-scheduler:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: catering-secrets
              key: database-url
        - name: PORT
          value: "8080"
        - name: LOG_LEVEL
          value: "info"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: scheduler
  namespace: catering
spec:
  selector:
    app: scheduler
  ports:
  - port: 8080
    targetPort: 8080
```

```yaml
# k8s/web.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: catering
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      serviceAccountName: catering-sa
      containers:
      - name: web
        image: your-registry.com/catering-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: catering-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: catering-secrets
              key: nextauth-secret
        - name: NEXTAUTH_URL
          value: "https://your-domain.com"
        - name: SCHEDULING_SERVICE_URL
          value: "http://scheduler:8080"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: catering
spec:
  selector:
    app: web
  ports:
  - port: 3000
    targetPort: 3000
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: catering-ingress
  namespace: catering
  annotations:
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: catering-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: scheduler
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 3000
```

### Deployment Commands

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/scheduler.yaml
kubectl apply -f k8s/web.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -n catering
kubectl get services -n catering
kubectl get ingress -n catering

# View logs
kubectl logs -f deployment/web -n catering
kubectl logs -f deployment/scheduler -n catering

# Scale deployments
kubectl scale deployment web --replicas=5 -n catering
kubectl scale deployment scheduler --replicas=3 -n catering
```

## Cloud Platform Guides

### AWS Deployment

#### ECS Fargate

```yaml
# aws/task-definition.json
{
  "family": "catering-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "your-account.dkr.ecr.region.amazonaws.com/catering-web:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXTAUTH_URL",
          "value": "https://your-domain.com"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:catering/database-url"
        },
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:catering/nextauth-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/catering-web",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier catering-production \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 17.2 \
  --master-username catering_admin \
  --master-user-password $(aws secretsmanager get-random-password --password-length 32 --exclude-characters "\"@/\\" --output text --query RandomPassword) \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name catering-db-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --auto-minor-version-upgrade
```

### Google Cloud Platform

#### Cloud Run

```yaml
# gcp/web-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: catering-web
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/execution-environment: gen2
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      serviceAccountName: catering-service-account@project.iam.gserviceaccount.com
      containers:
      - image: gcr.io/project/catering-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: catering-secrets
              key: database-url
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
        startupProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 0
          timeoutSeconds: 1
          periodSeconds: 3
          successThreshold: 1
          failureThreshold: 3
```

#### Cloud SQL PostgreSQL

```bash
# Create Cloud SQL instance
gcloud sql instances create catering-production \
  --database-version=POSTGRES_17 \
  --tier=db-custom-2-8192 \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --deletion-protection

# Create database and user
gcloud sql databases create catering_production --instance=catering-production
gcloud sql users create catering_user --instance=catering-production --password=$(openssl rand -base64 32)
```

### Azure Deployment

#### Container Instances

```yaml
# azure/container-group.yaml
apiVersion: '2021-03-01'
location: East US
name: catering-container-group
properties:
  containers:
  - name: web
    properties:
      image: your-registry.azurecr.io/catering-web:latest
      resources:
        requests:
          cpu: 1.0
          memoryInGb: 2.0
      ports:
      - port: 3000
        protocol: TCP
      environmentVariables:
      - name: NODE_ENV
        value: production
      - name: NEXTAUTH_URL
        value: https://your-domain.com
      - name: DATABASE_URL
        secureValue: postgresql://user:pass@host:5432/db
  - name: scheduler
    properties:
      image: your-registry.azurecr.io/catering-scheduler:latest
      resources:
        requests:
          cpu: 0.5
          memoryInGb: 1.0
      ports:
      - port: 8080
        protocol: TCP
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
    - port: 80
      protocol: TCP
    - port: 443
      protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

## Database Setup

### PostgreSQL Configuration

```sql
-- Production PostgreSQL configuration
-- /etc/postgresql/17/main/postgresql.conf

# Memory settings
shared_buffers = 256MB                    # 25% of total RAM
effective_cache_size = 1GB                # 75% of total RAM
work_mem = 64MB                           # For sorting/joining
maintenance_work_mem = 256MB              # For VACUUM, CREATE INDEX

# Write-ahead logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 80MB

# Performance
random_page_cost = 1.1                    # For SSD storage
effective_io_concurrency = 200            # For SSD storage
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Logging
log_min_duration_statement = 1000         # Log slow queries (>1s)
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_statement = 'ddl'                     # Log schema changes

# Statistics
track_activity_query_size = 2048
track_functions = all
track_io_timing = on
```

### Database Initialization

```sql
-- init.sql - Database initialization script

-- Create database and user
CREATE DATABASE catering_production;
CREATE USER catering_user WITH ENCRYPTED PASSWORD 'secure-password-here';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE catering_production TO catering_user;

-- Connect to the database
\c catering_production;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO catering_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO catering_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO catering_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO catering_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO catering_user;
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Automated backup script

BACKUP_DIR="/backup"
DB_NAME="catering_production"
DB_USER="catering_user"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"

    # Upload to cloud storage (AWS S3 example)
    aws s3 cp $BACKUP_FILE s3://your-backup-bucket/postgres/

    # Clean up local backups older than 7 days
    find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete
else
    echo "Backup failed!"
    exit 1
fi
```

## Monitoring & Logging

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'catering-web'
    static_configs:
      - targets: ['web:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'catering-scheduler'
    static_configs:
      - targets: ['scheduler:8080']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 15s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Alert Rules

```yaml
# monitoring/alert_rules.yml
groups:
- name: catering_alerts
  rules:
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }}s"

  - alert: ConflictDetectionSlow
    expr: histogram_quantile(0.95, rate(conflict_detection_duration_seconds_bucket[5m])) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Conflict detection is slow"
      description: "95th percentile conflict detection time is {{ $value }}s"

  - alert: DatabaseConnectionFailure
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Database is down"
      description: "PostgreSQL database is not responding"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Catering Event Manager",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{job}} - {{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Conflict Detection Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(conflict_detection_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

### Logging Configuration

```yaml
# logging/fluentd.conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<filter catering.**>
  @type parser
  key_name log
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S.%L%z
  </parse>
</filter>

<match catering.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name catering-logs
  type_name _doc
  logstash_format true
  logstash_prefix catering
  logstash_dateformat %Y.%m.%d
  flush_interval 10s
</match>
```

## Security Configuration

### SSL/TLS Setup

```bash
# Let's Encrypt certificate generation
certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d scheduler.your-domain.com

# Auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Security Headers

```nginx
# Security headers in nginx.conf
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; manifest-src 'self';" always;
```

### Network Security

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: catering-network-policy
  namespace: catering
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: scheduler
    ports:
    - protocol: TCP
      port: 8080
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_USER: postgres
          POSTGRES_DB: catering_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 10

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Type check
      run: pnpm type-check

    - name: Run tests
      run: pnpm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/catering_test

    - name: Setup Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.24'

    - name: Test Go service
      run: |
        cd apps/scheduling-service
        go test ./...

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-web: ${{ steps.image-web.outputs.image }}
      image-scheduler: ${{ steps.image-scheduler.outputs.image }}

    steps:
    - uses: actions/checkout@v4

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata (tags, labels) for web
      id: meta-web
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-web

    - name: Build and push web image
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Dockerfile.web
        push: true
        tags: ${{ steps.meta-web.outputs.tags }}
        labels: ${{ steps.meta-web.outputs.labels }}

    - name: Extract metadata (tags, labels) for scheduler
      id: meta-scheduler
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-scheduler

    - name: Build and push scheduler image
      uses: docker/build-push-action@v4
      with:
        context: ./apps/scheduling-service
        file: ./apps/scheduling-service/Dockerfile
        push: true
        tags: ${{ steps.meta-scheduler.outputs.tags }}
        labels: ${{ steps.meta-scheduler.outputs.labels }}

    - name: Output image names
      id: image-web
      run: echo "image=${{ steps.meta-web.outputs.tags }}" >> $GITHUB_OUTPUT

    - name: Output scheduler image
      id: image-scheduler
      run: echo "image=${{ steps.meta-scheduler.outputs.tags }}" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production

    steps:
    - name: Deploy to Kubernetes
      run: |
        # Update Kubernetes manifests with new images
        kubectl set image deployment/web web=${{ needs.build.outputs.image-web }} -n catering
        kubectl set image deployment/scheduler scheduler=${{ needs.build.outputs.image-scheduler }} -n catering

        # Wait for rollout to complete
        kubectl rollout status deployment/web -n catering --timeout=600s
        kubectl rollout status deployment/scheduler -n catering --timeout=600s

    - name: Run smoke tests
      run: |
        # Wait for services to be ready
        sleep 30

        # Test web application
        curl -f https://your-domain.com/api/health

        # Test scheduler service
        curl -f https://scheduler.your-domain.com/api/v1/health

        echo "Deployment completed successfully!"
```

## Maintenance & Updates

### Rolling Updates

```bash
#!/bin/bash
# rolling-update.sh

set -e

echo "Starting rolling update..."

# Update images
kubectl set image deployment/web web=your-registry.com/catering-web:v2.0.0 -n catering
kubectl set image deployment/scheduler scheduler=your-registry.com/catering-scheduler:v2.0.0 -n catering

# Monitor rollout
kubectl rollout status deployment/web -n catering --timeout=600s
kubectl rollout status deployment/scheduler -n catering --timeout=600s

# Verify deployment
kubectl get pods -n catering
kubectl get services -n catering

# Run post-deployment tests
echo "Running post-deployment verification..."
curl -f https://your-domain.com/api/health
curl -f https://scheduler.your-domain.com/api/v1/health

echo "Rolling update completed successfully!"
```

### Database Migrations

```bash
#!/bin/bash
# migrate.sh - Safe database migration script

set -e

echo "Starting database migration..."

# Create backup before migration
./backup.sh

# Run migrations in a transaction
kubectl exec -it deployment/web -n catering -- pnpm db:migrate

# Verify migration
kubectl exec -it deployment/postgres -n catering -- psql -U catering_user -d catering_production -c "SELECT version();"

echo "Database migration completed successfully!"
```

### Monitoring & Alerting

```bash
#!/bin/bash
# health-check.sh - Comprehensive health monitoring

set -e

ENDPOINTS=(
  "https://your-domain.com/api/health"
  "https://scheduler.your-domain.com/api/v1/health"
)

FAILED=0

for endpoint in "${ENDPOINTS[@]}"; do
  if curl -f --max-time 10 "$endpoint" >/dev/null 2>&1; then
    echo "✅ $endpoint is healthy"
  else
    echo "❌ $endpoint is unhealthy"
    FAILED=1
  fi
done

# Check database connectivity
if kubectl exec deployment/postgres -n catering -- pg_isready -U catering_user >/dev/null 2>&1; then
  echo "✅ Database is healthy"
else
  echo "❌ Database is unhealthy"
  FAILED=1
fi

# Check resource usage
kubectl top pods -n catering

if [ $FAILED -eq 1 ]; then
  echo "❌ Health check failed!"
  exit 1
else
  echo "✅ All systems healthy"
fi
```

---

This deployment guide should be updated as the application evolves and new deployment patterns emerge. Always test deployments in staging environments before applying to production.