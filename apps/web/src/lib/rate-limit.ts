/**
 * Rate Limiting Utility
 *
 * Provides request rate limiting with sliding window algorithm.
 * Uses Redis (Upstash) for distributed rate limiting in production.
 * Falls back to in-memory storage when Redis is unavailable.
 *
 * Limits:
 * - General API: 100 requests/minute per IP
 * - Auth endpoints: 5 requests/minute per IP
 * - Magic link requests: 3 requests/5 minutes per email
 */

import { getRedisClient } from './redis';
import { logger } from './logger';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  limit: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting (development/single-instance fallback)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't block process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// Start cleanup on module load
startCleanup();

/**
 * Check rate limit using Redis sliding window algorithm.
 * Uses sorted sets for accurate sliding window counting.
 *
 * Algorithm:
 * 1. Remove entries outside the window (older than now - windowMs)
 * 2. Add the current request with timestamp as score
 * 3. Count total entries in the set
 * 4. Set TTL to clean up the key after the window expires
 */
async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    // Should not happen - caller should check first
    return checkRateLimitInMemory(key, maxRequests, windowMs);
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const resetAt = now + windowMs;
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  try {
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove entries older than the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add the current request
    pipeline.zadd(key, { score: now, member });

    // Count total entries in the window
    pipeline.zcard(key);

    // Set TTL slightly longer than window to allow for cleanup
    const ttlSeconds = Math.ceil(windowMs / 1000) + 1;
    pipeline.expire(key, ttlSeconds);

    const results = await pipeline.exec();

    // zcard result is the 3rd command (index 2)
    const count = (results[2] as number) ?? 1;

    return {
      success: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      reset: Math.ceil(resetAt / 1000),
      limit: maxRequests,
    };
  } catch (error) {
    // Log error and fall back to in-memory
    logger.warn('Redis rate limit error, falling back to in-memory', {
      context: 'checkRateLimitRedis',
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return checkRateLimitInMemory(key, maxRequests, windowMs);
  }
}

/**
 * Check and update rate limit using in-memory storage (fallback)
 */
function checkRateLimitInMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // If no entry or window has expired, create new window
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: maxRequests - 1,
      reset: Math.ceil(resetAt / 1000),
      limit: maxRequests,
    };
  }

  // Window still active, increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, maxRequests - entry.count);
  const success = entry.count <= maxRequests;

  return {
    success,
    remaining,
    reset: Math.ceil(entry.resetAt / 1000),
    limit: maxRequests,
  };
}

/**
 * Check rate limit with automatic Redis/in-memory selection.
 * Uses Redis when available, falls back to in-memory otherwise.
 */
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (redis) {
    return checkRateLimitRedis(`ratelimit:${key}`, maxRequests, windowMs);
  }

  return checkRateLimitInMemory(key, maxRequests, windowMs);
}

// Rate limit configurations
const RATE_LIMITS = {
  // General API: 100 requests per minute
  general: { max: 100, windowMs: 60 * 1000 },
  // Auth endpoints: 5 requests per minute
  auth: { max: 5, windowMs: 60 * 1000 },
  // Magic link: 3 requests per 5 minutes
  magicLink: { max: 3, windowMs: 5 * 60 * 1000 },
} as const;

/**
 * Rate limiter for general API requests (100/min per IP)
 */
export async function rateLimitGeneral(ip: string): Promise<RateLimitResult> {
  const key = `general:${ip}`;
  return checkRateLimit(key, RATE_LIMITS.general.max, RATE_LIMITS.general.windowMs);
}

/**
 * Rate limiter for auth attempts (5/min per IP)
 */
export async function rateLimitAuth(ip: string): Promise<RateLimitResult> {
  const key = `auth:${ip}`;
  return checkRateLimit(key, RATE_LIMITS.auth.max, RATE_LIMITS.auth.windowMs);
}

/**
 * Rate limiter for magic link requests (3/5min per email)
 */
export async function rateLimitMagicLink(email: string): Promise<RateLimitResult> {
  const key = `magiclink:${email.toLowerCase()}`;
  return checkRateLimit(key, RATE_LIMITS.magicLink.max, RATE_LIMITS.magicLink.windowMs);
}

/**
 * Synchronous rate limiter for general API requests (in-memory only).
 * Use this when you need synchronous behavior and don't need distributed limiting.
 */
export function rateLimitGeneralSync(ip: string): RateLimitResult {
  const key = `general:${ip}`;
  return checkRateLimitInMemory(key, RATE_LIMITS.general.max, RATE_LIMITS.general.windowMs);
}

/**
 * Synchronous rate limiter for auth attempts (in-memory only).
 * Use this when you need synchronous behavior and don't need distributed limiting.
 */
export function rateLimitAuthSync(ip: string): RateLimitResult {
  const key = `auth:${ip}`;
  return checkRateLimitInMemory(key, RATE_LIMITS.auth.max, RATE_LIMITS.auth.windowMs);
}

/**
 * Synchronous rate limiter for magic link requests (in-memory only).
 * Use this when you need synchronous behavior and don't need distributed limiting.
 */
export function rateLimitMagicLinkSync(email: string): RateLimitResult {
  const key = `magiclink:${email.toLowerCase()}`;
  return checkRateLimitInMemory(key, RATE_LIMITS.magicLink.max, RATE_LIMITS.magicLink.windowMs);
}

/**
 * Get client IP from request headers
 * Handles X-Forwarded-For for proxied requests
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (set by reverse proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client) from comma-separated list
    return forwardedFor.split(',')[0]?.trim() || 'anonymous';
  }

  // Check X-Real-IP header (nginx)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for direct connections
  return 'anonymous';
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(1, result.reset - Math.floor(Date.now() / 1000));

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.reset));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// For testing: reset all rate limits
export function resetRateLimits(): void {
  rateLimitStore.clear();
}

// For testing: get current store size
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}
