import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  clients,
  communications,
  events,
  users,
} from "@catering-event-manager/database/schema";
import { eq, desc, and, lte, sql } from "drizzle-orm";

export const clientsRouter = router({
  // ============================================
  // Client CRUD Operations
  // ============================================

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(clients).orderBy(desc(clients.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [client] = await ctx.db
        .select()
        .from(clients)
        .where(eq(clients.id, input.id));
      return client;
    }),

  create: adminProcedure
    .input(
      z.object({
        companyName: z.string().min(1).max(255),
        contactName: z.string().min(1).max(255),
        email: z.string().email().max(255),
        phone: z.string().max(50).optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [client] = await ctx.db.insert(clients).values(input).returning();
      return client;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        companyName: z.string().min(1).max(255).optional(),
        contactName: z.string().min(1).max(255).optional(),
        email: z.string().email().max(255).optional(),
        phone: z.string().max(50).optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [client] = await ctx.db
        .update(clients)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(clients.id, id))
        .returning();
      return client;
    }),

  // ============================================
  // Client Events
  // ============================================

  getClientEvents: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(events)
        .where(
          and(eq(events.clientId, input.clientId), eq(events.isArchived, false))
        )
        .orderBy(desc(events.eventDate));
    }),

  // ============================================
  // Communication Management (FR-022, FR-023)
  // ============================================

  recordCommunication: adminProcedure
    .input(
      z.object({
        eventId: z.number(),
        clientId: z.number(),
        type: z.enum(["email", "phone", "meeting", "other"]),
        subject: z.string().max(255).optional(),
        notes: z.string().optional(),
        contactedAt: z.date().optional(),
        followUpDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [communication] = await ctx.db
        .insert(communications)
        .values({
          eventId: input.eventId,
          clientId: input.clientId,
          type: input.type,
          subject: input.subject,
          notes: input.notes,
          contactedAt: input.contactedAt ?? new Date(),
          contactedBy: parseInt(ctx.session.user.id, 10),
          followUpDate: input.followUpDate,
          followUpCompleted: false,
        })
        .returning();
      return communication;
    }),

  listCommunications: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const [communicationsList, countResult] = await Promise.all([
        ctx.db
          .select({
            communication: communications,
            event: {
              id: events.id,
              eventName: events.eventName,
              eventDate: events.eventDate,
            },
            contactedByUser: {
              id: users.id,
              name: users.name,
            },
          })
          .from(communications)
          .leftJoin(events, eq(communications.eventId, events.id))
          .leftJoin(users, eq(communications.contactedBy, users.id))
          .where(eq(communications.clientId, input.clientId))
          .orderBy(desc(communications.contactedAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(communications)
          .where(eq(communications.clientId, input.clientId)),
      ]);

      return {
        communications: communicationsList,
        total: countResult[0]?.count ?? 0,
      };
    }),

  scheduleFollowUp: adminProcedure
    .input(
      z.object({
        communicationId: z.number(),
        followUpDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [communication] = await ctx.db
        .update(communications)
        .set({
          followUpDate: input.followUpDate,
          followUpCompleted: false,
          updatedAt: new Date(),
        })
        .where(eq(communications.id, input.communicationId))
        .returning();
      return communication;
    }),

  completeFollowUp: protectedProcedure
    .input(z.object({ communicationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [communication] = await ctx.db
        .update(communications)
        .set({
          followUpCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(communications.id, input.communicationId))
        .returning();
      return communication;
    }),

  getDueFollowUps: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const dueFollowUps = await ctx.db
      .select({
        communication: communications,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactName: clients.contactName,
        },
        event: {
          id: events.id,
          eventName: events.eventName,
        },
      })
      .from(communications)
      .innerJoin(clients, eq(communications.clientId, clients.id))
      .innerJoin(events, eq(communications.eventId, events.id))
      .where(
        and(
          lte(communications.followUpDate, today),
          eq(communications.followUpCompleted, false)
        )
      )
      .orderBy(communications.followUpDate);

    return {
      followUps: dueFollowUps.map((item) => {
        const followUpDate = item.communication.followUpDate;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const daysOverdue = followUpDate
          ? Math.floor(
              (now.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          ...item,
          daysOverdue: Math.max(0, daysOverdue),
        };
      }),
      count: dueFollowUps.length,
    };
  }),
});
