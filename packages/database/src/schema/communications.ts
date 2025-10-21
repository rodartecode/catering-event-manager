import { pgEnum } from 'drizzle-orm/pg-core';

export const communicationTypeEnum = pgEnum('communication_type', [
  'email',
  'phone',
  'meeting',
  'other',
]);
