import { router } from '../trpc';
import { analyticsRouter } from './analytics';
import { clientsRouter } from './clients';
import { eventRouter } from './event';
import { portalRouter } from './portal';
import { resourceRouter } from './resource';
import { taskRouter } from './task';
import { templateRouter } from './template';
import { userRouter } from './user';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
  resource: resourceRouter,
  analytics: analyticsRouter,
  clients: clientsRouter,
  user: userRouter,
  portal: portalRouter,
  template: templateRouter,
});

export type AppRouter = typeof appRouter;
