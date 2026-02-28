import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { product } from '$lib/server/db/schema';
import { list_query_validator, list_paginated } from '$lib/api/shared';

export const list_products = query(list_query_validator, async (args) => {
  const products = list_paginated(product, args);
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
      .where(eq(product.id, id));
    return product_obj;
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
