import { pgEnum } from 'drizzle-orm/pg-core';

export const resourceTypeEnum = pgEnum('resource_type', [
  'staff',
  'equipment',
  'materials',
]);
