import { describe, it, expect, beforeEach } from 'vitest';
import {
  rateLimitGeneral,
  rateLimitAuth,
  rateLimitMagicLink,
  resetRateLimits,
  getRateLimitStoreSize,
  getClientIp,
  createRateLimitResponse,
  addRateLimitHeaders,
} from './rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimits();
  });

  describe('rateLimitGeneral', () => {
    it('allows requests within limit (100/min)', () => {
      const ip = '192.168.1.1';

      // First request should succeed
      const result = rateLimitGeneral(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
      expect(result.limit).toBe(100);
    });

    it('tracks remaining requests correctly', () => {
      const ip = '192.168.1.2';

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        rateLimitGeneral(ip);
      }

      const result = rateLimitGeneral(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(94); // 100 - 6 = 94
    });

    it('blocks requests exceeding limit', () => {
      const ip = '192.168.1.3';

      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        rateLimitGeneral(ip);
      }

      // 101st request should fail
      const result = rateLimitGeneral(ip);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('tracks different IPs separately', () => {
      const ip1 = '10.0.0.1';
      const ip2 = '10.0.0.2';

      // Exhaust ip1 limit
      for (let i = 0; i < 100; i++) {
        rateLimitGeneral(ip1);
      }

      // ip2 should still have full quota
      const result = rateLimitGeneral(ip2);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });

  describe('rateLimitAuth', () => {
    it('allows requests within limit (5/min)', () => {
      const ip = '192.168.1.10';

      const result = rateLimitAuth(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('blocks requests exceeding auth limit', () => {
      const ip = '192.168.1.11';

      // Exhaust the auth limit (5 requests)
      for (let i = 0; i < 5; i++) {
        rateLimitAuth(ip);
      }

      // 6th request should fail
      const result = rateLimitAuth(ip);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('has stricter limit than general', () => {
      const ip = '192.168.1.12';

      // Auth allows only 5, general allows 100
      expect(rateLimitAuth(ip).limit).toBe(5);
      expect(rateLimitGeneral(ip).limit).toBe(100);
    });
  });

  describe('rateLimitMagicLink', () => {
    it('allows requests within limit (3/5min)', () => {
      const email = 'user@example.com';

      const result = rateLimitMagicLink(email);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.limit).toBe(3);
    });

    it('blocks requests exceeding magic link limit', () => {
      const email = 'test@example.com';

      // Exhaust the limit (3 requests)
      for (let i = 0; i < 3; i++) {
        rateLimitMagicLink(email);
      }

      // 4th request should fail
      const result = rateLimitMagicLink(email);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('normalizes email to lowercase', () => {
      const email1 = 'User@Example.COM';
      const email2 = 'user@example.com';

      // Both should share the same rate limit bucket
      rateLimitMagicLink(email1);
      rateLimitMagicLink(email1);
      rateLimitMagicLink(email2);

      // Should be exhausted now
      const result = rateLimitMagicLink(email2);
      expect(result.success).toBe(false);
    });
  });

  describe('getClientIp', () => {
    it('extracts IP from X-Forwarded-For header', () => {
      const request = new Request('http://localhost/api', {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
      });

      expect(getClientIp(request)).toBe('203.0.113.195');
    });

    it('extracts IP from X-Real-IP header', () => {
      const request = new Request('http://localhost/api', {
        headers: { 'x-real-ip': '198.51.100.178' },
      });

      expect(getClientIp(request)).toBe('198.51.100.178');
    });

    it('prefers X-Forwarded-For over X-Real-IP', () => {
      const request = new Request('http://localhost/api', {
        headers: {
          'x-forwarded-for': '203.0.113.195',
          'x-real-ip': '198.51.100.178',
        },
      });

      expect(getClientIp(request)).toBe('203.0.113.195');
    });

    it('returns anonymous for requests without IP headers', () => {
      const request = new Request('http://localhost/api');
      expect(getClientIp(request)).toBe('anonymous');
    });
  });

  describe('createRateLimitResponse', () => {
    it('returns 429 status code', () => {
      const result = {
        success: false,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
        limit: 100,
      };

      const response = createRateLimitResponse(result);
      expect(response.status).toBe(429);
    });

    it('includes Retry-After header', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 30;
      const result = {
        success: false,
        remaining: 0,
        reset: resetTime,
        limit: 100,
      };

      const response = createRateLimitResponse(result);
      const retryAfter = parseInt(response.headers.get('Retry-After') || '0');
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(30);
    });

    it('includes rate limit headers', () => {
      const result = {
        success: false,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
        limit: 100,
      };

      const response = createRateLimitResponse(result);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('addRateLimitHeaders', () => {
    it('adds rate limit headers to existing response', () => {
      const originalResponse = new Response('OK', { status: 200 });
      const result = {
        success: true,
        remaining: 95,
        reset: Math.floor(Date.now() / 1000) + 60,
        limit: 100,
      };

      const response = addRateLimitHeaders(originalResponse, result);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('95');
    });
  });

  describe('resetRateLimits', () => {
    it('clears all rate limit entries', () => {
      // Create some entries
      rateLimitGeneral('ip1');
      rateLimitGeneral('ip2');
      rateLimitAuth('ip3');

      expect(getRateLimitStoreSize()).toBeGreaterThan(0);

      // Reset
      resetRateLimits();

      expect(getRateLimitStoreSize()).toBe(0);
    });
  });
});
