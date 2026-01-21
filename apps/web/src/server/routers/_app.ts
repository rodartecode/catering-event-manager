import { router } from '../trpc';
import { eventRouter } from './event';
import { taskRouter } from './task';
import { resourceRouter } from './resource';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
  resource: resourceRouter,
});

export type AppRouter = typeof appRouter;
