import { sql } from 'drizzle-orm';
import {
  date,
  uuid,
  text,
  decimal,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core';
import { crusher_schema, timestamps, metadata } from './shared';
import { customer } from './parties';
import { delivery_slip, product } from './logistics';

export const bill = crusher_schema.table('bill', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  party_id: uuid('party_id')
    .notNull()
    .references(() => customer.id),
  date_start: date('date_start').notNull(),
  date_end: date('date_end').notNull(),
  ...timestamps,
  ...metadata,
});

export const bill_item_type = crusher_schema.enum('bill_item_type', [
  'product',
  'charge',
]);

export const bill_item = crusher_schema.table('bill_item', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  bill_id: uuid('bill_id')
    .notNull()
    .references(() => bill.id, { onDelete: 'cascade' }),
  type: bill_item_type('type').notNull(),
  description: text('description'),
  delivery_slip_id: uuid('delivery_slip_id').references(() => delivery_slip.id),
  product_id: uuid('product_id').references(() => product.id),
  quantity: decimal('quantity', { precision: 10, scale: 2 }),
  unit: text('unit'),
  rate: decimal('rate', { precision: 10, scale: 2 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  ...timestamps,
  ...metadata,
});

export const receipt = crusher_schema.table('receipt', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  party_id: uuid('party_id')
    .notNull()
    .references(() => customer.id),
  date: date('date').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  ...timestamps,
  ...metadata,
});
