import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { bill, bill_item } from '$lib/server/db/schema';
import { list_query_validator, list_paginated } from '$lib/api/shared';

export const list_bills = query(list_query_validator, async (args) => {
  const bills = list_paginated(bill, args);
  return bills;
});

export const get_bill = query(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    const bill_obj = await db.query.bill.findFirst({
      where: eq(bill.id, id),
      with: {
        party: true,
        items: {
          with: {
            product: true,
            delivery_slip: true,
          },
          orderBy: (items, { asc }) => [asc(items.sort_order)],
        },
      },
    });
    return bill_obj;
  }
);

const bill_item_validator = v.object({
  type: v.picklist(['product', 'charge']),
  description: v.optional(v.string()),
  delivery_slip_id: v.optional(v.string()),
  product_id: v.optional(v.string()),
  quantity: v.optional(v.string()),
  unit: v.optional(v.string()),
  rate: v.optional(v.string()),
  amount: v.string(),
  sort_order: v.optional(v.number()),
  metadata: v.optional(v.record(v.string(), v.any())),
});

export const create_bill = form(
  v.object({
    party_id: v.string(),
    date_start: v.string(),
    date_end: v.string(),
    remarks: v.optional(v.string()),
    items: v.array(bill_item_validator),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async ({ items, ...bill_data }) => {
    return await db.transaction(async (tx) => {
      const [created_bill] = await tx
        .insert(bill)
        .values(bill_data)
        .returning();

      if (items.length > 0) {
        await tx.insert(bill_item).values(
          items.map((item, index) => ({
            ...item,
            bill_id: created_bill.id,
            sort_order: item.sort_order ?? index,
          }))
        );
      }

      return created_bill;
    });
  }
);

export const update_bill = form(
  v.object({
    id: v.string(),
    party_id: v.optional(v.string()),
    date_start: v.optional(v.string()),
    date_end: v.optional(v.string()),
    remarks: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const bill_obj = await db
      .update(bill)
      .set(args satisfies Partial<typeof bill.$inferInsert>)
      .where(eq(bill.id, args.id))
      .returning();
    return bill_obj;
  }
);

export const delete_bill = command(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    await db.delete(bill).where(eq(bill.id, id));
  }
);

// ── Bill Items ──────────────────────────────────────────────────

export const add_bill_item = form(
  v.intersect([v.object({ bill_id: v.string() }), bill_item_validator]),
  async ({ bill_id, ...item }) => {
    const [created] = await db
      .insert(bill_item)
      .values({ bill_id, ...item })
      .returning();
    return created;
  }
);

export const update_bill_item = form(
  v.object({
    id: v.string(),
    type: v.optional(v.picklist(['product', 'charge'])),
    description: v.optional(v.string()),
    delivery_slip_id: v.optional(v.string()),
    product_id: v.optional(v.string()),
    quantity: v.optional(v.string()),
    unit: v.optional(v.string()),
    rate: v.optional(v.string()),
    amount: v.optional(v.string()),
    sort_order: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const [updated] = await db
      .update(bill_item)
      .set(args satisfies Partial<typeof bill_item.$inferInsert>)
      .where(eq(bill_item.id, args.id))
      .returning();
    return updated;
  }
);

export const delete_bill_item = command(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    await db.delete(bill_item).where(eq(bill_item.id, id));
  }
);
