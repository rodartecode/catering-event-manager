import { router } from '../trpc';
import { analyticsRouter } from './analytics';
import { clientsRouter } from './clients';
import { documentRouter } from './document';
import { eventRouter } from './event';
import { expenseRouter } from './expense';
import { invoiceRouter } from './invoice';
import { menuRouter } from './menu';
import { notificationRouter } from './notification';
import { paymentRouter } from './payment';
import { portalRouter } from './portal';
import { resourceRouter } from './resource';
import { searchRouter } from './search';
import { staffRouter } from './staff';
import { taskRouter } from './task';
import { templateRouter } from './template';
import { userRouter } from './user';
import { venueRouter } from './venue';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
  resource: resourceRouter,
  staff: staffRouter,
  document: documentRouter,
  expense: expenseRouter,
  invoice: invoiceRouter,
  menu: menuRouter,
  notification: notificationRouter,
  payment: paymentRouter,
  analytics: analyticsRouter,
  clients: clientsRouter,
  user: userRouter,
  portal: portalRouter,
  template: templateRouter,
  search: searchRouter,
  venue: venueRouter,
});

export type AppRouter = typeof appRouter;
