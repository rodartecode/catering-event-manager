import { db } from '@catering-event-manager/database/client';
import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { logger } from '@/lib/logger';
import { auth } from './auth';

export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const session = await auth();

  return {
    db,
    session,
    headers: opts.req.headers,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  if (ctx.session.user.role !== 'administrator') {
    logger.security('authz.denied', {
      userId: ctx.session.user.id,
      attemptedRole: 'administrator',
      actualRole: ctx.session.user.role,
    });
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Client portal procedure - requires client role and includes clientId in context
export const clientProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  if (ctx.session.user.role !== 'client') {
    logger.security('authz.denied', {
      userId: ctx.session.user.id,
      attemptedRole: 'client',
      actualRole: ctx.session.user.role,
    });
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Client access required' });
  }
  const clientId = ctx.session.user.clientId;
  if (!clientId) {
    logger.security('authz.denied', {
      userId: ctx.session.user.id,
      reason: 'no_client_association',
      actualRole: ctx.session.user.role,
    });
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No client association' });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
      clientId, // Available in all portal procedures for scoping queries
    },
  });
});

// Export caller factory for testing
export const createCallerFactory = t.createCallerFactory;
