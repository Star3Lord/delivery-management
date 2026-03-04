import { and, desc, asc, sql, type SQL } from 'drizzle-orm';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import type {
  ListQueryParams,
  CrusherTable,
} from '$lib/server/validation/query';
import { create_list_query, type PaginatedResult } from '$lib/server/query';

// ── Re-exports ──────────────────────────────────────────────────

export type { PaginatedResult } from '$lib/server/query';

// ── Convenience wrapper ─────────────────────────────────────────

/**
 * Cursor-based pagination over any table with `id` (uuid) and `created_at`.
 *
 * Delegates to `create_list_query` internally so it supports both the
 * new opaque `cursor` param and the legacy `starting_after` /
 * `ending_before` params.
 *
 * For custom shapes (joins, extra selects), use `create_list_query`
 * directly with `$dynamic()`.
 */
export async function list_paginated<T extends CrusherTable>(
  table: T,
  options: ListQueryParams<any, any> & { where?: SQL } = {}
): Promise<PaginatedResult<T['$inferSelect']>> {
  const q = create_list_query({
    table,
    tiebreakers: [
      { column: 'created_at', direction: 'desc' },
      { column: 'id', direction: 'desc' },
    ],
    params: options,
  });

  const qb = db
    .select()
    .from(table as PgTable<TableConfig>)
    .$dynamic()
    .where(q.where(options.where))
    .orderBy(...q.order());

  if (q.take != null) qb.limit(q.take);

  const rows = await qb;
  return q.paginate(rows) as PaginatedResult<T['$inferSelect']>;
}

// ── Utilities ───────────────────────────────────────────────────

export function unflatten_row(row: Record<string, any>): Record<string, any> {
  let unflatten_row: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    if (key.includes('.')) {
      const [table, column] = key.split('.');
      if (table in unflatten_row && unflatten_row[table] instanceof Object) {
        unflatten_row[table][column] = value;
      } else {
        unflatten_row[table] = { [column]: value };
      }
    } else {
      unflatten_row[key] = value;
    }
  }

  return unflatten_row;
}

// ── Deprecated helpers ──────────────────────────────────────────

/** @deprecated Use `create_list_query` with `cursor` param instead. */
export function is_backward(
  params: Pick<ListQueryParams<any, any>, 'ending_before' | 'starting_after'>
): boolean {
  return !!params.ending_before && !params.starting_after;
}

/** @deprecated Use `create_list_query` with `cursor` param instead. */
export function cursor_where<T extends CrusherTable>(
  table: T,
  params: ListQueryParams<any, any>
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

/** @deprecated Use `create_list_query` with `cursor` param instead. */
export function cursor_order_by<T extends CrusherTable>(
  table: T,
  params: ListQueryParams<any, any>
): SQL[] {
  return is_backward(params)
    ? [asc(table.created_at), asc(table.id)]
    : [desc(table.created_at), desc(table.id)];
}

/** @deprecated Use `create_list_query` with `order_by` param instead. */
export function build_order_by(
  table: CrusherTable,
  params: ListQueryParams<any, any>
): SQL[] {
  if (!params.order_by?.length) return [];

  return params.order_by.map((item) => {
    const column = (table as Record<string, any>)[item.column];
    if (item.direction === 'desc') return desc(column);
    return asc(column);
  });
}

/** @deprecated Use `create_list_query(...).paginate()` instead. */
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
