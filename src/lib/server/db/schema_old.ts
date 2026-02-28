import {
  pgSchema,
  date,
  uuid,
  text,
  timestamp,
  boolean,
  doublePrecision,
  decimal,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const crusher_schema = pgSchema('CRUSHER');

const timestamps = {
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  // .$onUpdate(() => new Date()),
};

const metadata = {
  metadata: jsonb('metadata')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
};

// ── Core entities ──────────────────────────────────────────────

export const customer = crusher_schema.table('customer', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  ...timestamps,
  ...metadata,
});

export const product = crusher_schema.table('product', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ...timestamps,
  ...metadata,
});

export const vehicle = crusher_schema.table('vehicle', {
  id: uuid('id').defaultRandom().primaryKey(),
  number_plate: text('number_plate').notNull(),
  vehicle_type: text('vehicle_type'),
  ...timestamps,
  ...metadata,
});

// ── Delivery slips ─────────────────────────────────────────────

export const delivery_slip_state = pgEnum('delivery_slip_state', [
  'pending',
  'billed',
  'discarded',
]);

export const delivery_slip = crusher_schema.table('delivery_slip', {
  id: uuid('id').defaultRandom().primaryKey(),
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
});

// ── Bills ──────────────────────────────────────────────────────

export const bill = crusher_schema.table('bill', {
  id: uuid('id').defaultRandom().primaryKey(),
  party_id: uuid('party_id')
    .notNull()
    .references(() => customer.id),
  date_start: date('date_start').notNull(),
  date_end: date('date_end').notNull(),
  royalty_quantity: decimal('royalty_quantity', {
    precision: 10,
    scale: 2,
  }).notNull(),
  royalty_rate: decimal('royalty_rate', { precision: 10, scale: 2 }).notNull(),
  other_charges: text('other_charges').notNull().default(''),
  other_charges_amount: decimal('other_charges_amount', {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default('0'),
  ...timestamps,
  ...metadata,
});

export const bill_product = crusher_schema.table('bill_product', {
  id: uuid('id').defaultRandom().primaryKey(),
  bill_id: uuid('bill_id')
    .notNull()
    .references(() => bill.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id')
    .notNull()
    .references(() => product.id),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  rate: decimal('rate', { precision: 10, scale: 2 }).notNull(),
  ...timestamps,
  ...metadata,
});

export const bill_slip = crusher_schema.table('bill_slip', {
  bill_id: uuid('bill_id')
    .notNull()
    .references(() => bill.id, { onDelete: 'cascade' }),
  delivery_slip_id: uuid('delivery_slip_id')
    .notNull()
    .references(() => delivery_slip.id),
});

// ── Receipts & Ledger ──────────────────────────────────────────

export const receipt = crusher_schema.table('receipt', {
  id: uuid('id').defaultRandom().primaryKey(),
  party_id: uuid('party_id')
    .notNull()
    .references(() => customer.id),
  date: date('date').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  remarks: text('remarks').notNull().default(''),
  ...timestamps,
  ...metadata,
});

// export const ledger = crusher_schema.table('ledger', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   party_id: uuid('party_id')
//     .notNull()
//     .references(() => customer.id),
//   date: date('date').notNull(),
//   type: text('type').notNull(),
//   debit: decimal('debit', { precision: 10, scale: 2 }).notNull().default('0'),
//   credit: decimal('credit', { precision: 10, scale: 2 }).notNull().default('0'),
//   balance: decimal('balance', { precision: 10, scale: 2 }).notNull().default('0'),
//   remarks: text('remarks').notNull().default(''),
//   ...timestamps,
//   ...metadata,
// });

// ── Relations ──────────────────────────────────────────────────

export const customer_relations = relations(customer, ({ many }) => ({
  delivery_slips: many(delivery_slip),
  bills: many(bill),
  receipts: many(receipt),
  // ledger_entries: many(ledger),
}));

export const product_relations = relations(product, ({ many }) => ({
  delivery_slips: many(delivery_slip),
  bill_products: many(bill_product),
}));

export const vehicle_relations = relations(vehicle, ({ many }) => ({
  delivery_slips: many(delivery_slip),
}));

export const delivery_slip_relations = relations(
  delivery_slip,
  ({ one, many }) => ({
    party: one(customer, {
      fields: [delivery_slip.party_id],
      references: [customer.id],
    }),
    vehicle: one(vehicle, {
      fields: [delivery_slip.vehicle_id],
      references: [vehicle.id],
    }),
    product: one(product, {
      fields: [delivery_slip.product_id],
      references: [product.id],
    }),
    bill_slips: many(bill_slip),
  })
);

export const bill_relations = relations(bill, ({ one, many }) => ({
  party: one(customer, {
    fields: [bill.party_id],
    references: [customer.id],
  }),
  products: many(bill_product),
  bill_slips: many(bill_slip),
}));

export const bill_product_relations = relations(bill_product, ({ one }) => ({
  bill: one(bill, {
    fields: [bill_product.bill_id],
    references: [bill.id],
  }),
  product: one(product, {
    fields: [bill_product.product_id],
    references: [product.id],
  }),
}));

export const bill_slip_relations = relations(bill_slip, ({ one }) => ({
  bill: one(bill, {
    fields: [bill_slip.bill_id],
    references: [bill.id],
  }),
  delivery_slip: one(delivery_slip, {
    fields: [bill_slip.delivery_slip_id],
    references: [delivery_slip.id],
  }),
}));

export const receipt_relations = relations(receipt, ({ one }) => ({
  party: one(customer, {
    fields: [receipt.party_id],
    references: [customer.id],
  }),
}));

// export const ledger_relations = relations(ledger, ({ one }) => ({
//   party: one(customer, {
//     fields: [ledger.party_id],
//     references: [customer.id],
//   }),
// }));
