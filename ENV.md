# Environment Variables Reference

Required environment configuration for the Catering Event Manager.

## Quick Setup

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

## Required Variables

### Database (All Services)

```bash
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
```

### Next.js Application

```bash
# Authentication
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate unique secret
NEXTAUTH_URL="http://localhost:3000"

# Cross-service communication
SCHEDULING_SERVICE_URL="http://localhost:8080"
```

### Go Scheduling Service

```bash
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
PORT=8080
LOG_LEVEL=info                              # debug, info, warn, error
CORS_ALLOWED_ORIGINS="http://localhost:3000"
```

## Optional Variables

```bash
# Email (Resend)
RESEND_API_KEY=""
FROM_EMAIL="no-reply@example.com"

# Redis (caching)
REDIS_URL="redis://localhost:6379"

# Development
ENVIRONMENT=development      # development, staging, production
ENABLE_QUERY_LOGGING=true   # Log SQL queries (dev only)
```

## File Locations

| File | Purpose |
|------|---------|
| `/.env` | Root config (shared) |
| `/apps/web/.env.local` | Next.js overrides |
| `/apps/scheduling-service/.env` | Go service config |

## Security

**Never commit** `.env`, `.env.local`, or any file containing secrets.

Only `.env.example` (with placeholder values) should be tracked in git.

## Environment Loading Order

**Go Service** (`apps/scheduling-service`):
1. System environment variables (highest priority)
2. `.env` in scheduling-service directory
3. `../../.env` in repository root
4. Default values

**Next.js**: Standard Next.js `.env` loading (`.env.local` > `.env`)
