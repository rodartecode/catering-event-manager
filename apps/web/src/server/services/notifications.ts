import type { db as dbClient } from '@catering-event-manager/database/client';
import { notifications, type notificationTypeEnum } from '@catering-event-manager/database/schema';
import { logger } from '@/lib/logger';

type Db = typeof dbClient;
type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

interface NotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: number;
}

/**
 * Create a single notification. Fire-and-forget: logs errors but never throws,
 * so notification failure never blocks the calling mutation.
 */
export async function createNotification(db: Db, input: NotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    });
  } catch (error) {
    logger.error(
      'Failed to create notification',
      error instanceof Error ? error : new Error(String(error)),
      {
        context: 'notifications.create',
        userId: input.userId,
        type: input.type,
      }
    );
  }
}

/**
 * Create multiple notifications in batch. Fire-and-forget: logs errors but never throws.
 */
export async function createNotifications(db: Db, inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;

  try {
    await db.insert(notifications).values(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      }))
    );
  } catch (error) {
    logger.error(
      'Failed to create notifications batch',
      error instanceof Error ? error : new Error(String(error)),
      {
        context: 'notifications.createBatch',
        count: inputs.length,
      }
    );
  }
}
