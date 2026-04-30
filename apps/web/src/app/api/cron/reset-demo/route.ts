import { seedDemo } from '@catering-event-manager/database/seed-demo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Wipes the demo database and reseeds it with showcase data.
 * Triggered weekly by Vercel Cron (see apps/web/vercel.json).
 *
 * Hard guards:
 *  - Authorization Bearer must match CRON_SECRET
 *  - DEMO_RESET_ALLOWED must be "true" (set only on the demo deployment)
 *  - NEXT_PUBLIC_IS_DEMO must be "true"
 *
 * Both flag guards are required so a misconfigured staging or production
 * deploy that accidentally inherits CRON_SECRET still cannot wipe its DB.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.DEMO_RESET_ALLOWED !== 'true' || process.env.NEXT_PUBLIC_IS_DEMO !== 'true') {
    logger.warn('reset-demo cron blocked by environment guard', {
      context: 'reset-demo-cron',
      demoResetAllowed: process.env.DEMO_RESET_ALLOWED ?? 'unset',
      nextPublicIsDemo: process.env.NEXT_PUBLIC_IS_DEMO ?? 'unset',
    });
    return NextResponse.json(
      { error: 'Demo reset not allowed in this environment' },
      { status: 403 }
    );
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }

  const startedAt = Date.now();
  try {
    const result = await seedDemo(connectionString);
    const durationMs = Date.now() - startedAt;

    logger.info('Demo database reset complete', {
      context: 'reset-demo-cron',
      durationMs,
      ...result,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      seeded: result,
    });
  } catch (error) {
    logger.error(
      'Demo database reset failed',
      error instanceof Error ? error : new Error(String(error)),
      { context: 'reset-demo-cron' }
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
