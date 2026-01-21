import { router } from '../trpc';
import { eventRouter } from './event';
import { taskRouter } from './task';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
