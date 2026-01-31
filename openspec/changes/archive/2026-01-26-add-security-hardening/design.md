# Design: Security Hardening

## Overview

This design covers the implementation of rate limiting, CSRF protection, and Content Security Policy across the hybrid microservices architecture.

## Architecture Context

```
┌─────────────────────────────────────────────────────────┐
│                      Client Browser                       │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (:3000)                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │               Rate Limiter Middleware               │ │
│  │  - 100 req/min general, 5 req/min auth endpoints   │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │            CSRF Token Validation                    │ │
│  │  - Next-Auth built-in + tRPC middleware            │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │           tRPC API (/api/trpc/*)                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP (internal)
                          ▼
┌─────────────────────────────────────────────────────────┐
│               Go Scheduling Service (:8080)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │               Rate Limiter Middleware               │ │
│  │  - 200 req/min per IP (fiber/limiter)              │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Conflict Detection API                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Rate Limiting

#### Next.js tRPC Rate Limiting

**Approach:** Use `@upstash/ratelimit` with in-memory fallback for simplicity and Redis support for production.

```typescript
// apps/web/src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// In-memory store for development (no Redis needed)
const cache = new Map();

export const rateLimiter = process.env.UPSTASH_REDIS_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '1 m'),
    })
  : {
      // In-memory fallback for development
      limit: async (key: string) => {
        const now = Date.now();
        const windowMs = 60000;
        const maxRequests = 100;
        // ... sliding window implementation
      },
    };
```

**Integration Point:** Wrap the tRPC fetch handler.

```typescript
// apps/web/src/app/api/trpc/[trpc]/route.ts
import { rateLimiter } from '@/lib/rate-limit';

const handler = async (req: Request) => {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, remaining } = await rateLimiter.limit(ip);

  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }

  return fetchRequestHandler({ ... });
};
```

**Auth-Specific Rate Limiting:**

For login attempts, use a stricter limit (5/minute):

```typescript
// Stricter limit for auth endpoints
const authLimiter = new Ratelimit({
  limiter: Ratelimit.slidingWindow(5, '1 m'),
});
```

#### Go Service Rate Limiting

**Approach:** Use Fiber's built-in limiter middleware.

```go
// apps/scheduling-service/internal/api/middleware.go
import "github.com/gofiber/fiber/v3/middleware/limiter"

func RegisterMiddleware(app *fiber.App) {
    // Rate limiting - 200 requests per minute per IP
    app.Use(limiter.New(limiter.Config{
        Max:        200,
        Expiration: 1 * time.Minute,
        KeyGenerator: func(c fiber.Ctx) string {
            return c.IP()
        },
        LimitReached: func(c fiber.Ctx) error {
            return c.Status(429).JSON(fiber.Map{
                "error": "Too many requests",
            })
        },
    }))

    // ... existing middleware
}
```

### 2. CSRF Protection

#### Next-Auth CSRF

Next-Auth v5 includes built-in CSRF protection via:
1. **Double-submit cookie pattern** - CSRF token in cookie and request
2. **SameSite cookie attribute** - Prevents cross-site cookie submission

**Verification:** Ensure these are enabled (default behavior):

```typescript
// apps/web/src/server/auth.ts
export const { handlers, ... } = NextAuth({
  // CSRF protection is enabled by default in v5
  // Verify cookie settings are secure
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax', // Prevents CSRF on cross-origin
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});
```

#### tRPC Mutation Protection

tRPC mutations via POST are protected by:
1. **CORS configuration** - Only allowed origins can make requests
2. **Origin header validation** - Verify request origin matches expected domain

```typescript
// apps/web/src/app/api/trpc/[trpc]/route.ts
const validateOrigin = (req: Request): boolean => {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    'http://localhost:3000', // Development
  ].filter(Boolean);

  return !origin || allowedOrigins.includes(origin);
};
```

### 3. Content Security Policy

**CSP Header Design:**

```typescript
// apps/web/next.config.ts
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"], // Required for Next.js
  'style-src': ["'self'", "'unsafe-inline'"],  // Required for Tailwind
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'http://localhost:8080'], // Go service
  'frame-ancestors': ["'none'"], // Equivalent to X-Frame-Options: DENY
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
};
```

**Note on 'unsafe-inline':** Next.js with App Router and Tailwind requires `'unsafe-inline'` for scripts and styles due to:
- Next.js inline scripts for hydration
- Tailwind's utility classes often injected inline

**Future Enhancement:** Implement nonce-based CSP for stricter security (requires Next.js middleware to inject nonces).

## Trade-offs Considered

### Rate Limiting Storage

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| In-memory Map | Simple, no deps | Doesn't scale, lost on restart | Use for dev |
| Redis (Upstash) | Distributed, scalable | Extra dependency, cost | Use for prod |
| SQLite | Persistent | Slow for high-volume | Rejected |

**Decision:** Dual implementation - in-memory for development, Redis-compatible for production.

### CSRF Approach

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Synchronizer Token | Maximum security | Complex, requires state | Overkill |
| Double Submit Cookie | Stateless, built into Next-Auth | Slightly less secure | **Selected** |
| Custom Header | Simple | Requires client changes | Rejected |

**Decision:** Use Next-Auth's built-in double-submit cookie pattern.

### CSP Strictness

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Strict (nonce-based) | Maximum XSS protection | Complex, breaks some features | Future |
| Moderate (unsafe-inline) | Works with Next.js/Tailwind | Less strict | **Selected** |
| Report-only first | Safe to deploy | Doesn't protect | Use for testing |

**Decision:** Start with moderate CSP that works, report violations, tighten over time.

## Testing Strategy

### Rate Limiting Tests

```typescript
// Test that rate limits are enforced
it('returns 429 after exceeding rate limit', async () => {
  const requests = Array(101).fill(null).map(() =>
    fetch('/api/trpc/event.list')
  );
  const responses = await Promise.all(requests);
  const tooMany = responses.filter(r => r.status === 429);
  expect(tooMany.length).toBeGreaterThan(0);
});
```

### CSRF Tests

```typescript
// Test that CSRF protection works
it('rejects requests with invalid origin', async () => {
  const response = await fetch('/api/trpc/event.create', {
    method: 'POST',
    headers: { 'Origin': 'https://evil.com' },
    body: JSON.stringify({ ... }),
  });
  expect(response.status).toBe(403);
});
```

### Security Header Tests

```bash
# Verify headers with curl
curl -I https://app.example.com | grep -E "(Content-Security-Policy|X-Frame|X-Content)"
```

## Rollout Plan

1. **Phase 1:** Add CSP in report-only mode, monitor for violations
2. **Phase 2:** Enable rate limiting with generous limits
3. **Phase 3:** Tighten rate limits based on production traffic patterns
4. **Phase 4:** Enable strict CSP (remove unsafe-inline with nonces)

## Dependencies

**New packages required:**

- `@upstash/ratelimit` - Rate limiting library (optional, for Redis)
- `@upstash/redis` - Redis client (optional, for production)

**Go dependencies:**

- None new - use existing `fiber/middleware/limiter`
