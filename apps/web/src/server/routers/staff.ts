import {
  resources,
  staffAvailability,
  staffSkills,
  users,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../trpc';

const staffSkillValues = [
  'food_safety_cert',
  'bartender',
  'sommelier',
  'lead_chef',
  'sous_chef',
  'prep_cook',
  'pastry_chef',
  'server',
  'event_coordinator',
  'barista',
] as const;

const staffSkillEnum = z.enum(staffSkillValues);

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeString = z.string().regex(timeRegex, 'Must be HH:MM format (00:00-23:59)');

// Input schemas
const getSkillsInput = z.object({
  userId: z.number().positive(),
});

const updateSkillsInput = z.object({
  userId: z.number().positive(),
  skills: z.array(
    z.object({
      skill: staffSkillEnum,
      certifiedAt: z.coerce.date().optional(),
      expiresAt: z.coerce.date().optional(),
    })
  ),
});

const getAvailabilityInput = z.object({
  userId: z.number().positive(),
});

const setAvailabilityInput = z.object({
  userId: z.number().positive(),
  slots: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: timeString,
      endTime: timeString,
    })
  ),
});

const findAvailableInput = z.object({
  skills: z.array(staffSkillEnum).optional(),
  date: z.coerce.date().optional(),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
});

const linkUserToResourceInput = z.object({
  userId: z.number().positive(),
  resourceId: z.number().positive(),
});

const getStaffListInput = z.object({
  query: z.string().min(2).max(100).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
});

const getStaffProfileInput = z.object({
  resourceId: z.number().positive(),
});

export const staffRouter = router({
  // Get skills for a user
  getSkills: protectedProcedure.input(getSkillsInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const skills = await db
      .select({
        userId: staffSkills.userId,
        skill: staffSkills.skill,
        certifiedAt: staffSkills.certifiedAt,
        expiresAt: staffSkills.expiresAt,
        createdAt: staffSkills.createdAt,
      })
      .from(staffSkills)
      .where(eq(staffSkills.userId, input.userId))
      .orderBy(staffSkills.skill);

    return skills;
  }),

  // Replace user's skills (delete-all + insert)
  updateSkills: adminProcedure.input(updateSkillsInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    // Delete all existing skills and insert new ones in a transaction
    await db.transaction(async (tx) => {
      await tx.delete(staffSkills).where(eq(staffSkills.userId, input.userId));

      if (input.skills.length > 0) {
        await tx.insert(staffSkills).values(
          input.skills.map((s) => ({
            userId: input.userId,
            skill: s.skill,
            certifiedAt: s.certifiedAt ?? null,
            expiresAt: s.expiresAt ?? null,
          }))
        );
      }
    });

    // Return updated skills
    const updated = await db
      .select()
      .from(staffSkills)
      .where(eq(staffSkills.userId, input.userId))
      .orderBy(staffSkills.skill);

    return updated;
  }),

  // Get weekly availability for a user
  getAvailability: protectedProcedure.input(getAvailabilityInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const slots = await db
      .select({
        id: staffAvailability.id,
        userId: staffAvailability.userId,
        dayOfWeek: staffAvailability.dayOfWeek,
        startTime: staffAvailability.startTime,
        endTime: staffAvailability.endTime,
        isRecurring: staffAvailability.isRecurring,
      })
      .from(staffAvailability)
      .where(eq(staffAvailability.userId, input.userId))
      .orderBy(staffAvailability.dayOfWeek, staffAvailability.startTime);

    return slots;
  }),

  // Replace user's weekly availability (delete-all + insert)
  setAvailability: adminProcedure.input(setAvailabilityInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    // Validate: endTime must be after startTime
    for (const slot of input.slots) {
      if (slot.endTime <= slot.startTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `End time (${slot.endTime}) must be after start time (${slot.startTime})`,
        });
      }
    }

    // Delete all existing slots and insert new ones
    await db.transaction(async (tx) => {
      await tx.delete(staffAvailability).where(eq(staffAvailability.userId, input.userId));

      if (input.slots.length > 0) {
        await tx.insert(staffAvailability).values(
          input.slots.map((s) => ({
            userId: input.userId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        );
      }
    });

    // Return updated slots
    const updated = await db
      .select()
      .from(staffAvailability)
      .where(eq(staffAvailability.userId, input.userId))
      .orderBy(staffAvailability.dayOfWeek, staffAvailability.startTime);

    return updated;
  }),

  // Find staff matching skill + time window
  findAvailable: protectedProcedure.input(findAvailableInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    // Start with staff-type resources that have linked users
    const staffQuery = db
      .select({
        resourceId: resources.id,
        resourceName: resources.name,
        hourlyRate: resources.hourlyRate,
        userId: resources.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(resources)
      .innerJoin(users, eq(resources.userId, users.id))
      .where(
        and(eq(resources.type, 'staff'), eq(resources.isAvailable, true), eq(users.isActive, true))
      )
      .$dynamic();

    const staffResults = await staffQuery.orderBy(resources.name);

    if (staffResults.length === 0) {
      return [];
    }

    const userIds = staffResults.map((s) => s.userId as number);

    // Filter by skills if specified
    let matchingUserIds = userIds;
    if (input.skills && input.skills.length > 0) {
      const skillMatches = await db
        .select({
          userId: staffSkills.userId,
          matchCount: sql<number>`count(distinct ${staffSkills.skill})`,
        })
        .from(staffSkills)
        .where(and(inArray(staffSkills.userId, userIds), inArray(staffSkills.skill, input.skills)))
        .groupBy(staffSkills.userId)
        .having(sql`count(distinct ${staffSkills.skill}) = ${input.skills.length}`);

      matchingUserIds = skillMatches.map((m) => m.userId);
      if (matchingUserIds.length === 0) {
        return [];
      }
    }

    // Filter by availability if date/time specified
    if (input.date || (input.startTime && input.endTime)) {
      const availConditions = [inArray(staffAvailability.userId, matchingUserIds)];

      if (input.date) {
        const dayOfWeek = input.date.getDay(); // 0=Sunday
        availConditions.push(eq(staffAvailability.dayOfWeek, dayOfWeek));
      }

      if (input.startTime && input.endTime) {
        // Availability window must contain the requested time range
        availConditions.push(sql`${staffAvailability.startTime} <= ${input.startTime}`);
        availConditions.push(sql`${staffAvailability.endTime} >= ${input.endTime}`);
      }

      const availableUsers = await db
        .select({ userId: staffAvailability.userId })
        .from(staffAvailability)
        .where(and(...availConditions));

      matchingUserIds = availableUsers.map((a) => a.userId);
      if (matchingUserIds.length === 0) {
        return [];
      }
    }

    // Fetch skills for matched staff
    const allSkills = await db
      .select({
        userId: staffSkills.userId,
        skill: staffSkills.skill,
      })
      .from(staffSkills)
      .where(inArray(staffSkills.userId, matchingUserIds));

    const skillsByUser = new Map<number, string[]>();
    for (const s of allSkills) {
      const existing = skillsByUser.get(s.userId) || [];
      existing.push(s.skill);
      skillsByUser.set(s.userId, existing);
    }

    // Build final results
    const finalUserIdSet = new Set(matchingUserIds);
    return staffResults
      .filter((s) => s.userId !== null && finalUserIdSet.has(s.userId))
      .map((s) => ({
        resourceId: s.resourceId,
        resourceName: s.resourceName,
        hourlyRate: s.hourlyRate,
        userId: s.userId as number,
        userName: s.userName,
        userEmail: s.userEmail,
        skills: skillsByUser.get(s.userId as number) || [],
      }));
  }),

  // Associate a user with a staff resource
  linkUserToResource: adminProcedure
    .input(linkUserToResourceInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify user exists
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Verify resource exists and is staff type
      const [resource] = await db
        .select({ id: resources.id, type: resources.type, userId: resources.userId })
        .from(resources)
        .where(eq(resources.id, input.resourceId))
        .limit(1);

      if (!resource) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      if (resource.type !== 'staff') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only link users to staff-type resources',
        });
      }

      if (resource.userId !== null) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This resource is already linked to a user',
        });
      }

      // Check user isn't already linked to another resource
      const [existingLink] = await db
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.userId, input.userId))
        .limit(1);

      if (existingLink) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This user is already linked to another resource',
        });
      }

      const [updated] = await db
        .update(resources)
        .set({ userId: input.userId, updatedAt: new Date() })
        .where(eq(resources.id, input.resourceId))
        .returning();

      return updated;
    }),

  // List all staff-type resources with linked user info and skills count
  getStaffList: protectedProcedure.input(getStaffListInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { query, limit, cursor } = input;

    const conditions = [eq(resources.type, 'staff')];

    if (query) {
      conditions.push(
        sql`(${ilike(resources.name, `%${query}%`)} OR ${ilike(users.name, `%${query}%`)})`
      );
    }

    if (cursor) {
      conditions.push(sql`${resources.id} > ${cursor}`);
    }

    const results = await db
      .select({
        id: resources.id,
        name: resources.name,
        hourlyRate: resources.hourlyRate,
        isAvailable: resources.isAvailable,
        userId: resources.userId,
        userName: users.name,
        userEmail: users.email,
        skillCount: sql<number>`(
          SELECT count(*) FROM staff_skills WHERE staff_skills.user_id = ${resources.userId}
        )`,
      })
      .from(resources)
      .leftJoin(users, eq(resources.userId, users.id))
      .where(and(...conditions))
      .orderBy(resources.name)
      .limit(limit + 1);

    let nextCursor: number | null = null;
    if (results.length > limit) {
      results.pop();
      nextCursor = results[results.length - 1]?.id ?? null;
    }

    return { items: results, nextCursor };
  }),

  // Full staff profile: resource + user + skills + availability
  getStaffProfile: protectedProcedure.input(getStaffProfileInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const [resource] = await db
      .select({
        id: resources.id,
        name: resources.name,
        type: resources.type,
        hourlyRate: resources.hourlyRate,
        isAvailable: resources.isAvailable,
        notes: resources.notes,
        userId: resources.userId,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(resources)
      .leftJoin(users, eq(resources.userId, users.id))
      .where(and(eq(resources.id, input.resourceId), eq(resources.type, 'staff')))
      .limit(1);

    if (!resource) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Staff resource not found' });
    }

    // Fetch skills and availability if user is linked
    let skills: Array<{
      skill: string;
      certifiedAt: Date | null;
      expiresAt: Date | null;
    }> = [];
    let availability: Array<{
      id: number;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isRecurring: boolean;
    }> = [];

    if (resource.userId) {
      const [skillResults, availResults] = await Promise.all([
        db
          .select({
            skill: staffSkills.skill,
            certifiedAt: staffSkills.certifiedAt,
            expiresAt: staffSkills.expiresAt,
          })
          .from(staffSkills)
          .where(eq(staffSkills.userId, resource.userId))
          .orderBy(staffSkills.skill),
        db
          .select({
            id: staffAvailability.id,
            dayOfWeek: staffAvailability.dayOfWeek,
            startTime: staffAvailability.startTime,
            endTime: staffAvailability.endTime,
            isRecurring: staffAvailability.isRecurring,
          })
          .from(staffAvailability)
          .where(eq(staffAvailability.userId, resource.userId))
          .orderBy(staffAvailability.dayOfWeek, staffAvailability.startTime),
      ]);

      skills = skillResults;
      availability = availResults;
    }

    return {
      ...resource,
      skills,
      availability,
    };
  }),
});
