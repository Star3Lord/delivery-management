import { sql } from 'drizzle-orm';
import { uuid, text } from 'drizzle-orm/pg-core';
import { crusher_schema, timestamps, metadata } from './shared';

export const customer = crusher_schema.table('customer', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  ...timestamps,
  ...metadata,
});
