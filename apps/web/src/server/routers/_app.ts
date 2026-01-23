import { router } from '../trpc';
import { eventRouter } from './event';
import { taskRouter } from './task';
import { resourceRouter } from './resource';
import { analyticsRouter } from './analytics';
import { clientsRouter } from './clients';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
  resource: resourceRouter,
  analytics: analyticsRouter,
  clients: clientsRouter,
});

export type AppRouter = typeof appRouter;
