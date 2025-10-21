import { pgEnum } from 'drizzle-orm/pg-core';

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
]);

export const taskCategoryEnum = pgEnum('task_category', [
  'pre_event',
  'during_event',
  'post_event',
]);
