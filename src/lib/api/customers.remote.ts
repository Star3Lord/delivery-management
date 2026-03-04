import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { customer } from '$lib/server/db/schema';
import { list_paginated } from '$lib/api/shared';
import { create_list_query_validator } from '$lib/server/validation/query';

export const list_customers = query(
  create_list_query_validator(customer),
  async (args) => {
    const customers = list_paginated(customer, args);
    return customers;
  }
);

export const get_customer = query(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    const customer_obj = await db
      .select()
      .from(customer)
      .where(eq(customer.id, id))
      .limit(1);
    return customer_obj.at(0);
  }
);

export const create_customer = form(
  v.object({
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const customer_obj = await db.insert(customer).values({
      ...args,
    } satisfies typeof customer.$inferInsert);
    return customer_obj;
  }
);

export const bulk_create_customers = command(
  v.array(
    v.object({
      name: v.string(),
      address: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      metadata: v.optional(v.record(v.string(), v.any())),
    })
  ),
  async (args) => {
    const customer_objs = await db
      .insert(customer)
      .values(args satisfies (typeof customer.$inferInsert)[]);
    return customer_objs;
  }
);

export const update_customer = form(
  v.object({
    id: v.string(),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const customer_obj = await db
      .update(customer)
      .set(args satisfies Partial<typeof customer.$inferInsert>)
      .where(eq(customer.id, args.id))
      .returning();
    return customer_obj;
  }
);

export const delete_customer = command(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    await db.delete(customer).where(eq(customer.id, id));
  }
);
