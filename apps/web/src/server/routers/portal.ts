import { z } from 'zod';
import { router, clientProcedure, publicProcedure } from '../trpc';
import {
  events,
  clients,
  tasks,
  communications,
  eventStatusLog,
  users,
} from '@catering-event-manager/database/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import type { db as DbType } from '@catering-event-manager/database/client';
import { createMagicLinkToken } from '../auth';
import { sendMagicLinkEmail } from '@/lib/email';

type Db = typeof DbType;

// Helper to verify event ownership
async function verifyEventOwnership(db: Db, eventId: number, clientId: number) {
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.clientId, clientId), eq(events.isArchived, false)),
  });

  if (!event) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
  }

  return event;
}

export const portalRouter = router({
  // Request magic link for client portal login (public - no auth required)
  requestMagicLink: publicProcedure
    .input(z.object({ email: z.string().trim().toLowerCase().email() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { email } = input;

      // Find user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      // Always return success to prevent email enumeration
      if (!user || user.role !== 'client' || !user.clientId) {
        return { success: true };
      }

      // Check if portal is enabled for this client
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, user.clientId),
      });

      if (!client?.portalEnabled) {
        return { success: true };
      }

      // Generate and send magic link (with rate limiting)
      const result = await createMagicLinkToken(email);

      // If rate limited, still return success to prevent enumeration
      // but we don't send the email
      if (!result.success) {
        return { success: true };
      }

      if (result.token) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const magicLink = `${baseUrl}/portal/login?email=${encodeURIComponent(email)}&token=${result.token}`;
        await sendMagicLinkEmail({
          to: email,
          url: magicLink,
          clientName: client.contactName || 'Valued Client',
        });
      }

      return { success: true };
    }),

  // Get summary for portal dashboard
  getSummary: clientProcedure.query(async ({ ctx }) => {
    const { db, clientId } = ctx;

    // Get client info
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    // Get active events count and list
    const activeEvents = await db
      .select({
        id: events.id,
        eventName: events.eventName,
        eventDate: events.eventDate,
        status: events.status,
        location: events.location,
        estimatedAttendees: events.estimatedAttendees,
      })
      .from(events)
      .where(and(eq(events.clientId, clientId), eq(events.isArchived, false)))
      .orderBy(asc(events.eventDate));

    return {
      client: client
        ? {
            companyName: client.companyName,
            contactName: client.contactName,
          }
        : null,
      activeEventsCount: activeEvents.length,
      events: activeEvents,
    };
  }),

  // List all events for the client
  listEvents: clientProcedure
    .input(
      z
        .object({
          status: z
            .enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up'])
            .optional(),
          includeArchived: z.boolean().default(false),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { db, clientId } = ctx;
      const { status, includeArchived, limit, offset } = input ?? {
        includeArchived: false,
        limit: 20,
        offset: 0,
      };

      // Build where conditions
      const conditions = [eq(events.clientId, clientId)];

      if (!includeArchived) {
        conditions.push(eq(events.isArchived, false));
      }

      if (status) {
        conditions.push(eq(events.status, status));
      }

      const eventsList = await db
        .select({
          id: events.id,
          eventName: events.eventName,
          eventDate: events.eventDate,
          status: events.status,
          location: events.location,
          estimatedAttendees: events.estimatedAttendees,
          isArchived: events.isArchived,
          createdAt: events.createdAt,
        })
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.eventDate))
        .limit(limit ?? 20)
        .offset(offset ?? 0);

      // Get total count for pagination
      const allEvents = await db
        .select({ id: events.id })
        .from(events)
        .where(and(...conditions));

      return {
        events: eventsList,
        total: allEvents.length,
        limit: limit ?? 20,
        offset: offset ?? 0,
      };
    }),

  // Get single event details
  getEvent: clientProcedure
    .input(z.object({ eventId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db, clientId } = ctx;

      const event = await verifyEventOwnership(db, input.eventId, clientId);

      // Get task progress
      const eventTasks = await db
        .select({ status: tasks.status })
        .from(tasks)
        .where(eq(tasks.eventId, input.eventId));

      const totalTasks = eventTasks.length;
      const completedTasks = eventTasks.filter((t) => t.status === 'completed').length;

      return {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        status: event.status,
        estimatedAttendees: event.estimatedAttendees,
        notes: event.notes,
        createdAt: event.createdAt,
        taskProgress: {
          total: totalTasks,
          completed: completedTasks,
        },
      };
    }),

  // Get event timeline (status history)
  getEventTimeline: clientProcedure
    .input(z.object({ eventId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db, clientId } = ctx;

      // Verify ownership
      await verifyEventOwnership(db, input.eventId, clientId);

      // Get status history - exclude internal details like who made the change
      const timeline = await db
        .select({
          id: eventStatusLog.id,
          oldStatus: eventStatusLog.oldStatus,
          newStatus: eventStatusLog.newStatus,
          changedAt: eventStatusLog.changedAt,
          // Note: We intentionally exclude notes and changedBy for client privacy
        })
        .from(eventStatusLog)
        .where(eq(eventStatusLog.eventId, input.eventId))
        .orderBy(asc(eventStatusLog.changedAt));

      return timeline;
    }),

  // Get tasks for an event (client-visible fields only)
  getEventTasks: clientProcedure
    .input(z.object({ eventId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db, clientId } = ctx;

      // Verify ownership
      await verifyEventOwnership(db, input.eventId, clientId);

      const now = new Date();

      const taskList = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          category: tasks.category,
          status: tasks.status,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          // Note: We exclude description, assignedTo, and internal details
        })
        .from(tasks)
        .where(eq(tasks.eventId, input.eventId))
        .orderBy(asc(tasks.dueDate));

      // Calculate overdue status for each task
      return taskList.map((task) => ({
        ...task,
        isOverdue:
          task.status !== 'completed' && task.dueDate !== null && new Date(task.dueDate) < now,
      }));
    }),

  // Get communications for an event
  getEventCommunications: clientProcedure
    .input(z.object({ eventId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db, clientId } = ctx;

      // Verify ownership
      await verifyEventOwnership(db, input.eventId, clientId);

      const communicationList = await db
        .select({
          id: communications.id,
          type: communications.type,
          subject: communications.subject,
          contactedAt: communications.contactedAt,
          // Note: We exclude internal notes for client privacy
        })
        .from(communications)
        .where(eq(communications.eventId, input.eventId))
        .orderBy(desc(communications.contactedAt));

      return communicationList;
    }),

  // Get client profile
  getProfile: clientProcedure.query(async ({ ctx }) => {
    const { db, clientId } = ctx;

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!client) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
    }

    // Return client-safe profile info (exclude internal notes)
    return {
      id: client.id,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      address: client.address,
    };
  }),
});
