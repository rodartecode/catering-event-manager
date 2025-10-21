import { pgEnum } from 'drizzle-orm/pg-core';

export const eventStatusEnum = pgEnum('event_status', [
  'inquiry',
  'planning',
  'preparation',
  'in_progress',
  'completed',
  'follow_up',
]);
