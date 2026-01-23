/**
 * Simple in-memory cache for analytics queries
 * TTL: 5 minutes (300,000 ms)
 * SC-005: Report generation <10 seconds
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry<unknown>>();

// Cleanup interval to remove expired entries
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
      }
    }
  }, 60000); // Check every minute
}

function hashInput(input: unknown): string {
  return JSON.stringify(input);
}

export function getCacheKey(queryName: string, input: unknown): string {
  return `${queryName}:${hashInput(input)}`;
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setInCache<T>(key: string, data: T): void {
  startCleanup();
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
