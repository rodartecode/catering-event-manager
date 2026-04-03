import { venues } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, gte, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { adminProcedure, protectedProcedure, router } from '../trpc';

const kitchenTypes = ['full', 'prep_only', 'warming_only', 'none'] as const;

export const venueRouter = router({
  // ============================================
  // Venue CRUD Operations
  // ============================================

  list: protectedProcedure
    .input(
      z
        .object({
          query: z.string().min(2).max(100).optional(),
          hasKitchen: z.boolean().optional(),
          minCapacity: z.number().positive().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(venues.isActive, true)];

      if (input?.query) {
        const pattern = `%${input.query}%`;
        conditions.push(or(ilike(venues.name, pattern), ilike(venues.address, pattern))!);
      }

      if (input?.hasKitchen !== undefined) {
        conditions.push(eq(venues.hasKitchen, input.hasKitchen));
      }

      if (input?.minCapacity !== undefined) {
        conditions.push(gte(venues.capacity, input.minCapacity));
      }

      return ctx.db
        .select()
        .from(venues)
        .where(and(...conditions))
        .orderBy(venues.name);
    }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const [venue] = await ctx.db.select().from(venues).where(eq(venues.id, input.id));
    if (!venue) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue not found' });
    }
    return venue;
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        address: z.string().trim().min(1),
        capacity: z.number().positive().optional(),
        hasKitchen: z.boolean().default(false),
        kitchenType: z.enum(kitchenTypes).optional(),
        equipmentAvailable: z.array(z.string().trim().min(1)).default([]),
        parkingNotes: z.string().optional(),
        loadInNotes: z.string().optional(),
        contactName: z.string().trim().max(255).optional(),
        contactPhone: z.string().max(50).optional(),
        contactEmail: z.string().trim().toLowerCase().email().max(255).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [venue] = await ctx.db.insert(venues).values(input).returning();
        return venue;
      } catch (error) {
        logger.error(
          'Failed to create venue',
          error instanceof Error ? error : new Error(String(error)),
          {
            context: 'venue.create',
          }
        );
        throw error;
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().trim().min(1).max(255).optional(),
        address: z.string().trim().min(1).optional(),
        capacity: z.number().positive().nullable().optional(),
        hasKitchen: z.boolean().optional(),
        kitchenType: z.enum(kitchenTypes).nullable().optional(),
        equipmentAvailable: z.array(z.string().trim().min(1)).optional(),
        parkingNotes: z.string().nullable().optional(),
        loadInNotes: z.string().nullable().optional(),
        contactName: z.string().trim().max(255).nullable().optional(),
        contactPhone: z.string().max(50).nullable().optional(),
        contactEmail: z.string().trim().toLowerCase().email().max(255).nullable().optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [venue] = await ctx.db
        .update(venues)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(venues.id, id))
        .returning();
      if (!venue) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue not found' });
      }
      return venue;
    }),
});
