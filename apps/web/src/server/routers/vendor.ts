import {
  events,
  eventVendors,
  vendorServiceTypeEnum,
  vendors,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { adminProcedure, protectedProcedure, router } from '../trpc';

const serviceTypes = vendorServiceTypeEnum.enumValues;

const costSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Cost must be a valid decimal with up to 2 decimal places');

export const vendorRouter = router({
  // ============================================
  // Vendor CRUD
  // ============================================

  list: protectedProcedure
    .input(
      z
        .object({
          query: z.string().min(2).max(100).optional(),
          serviceType: z.enum(serviceTypes).optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const isActiveFilter = input?.isActive ?? true;
      const conditions = [eq(vendors.isActive, isActiveFilter)];

      if (input?.query) {
        const pattern = `%${input.query}%`;
        conditions.push(
          or(
            ilike(vendors.companyName, pattern),
            ilike(vendors.contactName, pattern),
            ilike(vendors.email, pattern)
          )!
        );
      }

      if (input?.serviceType) {
        conditions.push(eq(vendors.serviceType, input.serviceType));
      }

      return ctx.db
        .select()
        .from(vendors)
        .where(and(...conditions))
        .orderBy(vendors.companyName);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const [vendor] = await ctx.db.select().from(vendors).where(eq(vendors.id, input.id));
      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' });
      }

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventVendors)
        .where(eq(eventVendors.vendorId, vendor.id));

      return { ...vendor, assignedEventCount: count };
    }),

  create: adminProcedure
    .input(
      z.object({
        companyName: z.string().trim().min(1).max(255),
        contactName: z.string().trim().max(255).optional(),
        email: z.string().trim().toLowerCase().email().max(255).optional(),
        phone: z.string().max(50).optional(),
        serviceType: z.enum(serviceTypes),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [vendor] = await ctx.db.insert(vendors).values(input).returning();
        logger.info('Vendor created', { vendorId: vendor.id, context: 'vendor.create' });
        return vendor;
      } catch (error) {
        logger.error(
          'Failed to create vendor',
          error instanceof Error ? error : new Error(String(error)),
          { context: 'vendor.create' }
        );
        throw error;
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().positive(),
        companyName: z.string().trim().min(1).max(255).optional(),
        contactName: z.string().trim().max(255).nullable().optional(),
        email: z.string().trim().toLowerCase().email().max(255).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        serviceType: z.enum(serviceTypes).optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [vendor] = await ctx.db
        .update(vendors)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(vendors.id, id))
        .returning();
      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' });
      }
      logger.info('Vendor updated', { vendorId: id, context: 'vendor.update' });
      return vendor;
    }),

  // ============================================
  // Event ↔ Vendor assignments
  // ============================================

  assignToEvent: adminProcedure
    .input(
      z.object({
        eventId: z.number().positive(),
        vendorId: z.number().positive(),
        role: z.string().trim().max(255).optional(),
        cost: costSchema.optional(),
        notes: z.string().trim().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [event] = await ctx.db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, input.eventId));
      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      const [vendor] = await ctx.db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, input.vendorId));
      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' });
      }

      const existing = await ctx.db
        .select({ id: eventVendors.id })
        .from(eventVendors)
        .where(
          and(eq(eventVendors.eventId, input.eventId), eq(eventVendors.vendorId, input.vendorId))
        );
      if (existing.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vendor is already assigned to this event',
        });
      }

      const [assignment] = await ctx.db
        .insert(eventVendors)
        .values({
          eventId: input.eventId,
          vendorId: input.vendorId,
          role: input.role ?? null,
          cost: input.cost ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      logger.info('Vendor assigned to event', {
        eventId: input.eventId,
        vendorId: input.vendorId,
        context: 'vendor.assignToEvent',
      });
      return assignment;
    }),

  updateAssignment: adminProcedure
    .input(
      z.object({
        id: z.number().positive(),
        role: z.string().trim().max(255).nullable().optional(),
        cost: costSchema.nullable().optional(),
        notes: z.string().trim().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [assignment] = await ctx.db
        .update(eventVendors)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(eventVendors.id, id))
        .returning();
      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor assignment not found' });
      }
      return assignment;
    }),

  unassignFromEvent: adminProcedure
    .input(
      z.object({
        eventId: z.number().positive(),
        vendorId: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(eventVendors)
        .where(
          and(eq(eventVendors.eventId, input.eventId), eq(eventVendors.vendorId, input.vendorId))
        )
        .returning({ id: eventVendors.id });

      if (result.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor assignment not found' });
      }

      logger.info('Vendor unassigned from event', {
        eventId: input.eventId,
        vendorId: input.vendorId,
        context: 'vendor.unassignFromEvent',
      });
      return { success: true };
    }),

  listByEvent: protectedProcedure
    .input(z.object({ eventId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: eventVendors.id,
          eventId: eventVendors.eventId,
          vendorId: eventVendors.vendorId,
          role: eventVendors.role,
          cost: eventVendors.cost,
          notes: eventVendors.notes,
          createdAt: eventVendors.createdAt,
          updatedAt: eventVendors.updatedAt,
          companyName: vendors.companyName,
          contactName: vendors.contactName,
          email: vendors.email,
          phone: vendors.phone,
          serviceType: vendors.serviceType,
        })
        .from(eventVendors)
        .innerJoin(vendors, eq(eventVendors.vendorId, vendors.id))
        .where(eq(eventVendors.eventId, input.eventId))
        .orderBy(vendors.companyName);
    }),

  listAssignmentsForVendor: protectedProcedure
    .input(z.object({ vendorId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: eventVendors.id,
          eventId: eventVendors.eventId,
          role: eventVendors.role,
          cost: eventVendors.cost,
          notes: eventVendors.notes,
          eventName: events.eventName,
          eventDate: events.eventDate,
          eventStatus: events.status,
        })
        .from(eventVendors)
        .innerJoin(events, eq(eventVendors.eventId, events.id))
        .where(eq(eventVendors.vendorId, input.vendorId))
        .orderBy(sql`${events.eventDate} DESC`);
    }),
});
