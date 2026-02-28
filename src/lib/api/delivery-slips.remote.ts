import { and, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import {
  delivery_slip,
  customer,
  vehicle,
  product,
} from '$lib/server/db/schema';
import {
  list_query_validator,
  cursor_where,
  date_range_where,
  cursor_order_by,
  is_backward,
  paginate_rows,
} from '$lib/api/shared';

export const list_delivery_slips = query(list_query_validator, async (args) => {
  const backward = is_backward(args);

  const qb = db
    .select()
    .from(delivery_slip)
    .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
    .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
    .leftJoin(product, eq(delivery_slip.product_id, product.id))
    .$dynamic()
    .where(
      and(
        ...cursor_where(delivery_slip, args),
        ...date_range_where(delivery_slip, args)
      )
    )
    .orderBy(...cursor_order_by(delivery_slip, args));

  if (args.limit) qb.limit(args.limit + 1);

  console.log(qb.toSQL());

  const rows = await qb;

  const result = paginate_rows(rows, args.limit, backward);

  return {
    has_more: result.has_more,
    items: result.items.map((row) => ({
      ...row.delivery_slip,
      party: row.customer,
      vehicle: row.vehicle,
      product: row.product,
    })),
  };
});

export const get_delivery_slip = query(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    const slip_obj = await db
      .select()
      .from(delivery_slip)
      .where(eq(delivery_slip.id, id));
    return slip_obj;
  }
);

export const create_delivery_slip = form(
  v.object({
    external_id: v.string(),
    date: v.string(),
    party_id: v.optional(v.string()),
    vehicle_id: v.optional(v.string()),
    royalty_number: v.string(),
    royalty_quantity: v.string(),
    royalty_quantity_unit: v.string(),
    product_id: v.optional(v.string()),
    product_quantity: v.optional(v.string()),
    product_quantity_unit: v.string(),
    state: v.optional(v.picklist(['pending', 'billed', 'discarded'])),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const slip_obj = await db.insert(delivery_slip).values({
      ...args,
    } satisfies typeof delivery_slip.$inferInsert);
    return slip_obj;
  }
);

export const bulk_create_delivery_slips = command(
  v.array(
    v.object({
      external_id: v.string(),
      date: v.string(),
      party_id: v.optional(v.string()),
      vehicle_id: v.optional(v.string()),
      royalty_number: v.string(),
      royalty_quantity: v.string(),
      royalty_quantity_unit: v.string(),
      product_id: v.optional(v.string()),
      product_quantity: v.optional(v.string()),
      product_quantity_unit: v.string(),
      state: v.optional(v.picklist(['pending', 'billed', 'discarded'])),
      metadata: v.optional(v.record(v.string(), v.any())),
    })
  ),
  async (args) => {
    const slip_objs = await db
      .insert(delivery_slip)
      .values(args satisfies (typeof delivery_slip.$inferInsert)[]);
    return slip_objs;
  }
);

export const update_delivery_slip = form(
  v.object({
    id: v.string(),
    external_id: v.optional(v.string()),
    date: v.optional(v.string()),
    party_id: v.optional(v.string()),
    vehicle_id: v.optional(v.string()),
    royalty_number: v.optional(v.string()),
    royalty_quantity: v.optional(v.string()),
    royalty_quantity_unit: v.optional(v.string()),
    product_id: v.optional(v.string()),
    product_quantity: v.optional(v.string()),
    product_quantity_unit: v.optional(v.string()),
    state: v.optional(v.picklist(['pending', 'billed', 'discarded'])),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const slip_obj = await db
      .update(delivery_slip)
      .set(args satisfies Partial<typeof delivery_slip.$inferInsert>)
      .where(eq(delivery_slip.id, args.id))
      .returning();
    return slip_obj;
  }
);

export const delete_delivery_slip = command(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    await db.delete(delivery_slip).where(eq(delivery_slip.id, id));
  }
);
