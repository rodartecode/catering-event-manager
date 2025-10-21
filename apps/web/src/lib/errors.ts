import { TRPCError } from '@trpc/server';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleTRPCError(error: unknown, context?: Record<string, unknown>): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof AppError) {
    logger.error(error.message, error, context);
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  if (error instanceof Error) {
    logger.error('Unexpected error', error, context);
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }

  logger.error('Unknown error type', undefined, { error, ...context });
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unknown error occurred',
  });
}
