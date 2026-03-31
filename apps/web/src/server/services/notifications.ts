import type { db as dbClient } from '@catering-event-manager/database/client';
import {
  notificationPreferences,
  notifications,
  type notificationTypeEnum,
} from '@catering-event-manager/database/schema';
import { and, eq, inArray } from 'drizzle-orm';
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

interface UserPreference {
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

async function getUserPreference(
  db: Db,
  userId: number,
  type: NotificationType
): Promise<UserPreference> {
  try {
    const [pref] = await db
      .select({
        inAppEnabled: notificationPreferences.inAppEnabled,
        emailEnabled: notificationPreferences.emailEnabled,
      })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notificationType, type)
        )
      );
    return pref ?? { inAppEnabled: true, emailEnabled: true };
  } catch {
    return { inAppEnabled: true, emailEnabled: true };
  }
}

async function getUserPreferences(
  db: Db,
  userIds: number[],
  type: NotificationType
): Promise<Map<number, UserPreference>> {
  const defaults: UserPreference = { inAppEnabled: true, emailEnabled: true };
  if (userIds.length === 0) return new Map();

  try {
    const prefs = await db
      .select({
        userId: notificationPreferences.userId,
        inAppEnabled: notificationPreferences.inAppEnabled,
        emailEnabled: notificationPreferences.emailEnabled,
      })
      .from(notificationPreferences)
      .where(
        and(
          inArray(notificationPreferences.userId, userIds),
          eq(notificationPreferences.notificationType, type)
        )
      );

    const map = new Map<number, UserPreference>();
    for (const id of userIds) {
      map.set(id, defaults);
    }
    for (const p of prefs) {
      map.set(p.userId, { inAppEnabled: p.inAppEnabled, emailEnabled: p.emailEnabled });
    }
    return map;
  } catch {
    const map = new Map<number, UserPreference>();
    for (const id of userIds) {
      map.set(id, defaults);
    }
    return map;
  }
}

/**
 * Create a single notification. Fire-and-forget: logs errors but never throws,
 * so notification failure never blocks the calling mutation.
 *
 * Respects user preferences: skips DB insert if inAppEnabled=false,
 * sets emailPending=true if emailEnabled=true.
 */
export async function createNotification(db: Db, input: NotificationInput): Promise<void> {
  try {
    const pref = await getUserPreference(db, input.userId, input.type);

    if (!pref.inAppEnabled && !pref.emailEnabled) return;

    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      emailPending: pref.emailEnabled,
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
 *
 * Respects user preferences per-user: filters out users with inAppEnabled=false,
 * sets emailPending per user's emailEnabled preference.
 */
export async function createNotifications(db: Db, inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;

  try {
    // For batch, all inputs should share the same type (current usage pattern)
    const type = inputs[0].type;
    const userIds = [...new Set(inputs.map((i) => i.userId))];
    const prefsMap = await getUserPreferences(db, userIds, type);

    const values = inputs
      .filter((input) => {
        const pref = prefsMap.get(input.userId) ?? { inAppEnabled: true, emailEnabled: true };
        return pref.inAppEnabled || pref.emailEnabled;
      })
      .map((input) => {
        const pref = prefsMap.get(input.userId) ?? { inAppEnabled: true, emailEnabled: true };
        return {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          emailPending: pref.emailEnabled,
        };
      });

    if (values.length === 0) return;

    await db.insert(notifications).values(values);
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
