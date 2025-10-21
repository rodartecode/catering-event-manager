import { router } from '../trpc';

export const appRouter = router({
  // Routers will be added here in later phases
});

export type AppRouter = typeof appRouter;
