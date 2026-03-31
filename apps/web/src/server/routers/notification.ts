import { notifications } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { protectedProcedure, router } from '../trpc';

const listInput = z.object({
  limit: z.number().positive().max(100).default(50),
  cursor: z.number().positive().optional(),
  unreadOnly: z.boolean().default(false),
});

const markReadInput = z.object({
  id: z.number().positive(),
});

export const notificationRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const { db, session } = ctx;
    const userId = Number.parseInt(session.user.id, 10);

    const conditions = [eq(notifications.userId, userId)];

    if (input.unreadOnly) {
      conditions.push(isNull(notifications.readAt));
    }

    if (input.cursor) {
      conditions.push(lt(notifications.id, input.cursor));
    }

    const results = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(input.limit);

    return {
      items: results.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        readAt: n.readAt,
        entityType: n.entityType,
        entityId: n.entityId,
        createdAt: n.createdAt,
      })),
      nextCursor: results.length === input.limit ? results[results.length - 1].id : undefined,
    };
  }),

  markRead: protectedProcedure.input(markReadInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;
    const userId = Number.parseInt(session.user.id, 10);

    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found' });
    }

    logger.info('Notification marked as read', {
      notificationId: input.id,
      context: 'notification.markRead',
    });

    return { id: updated.id };
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, session } = ctx;
    const userId = Number.parseInt(session.user.id, 10);

    const result = await db
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .returning({ id: notifications.id });

    logger.info('All notifications marked as read', {
      count: result.length,
      context: 'notification.markAllRead',
    });

    return { count: result.length };
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;
    const userId = Number.parseInt(session.user.id, 10);

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return { count: result?.count ?? 0 };
  }),
});
