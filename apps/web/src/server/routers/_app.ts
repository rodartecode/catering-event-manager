import { router } from '../trpc';
import { eventRouter } from './event';
import { taskRouter } from './task';
import { resourceRouter } from './resource';
import { analyticsRouter } from './analytics';
import { clientsRouter } from './clients';
import { userRouter } from './user';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
  resource: resourceRouter,
  analytics: analyticsRouter,
  clients: clientsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
