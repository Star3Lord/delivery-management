import * as v from 'valibot';
import { and, lt, gt, lte, gte, desc, asc, sql, type SQL } from 'drizzle-orm';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import {
  customer,
  product,
  vehicle,
  delivery_slip,
  bill,
  bill_item,
  receipt,
} from '$lib/server/db/schema';

// ── Validators ──────────────────────────────────────────────────

const date_range_filter = v.object({
  greater_than_or_equal_to: v.optional(v.string()),
  greater_than: v.optional(v.string()),
  less_than_or_equal_to: v.optional(v.string()),
  less_than: v.optional(v.string()),
});

export const list_query_validator = v.object({
  limit: v.optional(v.number()),
  starting_after: v.optional(v.string()),
  ending_before: v.optional(v.string()),
  created_at: v.optional(date_range_filter),
  order_by: v.optional(
    v.array(
      v.object({
        column: v.string(),
        direction: v.optional(v.union([v.literal('asc'), v.literal('desc')])),
      })
    )
  ),
});

export type ListQueryParams = v.InferOutput<typeof list_query_validator>;

// ── Types ────────────────────────────────────────────────────────

export type PaginatedResult<T> = {
  items: T[];
  has_more: boolean;
};

export type ListableTable =
  | typeof bill
  | typeof bill_item
  | typeof customer
  | typeof delivery_slip
  | typeof product
  | typeof receipt
  | typeof vehicle;

// ── Composable pagination helpers ───────────────────────────────

/**
 * Returns true when paginating backward (ending_before without starting_after).
 */
export function is_backward(params: ListQueryParams): boolean {
  return !!params.ending_before && !params.starting_after;
}

/**
 * Cursor-position conditions for `(created_at, id)` keyset pagination.
 *
 * Uses Postgres tuple comparison — `(created_at, id) < (c, i)` — so the
 * query planner can satisfy it with a composite index scan instead of
 * falling back to a filter on an OR/AND expansion.
 */
export function cursor_where(
  table: ListableTable,
  params: ListQueryParams
): (SQL | undefined)[] {
  const { starting_after, ending_before } = params;

  if (starting_after) {
    return [
      sql`(${table.created_at}, ${table.id}) < (
        SELECT ${table.created_at}, ${table.id} FROM ${table}
        WHERE ${table.id} = ${starting_after} LIMIT 1
      )`,
    ];
  }

  if (ending_before) {
    return [
      sql`(${table.created_at}, ${table.id}) > (
        SELECT ${table.created_at}, ${table.id} FROM ${table}
        WHERE ${table.id} = ${ending_before} LIMIT 1
      )`,
    ];
  }

  return [];
}

/**
 * Date-range filter conditions on `created_at`.
 */
export function date_range_where(
  table: ListableTable,
  params: ListQueryParams
): (SQL | undefined)[] {
  const { created_at } = params;
  if (!created_at) return [];

  const conditions: (SQL | undefined)[] = [];
  const {
    greater_than_or_equal_to,
    greater_than,
    less_than_or_equal_to,
    less_than,
  } = created_at;

  if (greater_than_or_equal_to)
    conditions.push(gte(table.created_at, new Date(greater_than_or_equal_to)));
  if (greater_than)
    conditions.push(gt(table.created_at, new Date(greater_than)));
  if (less_than_or_equal_to)
    conditions.push(lte(table.created_at, new Date(less_than_or_equal_to)));
  if (less_than) conditions.push(lt(table.created_at, new Date(less_than)));

  return conditions;
}

/**
 * Direction-aware ordering: `created_at DESC, id DESC` for forward,
 * ascending for backward pagination.
 */
export function cursor_order_by(
  table: ListableTable,
  params: ListQueryParams
): SQL[] {
  return is_backward(params)
    ? [asc(table.created_at), asc(table.id)]
    : [desc(table.created_at), desc(table.id)];
}

/**
 * Converts the `order_by` parameter into Drizzle SQL order expressions.
 * Defaults to ascending when no direction is specified.
 */
export function build_order_by(
  table: ListableTable,
  params: ListQueryParams
): SQL[] {
  if (!params.order_by?.length) return [];

  return params.order_by.map((item) => {
    const column = (table as Record<string, any>)[item.column];
    if (item.direction === 'desc') return desc(column);
    return asc(column);
  });
}

/**
 * Post-execution pagination: detects `has_more` from `limit + 1` overflow,
 * slices to page size, and reverses if paginating backward.
 */
export function paginate_rows<T>(
  rows: T[],
  limit: number | undefined,
  backward: boolean
): PaginatedResult<T> {
  const has_more = limit ? rows.length > limit : false;
  const data = has_more ? rows.slice(0, limit) : [...rows];
  if (backward) data.reverse();
  return { items: data, has_more };
}

// ── Convenience wrapper ─────────────────────────────────────────

/**
 * Cursor-based pagination over any table with `id` (uuid) and `created_at` columns.
 *
 * For simple `select().from(table)` queries. For custom shapes (joins, extra
 * selects), use the composable helpers directly with `$dynamic()`:
 *
 * ```ts
 * const qb = db.select().from(table).leftJoin(...).$dynamic()
 *   .where(and(...cursor_where(table, p), ...date_range_where(table, p), myFilter))
 *   .orderBy(...cursor_order_by(table, p));
 * if (p.limit) qb.limit(p.limit + 1);
 * return paginate_rows(await qb, p.limit, is_backward(p));
 * ```
 */
export async function list_paginated<T extends ListableTable>(
  table: T,
  options: ListQueryParams & { where?: SQL } = {}
): Promise<PaginatedResult<T['$inferSelect']>> {
  const backward = is_backward(options);

  const qb = db
    .select()
    .from(table as PgTable<TableConfig>)
    .$dynamic()
    .where(
      and(
        ...cursor_where(table, options),
        ...date_range_where(table, options),
        options.where
      )
    )
    .orderBy(
      ...cursor_order_by(table, options),
      ...build_order_by(table, options)
    );

  if (options.limit) qb.limit(options.limit + 1);

  return paginate_rows(await qb, options.limit, backward) as PaginatedResult<
    T['$inferSelect']
  >;
}
