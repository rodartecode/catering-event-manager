import { db } from '@catering-event-manager/database/client';
import { clients, communications, events } from '@catering-event-manager/database/schema';
import { and, eq, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createNotifications } from '@/server/services/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueFollowUps = await db
      .select({
        communicationId: communications.id,
        followUpDate: communications.followUpDate,
        subject: communications.subject,
        contactedBy: communications.contactedBy,
        clientId: clients.id,
        companyName: clients.companyName,
        contactName: clients.contactName,
        eventId: events.id,
        eventName: events.eventName,
      })
      .from(communications)
      .innerJoin(clients, eq(communications.clientId, clients.id))
      .innerJoin(events, eq(communications.eventId, events.id))
      .where(
        and(lte(communications.followUpDate, today), eq(communications.followUpCompleted, false))
      )
      .orderBy(communications.followUpDate);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const summary = dueFollowUps.map((item) => {
      const followUpDate = item.followUpDate;
      const daysOverdue = followUpDate
        ? Math.floor((now.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        communicationId: item.communicationId,
        subject: item.subject,
        client: {
          id: item.clientId,
          companyName: item.companyName,
          contactName: item.contactName,
        },
        event: {
          id: item.eventId,
          eventName: item.eventName,
        },
        followUpDate: item.followUpDate,
        daysOverdue: Math.max(0, daysOverdue),
        status: daysOverdue > 0 ? 'overdue' : 'due_today',
      };
    });

    const overdueCount = summary.filter((s) => s.status === 'overdue').length;
    const dueTodayCount = summary.filter((s) => s.status === 'due_today').length;

    // Create follow_up_due notifications for contacted users
    const followUpNotifications = dueFollowUps
      .filter((item): item is typeof item & { contactedBy: number } => item.contactedBy !== null)
      .map((item) => ({
        userId: item.contactedBy,
        type: 'follow_up_due' as const,
        title: `Follow-up due: ${item.subject || item.companyName}`,
        body: `Follow-up for ${item.eventName} with ${item.companyName}`,
        entityType: 'communication',
        entityId: item.communicationId,
      }));

    if (followUpNotifications.length > 0) {
      await createNotifications(db, followUpNotifications);
    }

    logger.info('Follow-up cron completed', {
      context: 'follow-ups-cron',
      total: summary.length,
      overdue: overdueCount,
      dueToday: dueTodayCount,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: summary.length,
        overdue: overdueCount,
        dueToday: dueTodayCount,
      },
      followUps: summary,
    });
  } catch (error) {
    logger.error(
      'Follow-up cron failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        context: 'follow-ups-cron',
      }
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
