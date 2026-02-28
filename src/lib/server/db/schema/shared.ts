import { pgSchema, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const crusher_schema = pgSchema('CRUSHER');

export const timestamps = {
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  // .$onUpdate(() => new Date()),
};

export const metadata = {
  metadata: jsonb('metadata')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
};
