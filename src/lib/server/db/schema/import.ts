import { sql } from 'drizzle-orm';
import {
  uuid,
  text,
  integer,
  jsonb,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { crusher_schema, timestamps, metadata } from './shared';

export const import_session_status = crusher_schema.enum(
  'import_session_status',
  ['mapping', 'processing', 'reviewing', 'completed', 'cancelled']
);

export const import_row_status = crusher_schema.enum('import_row_status', [
  'pending',
  'approved',
  'skipped',
  'saved',
  'discarded',
  'duplicate',
]);

export const import_session = crusher_schema.table('import_session', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  file_name: text('file_name').notNull(),
  status: import_session_status('status').notNull().default('mapping'),
  column_mapping:
    jsonb('column_mapping').$type<Record<string, string | null>>(),
  stats: jsonb('stats').$type<{
    total_rows: number;
    valid_rows: number;
    issue_rows: number;
    duplicate_rows: number;
    saved_rows: number;
    skipped_rows: number;
  }>(),
  raw_headers: jsonb('raw_headers').$type<string[]>(),
  suggested_mapping:
    jsonb('suggested_mapping').$type<Record<string, string | null>>(),
  sample_rows: jsonb('sample_rows').$type<Record<string, unknown>[]>(),
  ...timestamps,
  ...metadata,
});

export const import_row = crusher_schema.table(
  'import_row',
  {
    id: uuid('id')
      .default(sql`uuidv7()`)
      .primaryKey(),
    session_id: uuid('session_id')
      .references(() => import_session.id, { onDelete: 'cascade' })
      .notNull(),
    row_index: integer('row_index').notNull(),
    raw_data: jsonb('raw_data').$type<Record<string, unknown>>().notNull(),
    mapped_data: jsonb('mapped_data').$type<Record<string, unknown>>(),
    hash: text('hash'),
    status: import_row_status('status').notNull().default('pending'),
    issues: jsonb('issues').$type<
      {
        field: string;
        type: string;
        message: string;
        original_value?: unknown;
      }[]
    >(),
    matched_party_id: uuid('matched_party_id'),
    matched_vehicle_id: uuid('matched_vehicle_id'),
    matched_product_id: uuid('matched_product_id'),
    match_confidence: jsonb('match_confidence').$type<{
      party: number;
      vehicle: number;
      product: number;
    }>(),
    new_party_name: text('new_party_name'),
    new_vehicle_number: text('new_vehicle_number'),
    new_product_name: text('new_product_name'),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('import_row_session_id_status_idx').on(
      table.session_id,
      table.status
    ),
  ]
);
