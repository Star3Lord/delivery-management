import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { get_db } from '$lib/server/db';
import { receipt } from '$lib/server/db/schema';
import { list_paginated } from '$lib/api/shared';
import { create_list_query_validator } from '$lib/server/validation/query';

export const list_receipts = query(
  create_list_query_validator(receipt),
  async (args) => {
    const receipts = list_paginated(receipt, args);
    return receipts;
  }
);

export const get_receipt = query(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    const receipt_obj = await get_db()
      .select()
      .from(receipt)
      .where(eq(receipt.id, id));
    return receipt_obj;
  }
);

export const create_receipt = form(
  v.object({
    party_id: v.string(),
    date: v.string(),
    amount: v.string(),
    remarks: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const receipt_obj = await get_db()
      .insert(receipt)
      .values({
        ...args,
      } satisfies typeof receipt.$inferInsert);
    return receipt_obj;
  }
);

export const bulk_create_receipts = command(
  v.array(
    v.object({
      party_id: v.string(),
      date: v.string(),
      amount: v.string(),
      remarks: v.optional(v.string()),
      metadata: v.optional(v.record(v.string(), v.any())),
    })
  ),
  async (args) => {
    const receipt_objs = await get_db()
      .insert(receipt)
      .values(args satisfies (typeof receipt.$inferInsert)[]);
    return receipt_objs;
  }
);

export const update_receipt = form(
  v.object({
    id: v.string(),
    party_id: v.optional(v.string()),
    date: v.optional(v.string()),
    amount: v.optional(v.string()),
    remarks: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const receipt_obj = await get_db()
      .update(receipt)
      .set(args satisfies Partial<typeof receipt.$inferInsert>)
      .where(eq(receipt.id, args.id))
      .returning();
    return receipt_obj;
  }
);

export const delete_receipt = command(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    await get_db().delete(receipt).where(eq(receipt.id, id));
  }
);
