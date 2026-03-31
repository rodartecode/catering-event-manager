import { db } from '@catering-event-manager/database/client';
import { notifications, users } from '@catering-event-manager/database/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { sendNotificationDigest } from '@/lib/email';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Find all notifications pending email delivery that are still unread
    const pendingNotifications = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        body: notifications.body,
        createdAt: notifications.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.userId, users.id))
      .where(and(eq(notifications.emailPending, true), isNull(notifications.readAt)))
      .orderBy(notifications.createdAt);

    if (pendingNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: { usersNotified: 0, notificationsProcessed: 0 },
      });
    }

    // Group by user
    const byUser = new Map<
      number,
      {
        email: string;
        name: string;
        items: { id: number; title: string; body: string | null; createdAt: Date }[];
      }
    >();

    for (const n of pendingNotifications) {
      if (!byUser.has(n.userId)) {
        byUser.set(n.userId, { email: n.userEmail, name: n.userName, items: [] });
      }
      byUser.get(n.userId)!.items.push({
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
      });
    }

    let usersNotified = 0;
    const allProcessedIds: number[] = [];

    for (const [, userData] of byUser) {
      try {
        await sendNotificationDigest({
          to: userData.email,
          userName: userData.name,
          notifications: userData.items,
        });
        usersNotified++;
      } catch (error) {
        logger.error(
          'Failed to send digest to user',
          error instanceof Error ? error : new Error(String(error)),
          {
            context: 'notifications-digest-cron',
            userEmail: userData.email,
          }
        );
      }

      // Mark as processed regardless of send success to avoid re-sending
      allProcessedIds.push(...userData.items.map((i) => i.id));
    }

    // Batch mark all as no longer email-pending
    if (allProcessedIds.length > 0) {
      await db
        .update(notifications)
        .set({ emailPending: false, updatedAt: new Date() })
        .where(inArray(notifications.id, allProcessedIds));
    }

    logger.info('Notification digest cron completed', {
      context: 'notifications-digest-cron',
      usersNotified,
      notificationsProcessed: allProcessedIds.length,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        usersNotified,
        notificationsProcessed: allProcessedIds.length,
      },
    });
  } catch (error) {
    logger.error(
      'Notification digest cron failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        context: 'notifications-digest-cron',
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
