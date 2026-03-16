import { router } from '../trpc';
import { analyticsRouter } from './analytics';
import { clientsRouter } from './clients';
import { eventRouter } from './event';
import { expenseRouter } from './expense';
import { invoiceRouter } from './invoice';
import { paymentRouter } from './payment';
import { portalRouter } from './portal';
import { resourceRouter } from './resource';
import { searchRouter } from './search';
import { taskRouter } from './task';
import { templateRouter } from './template';
import { userRouter } from './user';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
  resource: resourceRouter,
  expense: expenseRouter,
  invoice: invoiceRouter,
  payment: paymentRouter,
  analytics: analyticsRouter,
  clients: clientsRouter,
  user: userRouter,
  portal: portalRouter,
  template: templateRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
