import { db } from '@catering-event-manager/database';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Mark as dynamic since health checks require runtime database connectivity
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      },
      { status: 503 }
    );
  }
}
