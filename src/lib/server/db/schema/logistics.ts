import { sql } from 'drizzle-orm';
import { date, uuid, text, decimal, index } from 'drizzle-orm/pg-core';
import { crusher_schema, timestamps, metadata } from './shared';
import { customer } from './parties';

export const product = crusher_schema.table('product', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  name: text('name').notNull(),
  ...timestamps,
  ...metadata,
});

export const vehicle = crusher_schema.table('vehicle', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  number_plate: text('number_plate').notNull(),
  vehicle_type: text('vehicle_type'),
  ...timestamps,
  ...metadata,
});

export const delivery_slip_state = crusher_schema.enum('delivery_slip_state', [
  'pending',
  'billed',
  'discarded',
]);

export const delivery_slip = crusher_schema.table(
  'delivery_slip',
  {
    id: uuid('id')
      .default(sql`uuidv7()`)
      .primaryKey(),
    external_id: text('external_id').notNull().unique(),
    date: date('date').notNull(),
    party_id: uuid('party_id').references(() => customer.id),
    vehicle_id: uuid('vehicle_id').references(() => vehicle.id),
    royalty_number: text('royalty_number').notNull(),
    royalty_quantity: decimal('royalty_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    royalty_quantity_unit: text('royalty_quantity_unit').notNull(),
    product_id: uuid('product_id').references(() => product.id),
    product_quantity: decimal('product_quantity', { precision: 10, scale: 2 }),
    product_quantity_unit: text('product_quantity_unit').notNull(),
    state: delivery_slip_state('state').notNull().default('pending'),
    ...timestamps,
    ...metadata,
  },
  (table) => [
    index('delivery_slip_date_desc_created_at_desc_id_desc_idx').on(
      table.date.desc(),
      table.created_at.desc(),
      table.id.desc()
    ),
  ]
);
