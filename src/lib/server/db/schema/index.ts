import { relations } from 'drizzle-orm';

import { bill, bill_item, bill_item_type, receipt } from './billing';
import { customer } from './parties';
import {
  delivery_slip,
  delivery_slip_state,
  product,
  vehicle,
} from './logistics';
import {
  import_session,
  import_session_status,
  import_row,
  import_row_status,
} from './import';
import { timestamps, metadata } from './shared';

export {
  customer,
  product,
  vehicle,
  delivery_slip,
  delivery_slip_state,
  bill,
  bill_item,
  bill_item_type,
  receipt,
  import_session,
  import_session_status,
  import_row,
  import_row_status,
  timestamps,
  metadata,
};

export const customer_relations = relations(customer, ({ many }) => ({
  delivery_slips: many(delivery_slip),
  bills: many(bill),
  receipts: many(receipt),
}));

export const product_relations = relations(product, ({ many }) => ({
  delivery_slips: many(delivery_slip),
  bill_items: many(bill_item),
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
    bill_items: many(bill_item),
  })
);

export const bill_relations = relations(bill, ({ one, many }) => ({
  party: one(customer, {
    fields: [bill.party_id],
    references: [customer.id],
  }),
  items: many(bill_item),
}));

export const bill_item_relations = relations(bill_item, ({ one }) => ({
  bill: one(bill, {
    fields: [bill_item.bill_id],
    references: [bill.id],
  }),
  delivery_slip: one(delivery_slip, {
    fields: [bill_item.delivery_slip_id],
    references: [delivery_slip.id],
  }),
  product: one(product, {
    fields: [bill_item.product_id],
    references: [product.id],
  }),
}));

export const receipt_relations = relations(receipt, ({ one }) => ({
  party: one(customer, {
    fields: [receipt.party_id],
    references: [customer.id],
  }),
}));

export const import_session_relations = relations(
  import_session,
  ({ many }) => ({
    rows: many(import_row),
  })
);

export const import_row_relations = relations(import_row, ({ one }) => ({
  session: one(import_session, {
    fields: [import_row.session_id],
    references: [import_session.id],
  }),
}));
