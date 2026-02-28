import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { vehicle } from '$lib/server/db/schema';
import { list_query_validator, list_paginated } from '$lib/api/shared';

export const list_vehicles = query(list_query_validator, async (args) => {
  const vehicles = list_paginated(vehicle, args);
  return vehicles;
});

export const get_vehicle = query(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    const vehicle_obj = await db
      .select()
      .from(vehicle)
      .where(eq(vehicle.id, id));
    return vehicle_obj;
  }
);

export const create_vehicle = form(
  v.object({
    number_plate: v.string(),
    vehicle_type: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const vehicle_obj = await db.insert(vehicle).values({
      ...args,
    } satisfies typeof vehicle.$inferInsert);
    return vehicle_obj;
  }
);

export const bulk_create_vehicles = command(
  v.array(
    v.object({
      number_plate: v.string(),
      vehicle_type: v.optional(v.string()),
      metadata: v.optional(v.record(v.string(), v.any())),
    })
  ),
  async (args) => {
    const vehicle_objs = await db
      .insert(vehicle)
      .values(args satisfies (typeof vehicle.$inferInsert)[]);
    return vehicle_objs;
  }
);

export const update_vehicle = form(
  v.object({
    id: v.string(),
    number_plate: v.optional(v.string()),
    vehicle_type: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),
  async (args) => {
    const vehicle_obj = await db
      .update(vehicle)
      .set(args satisfies Partial<typeof vehicle.$inferInsert>)
      .where(eq(vehicle.id, args.id))
      .returning();
    return vehicle_obj;
  }
);

export const delete_vehicle = command(
  v.object({
    id: v.string(),
  }),
  async ({ id }) => {
    await db.delete(vehicle).where(eq(vehicle.id, id));
  }
);
