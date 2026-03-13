import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { product } from '$lib/server/db/schema';
import { list_paginated } from '$lib/api/shared';
import { create_list_query_validator } from '$lib/server/validation/query';

export const list_products = query(
  create_list_query_validator(product),
  async (args) => {
    const products = list_paginated(product, args);
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    return products;
  }
);

export const list_all_products = query(async () => {
  const products = await db
    .select({
      id: product.id,
      name: product.name,
      created_at: product.created_at,
      updated_at: product.updated_at,
    })
    .from(product);
  return products;
});

export const get_product = query(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    const product_obj = await db
      .select()
      .from(product)
      .where(eq(product.id, id))
      .limit(1);
    return product_obj.at(0);
  }
);

export const create_product = form(
  v.object({
    name: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const product_obj = await db.insert(product).values({
      ...args,
    } satisfies typeof product.$inferInsert);
    return product_obj;
  }
);

export const bulk_create_products = command(
  v.array(
    v.object({
      name: v.string(),
      metadata: v.optional(v.record(v.string(), v.any())),
    })
  ),
  async (args) => {
    const product_objs = await db
      .insert(product)
      .values(args satisfies (typeof product.$inferInsert)[]);
    return product_objs;
  }
);

export const update_product = form(
  v.object({
    id: v.string(),
    name: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const product_obj = await db
      .update(product)
      .set(args satisfies Partial<typeof product.$inferInsert>)
      .where(eq(product.id, args.id))
      .returning();
    return product_obj;
  }
);

export const delete_product = command(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    await db.delete(product).where(eq(product.id, id));
  }
);
