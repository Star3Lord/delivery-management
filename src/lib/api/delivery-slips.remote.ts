import { and, desc, eq, sql } from 'drizzle-orm';
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
  unflatten_row,
  cursor_where,
  // date_range_where,
  cursor_order_by,
  build_order_by,
  is_backward,
  paginate_rows,
} from '$lib/api/shared';
import {
  create_list_query_validator,
  create_filter_schema,
} from '$lib/server/validation/query';
import { create_list_query } from '$lib/server/query';
import { delivery_slip_filter_schema } from '$lib/api/delivery-slips.filter-schema';

export type DeliverySlip = Awaited<
  ReturnType<typeof list_delivery_slips>
>['items'][number];

const DELIVERY_SLIP_JSON_FIELDS = [
  { column: 'metadata', keys: ['remarks'] },
] as const;

export const list_delivery_slips = query(
  create_list_query_validator(
    delivery_slip,
    {
      party: customer,
      vehicle,
      product,
    },
    { jsonFields: [...DELIVERY_SLIP_JSON_FIELDS] }
  ),
  async (args) => {
    console.log({ args });

    const backward = is_backward(args);

    const date_order_by = build_order_by(delivery_slip, args).filter((sql) =>
      sql.toString().includes('date')
    );

    const cursor_where_with_date = [];

    if (args.starting_after) {
      cursor_where_with_date.push(
        sql`(${delivery_slip.date}, ${delivery_slip.created_at}, ${delivery_slip.id}) < (
        SELECT ${delivery_slip.date}, ${delivery_slip.created_at}, ${delivery_slip.id} FROM ${delivery_slip}
        WHERE ${delivery_slip.id} = ${args.starting_after} LIMIT 1
      )`
      );
    }

    if (args.ending_before) {
      cursor_where_with_date.push(
        sql`(${delivery_slip.date}, ${delivery_slip.created_at}, ${delivery_slip.id}) > (
        SELECT ${delivery_slip.date}, ${delivery_slip.created_at}, ${delivery_slip.id} FROM ${delivery_slip}
        WHERE ${delivery_slip.id} = ${args.ending_before} LIMIT 1
      )`
      );
    }

    const qb = db
      .select()
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
      .leftJoin(product, eq(delivery_slip.product_id, product.id))
      .$dynamic()
      .where(
        and(
          ...cursor_where_with_date
          // ...date_range_where(delivery_slip, args)
        )
      )
      .orderBy(
        ...(date_order_by.length > 0
          ? date_order_by
          : [desc(delivery_slip.date)]),
        ...cursor_order_by(delivery_slip, args),
        ...build_order_by(delivery_slip, args).filter(
          (sql) => !sql.toString().includes('date')
        )
      );

    if (args.limit) qb.limit(args.limit + 1);

    // console.log(qb.toSQL());

    const rows = await qb;

    const result = paginate_rows(rows, args.limit, backward);

    // await new Promise((resolve) => setTimeout(resolve, 2000));

    // if (Math.random() < 0.5) {
    //   throw new Error('test');
    // }

    return {
      has_more: result.has_more,
      items: result.items.map((row) => ({
        ...row.delivery_slip,
        party: row.customer,
        vehicle: row.vehicle,
        product: row.product,
      })),
    };
  }
);

const delivery_slip_relations = { party: customer, vehicle, product } as const;

create_filter_schema(
  delivery_slip,
  delivery_slip_relations,
  { jsonFields: [...DELIVERY_SLIP_JSON_FIELDS] },
  delivery_slip_filter_schema
);

const DELIVERY_SLIP_TIEBREAKERS: {
  column: string;
  direction: 'asc' | 'desc';
}[] = [
  { column: 'date', direction: 'desc' },
  { column: 'created_at', direction: 'desc' },
  { column: 'id', direction: 'desc' },
];

export const list_delivery_slips_v2 = query(
  create_list_query_validator(delivery_slip, delivery_slip_relations, {
    jsonFields: [...DELIVERY_SLIP_JSON_FIELDS],
  }),
  async (args) => {
    const q = create_list_query({
      table: delivery_slip,
      relations: delivery_slip_relations,
      tiebreakers: DELIVERY_SLIP_TIEBREAKERS,
      params: args,
    });

    if (q.select) {
      const query = db
        .select(q.select)
        .from(delivery_slip)
        .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
        .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
        .leftJoin(product, eq(delivery_slip.product_id, product.id))
        .where(q.where())
        .orderBy(...q.order())
        .limit(q.take ?? 100);

      // console.log(query.toSQL());

      const rows = (await query).map((row) => {
        return unflatten_row(row);
      });

      // await new Promise((resolve) => setTimeout(resolve, 2000));

      // console.log({ row: rows[0] });

      return q.paginate(rows);
    }

    const query = db
      .select()
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
      .leftJoin(product, eq(delivery_slip.product_id, product.id))
      .where(q.where())
      .orderBy(...q.order())
      .limit(q.take ?? 100);

    const rows = await query;

    // console.log(query.toSQL());

    return q.paginate(
      rows.map((row) => ({
        ...row.delivery_slip,
        party: row.customer,
        vehicle: row.vehicle,
        product: row.product,
      }))
    );
  }
);

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

export const get_recent_slips_by_vehicle_for_preview = query(
  v.object({ vehicle_id: v.string(), limit: v.optional(v.number()) }),
  async (args) => {
    return db
      .select({
        external_id: delivery_slip.external_id,
        date: delivery_slip.date,
        party_name: customer.name,
      })
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .where(eq(delivery_slip.vehicle_id, args.vehicle_id))
      .orderBy(desc(delivery_slip.date), desc(delivery_slip.id))
      .limit(args.limit ?? 5);
  }
);

export const get_recent_slips_by_vehicle = query(
  v.object({ vehicle_id: v.string(), limit: v.optional(v.number()) }),
  async (args) => {
    return db
      .select()
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
      .leftJoin(product, eq(delivery_slip.product_id, product.id))
      .where(eq(delivery_slip.vehicle_id, args.vehicle_id))
      .orderBy(desc(delivery_slip.date), desc(delivery_slip.id))
      .limit(args.limit ?? 5)
      .then((rows) =>
        rows.map((row) => ({
          ...row.delivery_slip,
          party: row.customer,
          vehicle: row.vehicle,
          product: row.product,
        }))
      );
  }
);

export const get_recent_slips_by_product_for_preview = query(
  v.object({ product_id: v.string(), limit: v.optional(v.number()) }),
  async (args) => {
    return db
      .select({
        external_id: delivery_slip.external_id,
        date: delivery_slip.date,
        party_name: customer.name,
      })
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .where(eq(delivery_slip.product_id, args.product_id))
      .orderBy(desc(delivery_slip.date), desc(delivery_slip.id))
      .limit(args.limit ?? 5);
  }
);

export const get_recent_slips_by_product = query(
  v.object({ product_id: v.string(), limit: v.optional(v.number()) }),
  async (args) => {
    return db
      .select()
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
      .leftJoin(product, eq(delivery_slip.product_id, product.id))
      .where(eq(delivery_slip.product_id, args.product_id))
      .orderBy(desc(delivery_slip.date), desc(delivery_slip.id))
      .limit(args.limit ?? 10)
      .then((rows) =>
        rows.map((row) => ({
          ...row.delivery_slip,
          party: row.customer,
          vehicle: row.vehicle,
          product: row.product,
        }))
      );
  }
);
