import { taskTemplateItems, taskTemplates } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

// Get template by ID input
const getByIdInput = z.object({
  id: z.number().positive(),
});

export const templateRouter = router({
  // List all templates with item counts
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const templates = await db
      .select({
        id: taskTemplates.id,
        name: taskTemplates.name,
        description: taskTemplates.description,
        itemCount: sql<number>`count(${taskTemplateItems.id})::int`,
      })
      .from(taskTemplates)
      .leftJoin(taskTemplateItems, eq(taskTemplateItems.templateId, taskTemplates.id))
      .groupBy(taskTemplates.id)
      .orderBy(taskTemplates.name);

    return templates;
  }),

  // Get template with all items
  getById: protectedProcedure.input(getByIdInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, input.id));

    if (!template) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Template not found',
      });
    }

    const items = await db
      .select()
      .from(taskTemplateItems)
      .where(eq(taskTemplateItems.templateId, input.id))
      .orderBy(taskTemplateItems.sortOrder);

    return {
      ...template,
      items,
    };
  }),
});
