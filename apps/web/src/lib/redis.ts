/**
 * Redis Client Wrapper
 *
 * Provides a lazy-initialized Upstash Redis client for distributed rate limiting.
 * Returns null when Redis is not configured, allowing fallback to in-memory storage.
 *
 * Usage:
 *   const redis = getRedisClient();
 *   if (redis) {
 *     // Use Redis for distributed operations
 *   } else {
 *     // Fall back to in-memory storage
 *   }
 */

import { Redis } from '@upstash/redis';
import { logger } from './logger';

let redis: Redis | null = null;
let initialized = false;

/**
 * Get the Redis client instance.
 * Returns null if Redis is not configured (missing env vars).
 * Client is lazily initialized on first call.
 */
export function getRedisClient(): Redis | null {
  if (initialized) {
    return redis;
  }

  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Redis not configured - this is expected in development
    return null;
  }

  try {
    redis = new Redis({
      url,
      token,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(100 * 2 ** retryCount, 1000),
      },
    });
    return redis;
  } catch (error) {
    // Failed to initialize Redis - fall back to in-memory
    logger.warn('Redis client initialization failed', {
      context: 'getRedisClient',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Check if Redis is available and configured.
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}

/**
 * Reset the Redis client (for testing purposes).
 */
export function resetRedisClient(): void {
  redis = null;
  initialized = false;
}
