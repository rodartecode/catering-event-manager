import { users } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const userRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        role: z.enum(['administrator', 'manager']).default('manager'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create user
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          isActive: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        });

      return newUser;
    }),
});
