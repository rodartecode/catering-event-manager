import type { NextRequest } from 'next/server';
import { handlers } from '@/server/auth';
import { rateLimitAuth, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// GET requests don't need rate limiting (CSRF tokens, callbacks, etc.)
export const { GET } = handlers;

// POST requests (login attempts) need strict rate limiting
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = await rateLimitAuth(ip);

  if (!rateLimitResult.success) {
    // Log rate-limited auth attempts for security monitoring
    logger.warn('Auth rate limit exceeded', {
      ip,
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.reset,
    });

    return new Response(
      JSON.stringify({
        error: 'TooManyRequests',
        message: 'Too many login attempts. Please wait before trying again.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.reset - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  return handlers.POST(req);
}
