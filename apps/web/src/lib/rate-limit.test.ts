import { beforeEach, describe, expect, it } from 'vitest';
import {
  addRateLimitHeaders,
  createRateLimitResponse,
  getClientIp,
  getRateLimitStoreSize,
  rateLimitAuthSync,
  rateLimitGeneralSync,
  rateLimitMagicLinkSync,
  resetRateLimits,
} from './rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimits();
  });

  describe('rateLimitGeneralSync', () => {
    it('allows requests within limit (100/min)', () => {
      const ip = '192.168.1.1';

      // First request should succeed
      const result = rateLimitGeneralSync(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
      expect(result.limit).toBe(100);
    });

    it('tracks remaining requests correctly', () => {
      const ip = '192.168.1.2';

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        rateLimitGeneralSync(ip);
      }

      const result = rateLimitGeneralSync(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(94); // 100 - 6 = 94
    });

    it('blocks requests exceeding limit', () => {
      const ip = '192.168.1.3';

      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        rateLimitGeneralSync(ip);
      }

      // 101st request should fail
      const result = rateLimitGeneralSync(ip);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('tracks different IPs separately', () => {
      const ip1 = '10.0.0.1';
      const ip2 = '10.0.0.2';

      // Exhaust ip1 limit
      for (let i = 0; i < 100; i++) {
        rateLimitGeneralSync(ip1);
      }

      // ip2 should still have full quota
      const result = rateLimitGeneralSync(ip2);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });

  describe('rateLimitAuthSync', () => {
    it('allows requests within limit (5/min)', () => {
      const ip = '192.168.1.10';

      const result = rateLimitAuthSync(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('blocks requests exceeding auth limit', () => {
      const ip = '192.168.1.11';

      // Exhaust the auth limit (5 requests)
      for (let i = 0; i < 5; i++) {
        rateLimitAuthSync(ip);
      }

      // 6th request should fail
      const result = rateLimitAuthSync(ip);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('has stricter limit than general', () => {
      const ip = '192.168.1.12';

      // Auth allows only 5, general allows 100
      expect(rateLimitAuthSync(ip).limit).toBe(5);
      expect(rateLimitGeneralSync(ip).limit).toBe(100);
    });
  });

  describe('rateLimitMagicLinkSync', () => {
    it('allows requests within limit (3/5min)', () => {
      const email = 'user@example.com';

      const result = rateLimitMagicLinkSync(email);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.limit).toBe(3);
    });

    it('blocks requests exceeding magic link limit', () => {
      const email = 'test@example.com';

      // Exhaust the limit (3 requests)
      for (let i = 0; i < 3; i++) {
        rateLimitMagicLinkSync(email);
      }

      // 4th request should fail
      const result = rateLimitMagicLinkSync(email);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('normalizes email to lowercase', () => {
      const email1 = 'User@Example.COM';
      const email2 = 'user@example.com';

      // Both should share the same rate limit bucket
      rateLimitMagicLinkSync(email1);
      rateLimitMagicLinkSync(email1);
      rateLimitMagicLinkSync(email2);

      // Should be exhausted now
      const result = rateLimitMagicLinkSync(email2);
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
      rateLimitGeneralSync('ip1');
      rateLimitGeneralSync('ip2');
      rateLimitAuthSync('ip3');

      expect(getRateLimitStoreSize()).toBeGreaterThan(0);

      // Reset
      resetRateLimits();

      expect(getRateLimitStoreSize()).toBe(0);
    });
  });
});
