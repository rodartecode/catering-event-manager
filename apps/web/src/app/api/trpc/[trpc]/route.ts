import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { logger } from '@/lib/logger';
import {
  addRateLimitHeaders,
  createRateLimitResponse,
  getClientIp,
  rateLimitGeneral,
} from '@/lib/rate-limit';
import { appRouter } from '@/server/routers/_app';
import { createTRPCContext } from '@/server/trpc';

/**
 * Validate request origin for CSRF protection (SEC-004)
 * Rejects POST requests from unauthorized origins
 */
function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');

  // No origin header is acceptable (same-origin requests, non-browser clients)
  if (!origin) {
    return true;
  }

  // List of allowed origins
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    'http://localhost:3000', // Development
    'http://127.0.0.1:3000', // Development alternative
  ].filter(Boolean) as string[];

  return allowedOrigins.some((allowed) => origin === allowed);
}

const handler = async (req: Request) => {
  // Apply rate limiting
  const ip = getClientIp(req);
  const rateLimitResult = await rateLimitGeneral(ip);

  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  // Validate origin for POST requests (mutations) - CSRF protection
  if (req.method === 'POST' && !validateOrigin(req)) {
    logger.warn('CSRF: Invalid origin rejected', {
      origin: req.headers.get('origin'),
      ip,
    });

    return new Response(
      JSON.stringify({
        error: 'Forbidden',
        message: 'Invalid request origin',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Process the tRPC request
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

  // Add rate limit headers to response
  return addRateLimitHeaders(response, rateLimitResult);
};

export { handler as GET, handler as POST };
