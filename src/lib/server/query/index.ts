import {
  QueryBuilder,
  type PgColumn,
  type PgTable,
  type TableConfig,
} from 'drizzle-orm/pg-core';
import {
  and,
  or,
  eq,
  asc,
  desc,
  sql,
  getTableColumns,
  type SQL,
} from 'drizzle-orm';
import type {
  CrusherTable,
  RelationKeys,
  AllColumns,
  FilterOperator,
  ServerFilterNode,
} from '$lib/server/validation/query';

export type PaginatedResult<T> = {
  items: T[];
  has_more: boolean;
  next_cursor?: string;
};

type FilterFn = (col: PgColumn | SQL, value: string) => SQL;

export type OrderEntry = { column: string; direction: 'asc' | 'desc' };

const FILTER_OPS: Record<FilterOperator, FilterFn> = {
  eq: (col, val) => sql`${col} = ${val}`,
  neq: (col, val) => sql`${col} != ${val}`,
  gt: (col, val) => sql`${col} > ${val}`,
  gte: (col, val) => sql`${col} >= ${val}`,
  lt: (col, val) => sql`${col} < ${val}`,
  lte: (col, val) => sql`${col} <= ${val}`,
  contains: (col, val) => sql`${col} ILIKE ${'%' + val + '%'}`,
  not_contains: (col, val) => sql`${col} NOT ILIKE ${'%' + val + '%'}`,
  starts_with: (col, val) => sql`${col} ILIKE ${val + '%'}`,
  ends_with: (col, val) => sql`${col} ILIKE ${'%' + val}`,
  is_empty: (col) => sql`${col} = ''`,
  is_not_empty: (col) => sql`${col} != ''`,
  is_present: (col) => sql`${col} IS NOT NULL`,
  is_not_present: (col) => sql`${col} IS NULL`,
};

/**
 * Resolves a typed field string to its Drizzle column reference or SQL expression.
 *
 * Dot-notation is resolved in priority order:
 * 1. Relation column: `"party.name"` → `customer.name` (PgColumn)
 * 2. JSON field access: `"metadata.remarks"` → `metadata->>'remarks'` (SQL)
 */
export function resolve_column<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(table: T, relations: R | undefined, field: AllColumns<T, R>): PgColumn | SQL {
  const f = field as string;
  const dot = f.indexOf('.');

  if (dot !== -1) {
    const prefix = f.slice(0, dot);
    const key = f.slice(dot + 1);

    const rel_table = relations?.[prefix as string & keyof R] as
      | CrusherTable
      | undefined;
    if (rel_table) {
      const columns = getTableColumns(rel_table) as Record<string, PgColumn>;
      const column = columns[key];
      if (!column)
        throw new Error(`Unknown column "${key}" on relation "${prefix}"`);
      return column;
    }

    const table_columns = getTableColumns(table) as Record<string, PgColumn>;
    const json_col = table_columns[prefix];
    if (json_col) {
      return sql`${json_col}->>'${sql.raw(key)}'`;
    }

    throw new Error(`Unknown relation or column "${prefix}" in field "${f}"`);
  }

  const columns = getTableColumns(table) as Record<string, PgColumn>;
  const column = columns[f];
  if (!column) throw new Error(`Unknown column "${f}"`);
  return column;
}

/**
 * @deprecated Use `build_filter_tree` for tree-based filters with AND/OR logic.
 */
export function build_filters<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(
  table: T,
  relations: R | undefined,
  filters:
    | { field: AllColumns<T, R>; operator: FilterOperator; value: string }[]
    | undefined
): SQL[] {
  if (!filters?.length) return [];

  return filters.map(({ field, operator, value }) => {
    const col = resolve_column(table, relations, field);
    return FILTER_OPS[operator](col, value);
  });
}

/**
 * Recursively converts a `ServerFilterNode` tree into a single SQL
 * expression, preserving AND/OR group semantics.
 */
export function build_filter_tree<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(
  table: T,
  relations: R | undefined,
  node: ServerFilterNode<AllColumns<T, R>> | undefined
): SQL | undefined {
  if (!node) return undefined;

  if (node.type === 'condition') {
    const col = resolve_column(table, relations, node.field);
    return FILTER_OPS[node.operator](col, node.value);
  }

  const children = node.children
    .map((child) => build_filter_tree(table, relations, child))
    .filter((s): s is SQL => s != null);

  if (children.length === 0) return undefined;
  if (children.length === 1) return children[0];
  return node.logic === 'and' ? and(...children) : or(...children);
}

/**
 * Converts validated order_by params into Drizzle SQL order expressions.
 * Defaults to ascending when no direction is specified.
 */
export function build_order<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(
  table: T,
  relations: R | undefined,
  order_by:
    | { column: AllColumns<T, R>; direction?: 'asc' | 'desc' }[]
    | undefined
): SQL[] {
  if (!order_by?.length) return [];

  return order_by.map(({ column, direction }) => {
    const col = resolve_column(table, relations, column);
    return direction === 'desc' ? desc(col) : asc(col);
  });
}

type CursorEntry =
  | { t: 's'; v: string }
  | { t: 'n'; v: number }
  | { t: 'd'; v: string }
  | { t: 'x' };

type CursorPayload = { f: string[]; e: CursorEntry[] };

function encode_cursor_entry(value: unknown): CursorEntry {
  if (value === null || value === undefined) return { t: 'x' };
  if (value instanceof Date) return { t: 'd', v: value.toISOString() };
  if (typeof value === 'number') return { t: 'n', v: value };
  return { t: 's', v: String(value) };
}

function decode_cursor_entry(entry: CursorEntry): unknown {
  switch (entry.t) {
    case 'x':
      return null;
    case 'd':
      return entry.v;
    case 'n':
      return entry.v;
    case 's':
      return entry.v;
  }
}

export function encode_cursor(fields: string[], values: unknown[]): string {
  const payload: CursorPayload = {
    f: fields,
    e: values.map(encode_cursor_entry),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decode_cursor(
  cursor: string
): { fields: string[]; values: unknown[] } | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString();
    const payload: CursorPayload = JSON.parse(json);
    if (!Array.isArray(payload.f) || !Array.isArray(payload.e)) return null;
    if (payload.f.length !== payload.e.length) return null;
    return {
      fields: payload.f,
      values: payload.e.map(decode_cursor_entry),
    };
  } catch {
    return null;
  }
}

const DEFAULT_TIEBREAKERS: OrderEntry[] = [{ column: 'id', direction: 'desc' }];

/**
 * Merges the user's `order_by` with tiebreaker columns to produce a
 * deterministic sort. Tiebreaker entries are appended only when they
 * are not already present in the user order.
 *
 * When `table` is provided, the order is truncated after the first
 * column that is unique or a primary key — subsequent entries can
 * never change the row ordering so they are redundant.
 */
export function build_effective_order<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(
  order_by: OrderEntry[] | undefined,
  tiebreakers: OrderEntry[] = DEFAULT_TIEBREAKERS,
  table?: T,
  relations?: R
): OrderEntry[] {
  const merged: OrderEntry[] = order_by?.length ? [...order_by] : [];
  const existing = new Set(merged.map((o) => o.column));

  for (const tb of tiebreakers) {
    if (!existing.has(tb.column)) {
      merged.push(tb);
    }
  }

  if (!table) return merged;

  const effective: OrderEntry[] = [];
  for (const entry of merged) {
    effective.push(entry);
    try {
      const col = resolve_column(
        table,
        relations,
        entry.column as AllColumns<T, R>
      );
      if ('primary' in col && (col.primary || col.isUnique)) break;
    } catch {
      // unresolvable column — keep it, don't truncate
    }
  }

  return effective;
}

function build_sql_tuple(parts: SQL[]): SQL {
  let inner = parts[0];
  for (let i = 1; i < parts.length; i++) {
    inner = sql`${inner}, ${parts[i]}`;
  }
  return sql`(${inner})`;
}

type DirectionGroup = {
  start: number;
  count: number;
  direction: 'asc' | 'desc';
};

/**
 * Partitions effective_order into runs of consecutive same-direction
 * columns. e.g. `[DESC, ASC, DESC, DESC, DESC]` → 3 groups.
 */
function group_by_direction(dirs: ('asc' | 'desc')[]): DirectionGroup[] {
  const groups: DirectionGroup[] = [];
  let i = 0;
  while (i < dirs.length) {
    const start = i;
    const dir = dirs[i];
    while (i < dirs.length && dirs[i] === dir) i++;
    groups.push({ start, count: i - start, direction: dir });
  }
  return groups;
}

/**
 * Builds a tuple equality check: `(a, b) = (v1, v2)`.
 * Single-column groups produce `a = v1` (no tuple wrapping).
 * Falls back to per-column AND when any value is null, since
 * `(a, b) = (v1, NULL)` in SQL is always NULL/false.
 */
function build_tuple_eq(cols: (PgColumn | SQL)[], vals: unknown[]): SQL {
  const hasNull = vals.some((v) => v === null);
  if (cols.length === 1 || hasNull) {
    const parts = cols.map((c, i) =>
      vals[i] === null ? sql`${c} IS NULL` : sql`${c} = ${vals[i]}`
    );
    return parts.length === 1 ? parts[0] : and(...parts)!;
  }
  const colTuple = build_sql_tuple(cols.map((c) => sql`${c}`));
  const valTuple = build_sql_tuple(vals.map((v) => sql`${v}`));
  return sql`${colTuple} = ${valTuple}`;
}

/**
 * Builds a strict tuple comparison: `(a, b) < (v1, v2)` for DESC,
 * `(a, b) > (v1, v2)` for ASC. Single-column groups omit the tuple
 * wrapper.
 */
function build_tuple_cmp(
  cols: (PgColumn | SQL)[],
  vals: unknown[],
  direction: 'asc' | 'desc'
): SQL {
  if (cols.length === 1) {
    return direction === 'desc'
      ? sql`${cols[0]} < ${vals[0]}`
      : sql`${cols[0]} > ${vals[0]}`;
  }
  const colTuple = build_sql_tuple(cols.map((c) => sql`${c}`));
  const valTuple = build_sql_tuple(vals.map((v) => sql`${v}`));
  return direction === 'desc'
    ? sql`${colTuple} < ${valTuple}`
    : sql`${colTuple} > ${valTuple}`;
}

/**
 * Builds the keyset pagination WHERE clause from decoded cursor values
 * and the effective sort order.
 *
 * Groups consecutive same-direction columns and uses Postgres tuple
 * comparisons within each group, producing minimal OR branches:
 *
 * `[DESC, ASC, DESC, DESC, DESC]` →
 * ```sql
 * (a) < ($1)
 * OR ((a) = ($2) AND (b) > ($3))
 * OR ((a) = ($4) AND (b) = ($5) AND (c, d, e) < ($6, $7, $8))
 * ```
 */
export function build_keyset_where<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(
  table: T,
  relations: R | undefined,
  effective_order: OrderEntry[],
  cursor_values: unknown[]
): SQL | undefined {
  if (
    effective_order.length === 0 ||
    cursor_values.length === 0 ||
    effective_order.length !== cursor_values.length
  )
    return undefined;

  const cols = effective_order.map((e) =>
    resolve_column(table, relations, e.column as AllColumns<T, R>)
  );
  const dirs = effective_order.map((e) => e.direction);
  const groups = group_by_direction(dirs);

  const or_branches: SQL[] = [];

  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const groupCols = cols.slice(group.start, group.start + group.count);
    const groupVals = cursor_values.slice(
      group.start,
      group.start + group.count
    );

    if (groupVals.every((v) => v === null)) continue;

    const parts: SQL[] = [];

    for (let prev = 0; prev < g; prev++) {
      const p = groups[prev];
      const pCols = cols.slice(p.start, p.start + p.count);
      const pVals = cursor_values.slice(p.start, p.start + p.count);
      parts.push(build_tuple_eq(pCols, pVals));
    }

    parts.push(build_tuple_cmp(groupCols, groupVals, group.direction));

    or_branches.push(parts.length === 1 ? parts[0] : and(...parts)!);
  }

  if (or_branches.length === 0) return undefined;
  return or_branches.length === 1 ? or_branches[0] : or(...or_branches);
}

function extract_cursor_value(
  row: Record<string, unknown>,
  field: string
): unknown {
  if (field in row) return row[field];

  const dot = field.indexOf('.');
  if (dot !== -1) {
    const prefix = field.slice(0, dot);
    const suffix = field.slice(dot + 1);
    const nested = row[prefix];
    if (nested != null && typeof nested === 'object') {
      return (nested as Record<string, unknown>)[suffix];
    }
  }

  return undefined;
}

/**
 * Builds a Drizzle select map from the `fields` array.
 *
 * Each field resolves to its column via `resolve_column`; the field
 * string itself becomes the result key (e.g. `"party.name"` →
 * `{ "party.name": customer.name }`), producing a flat row shape
 * that matches the field names the client already knows.
 *
 * Returns `undefined` when no fields are specified (select all).
 */
export function build_select<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(
  table: T,
  relations: R | undefined,
  fields: AllColumns<T, R>[] | undefined
): Record<string, PgColumn | SQL> | undefined {
  if (!fields?.length) return undefined;

  const select: Record<string, PgColumn | SQL> = {};
  for (const field of fields) {
    select[field as string] = resolve_column(table, relations, field);
  }
  return select;
}

/**
 * @deprecated Use `create_list_query(...).paginate()` instead.
 */
export function paginate_result<T>(
  rows: T[],
  limit: number | undefined,
  backward: boolean
): PaginatedResult<T> {
  const has_more = limit ? rows.length > limit : false;
  const items = has_more ? rows.slice(0, limit) : [...rows];
  if (backward) items.reverse();
  return { items, has_more };
}

/**
 * Creates a composable query helper from validated list params.
 *
 * All types are inferred from the `table` and `relations` arguments —
 * filter fields, order columns, and operator types are fully checked
 * at compile time.
 *
 * ```ts
 * const q = create_list_query({
 *   table: delivery_slip,
 *   relations: { party: customer, vehicle, product },
 *   tiebreakers: [
 *     { column: 'created_at', direction: 'desc' },
 *     { column: 'id', direction: 'desc' },
 *   ],
 *   params: args,
 * });
 *
 * const rows = await db
 *   .select()
 *   .from(delivery_slip)
 *   .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
 *   .$dynamic()
 *   .where(q.where(eq(delivery_slip.state, 'pending')))
 *   .orderBy(...q.order())
 *   .limit(q.take ?? 100);
 *
 * return q.paginate(rows);
 * ```
 */
export function create_list_query<
  T extends CrusherTable,
  const R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(config: {
  table: T;
  relations?: R;
  tiebreakers?: OrderEntry[];
  params: {
    limit?: number;
    cursor?: string;
    starting_after?: string;
    ending_before?: string;
    fields?: AllColumns<T, R>[];
    filters?: ServerFilterNode<AllColumns<T, R>>;
    order_by?: { column: AllColumns<T, R>; direction?: 'asc' | 'desc' }[];
  };
}) {
  const { table, relations, params } = config;

  const normalized_order: OrderEntry[] = (params.order_by ?? []).map((o) => ({
    column: o.column as string,
    direction: o.direction ?? 'asc',
  }));

  const _effective_order = build_effective_order(
    normalized_order,
    config.tiebreakers,
    table,
    relations
  );

  const _select = build_select<T, R>(table, relations, params.fields);
  const _filter_sql = build_filter_tree<T, R>(table, relations, params.filters);

  let _keyset_where: SQL | undefined;
  if (params.cursor) {
    const decoded = decode_cursor(params.cursor);
    if (
      decoded &&
      decoded.fields.length === _effective_order.length &&
      decoded.fields.every((f, i) => f === _effective_order[i].column)
    ) {
      _keyset_where = build_keyset_where(
        table,
        relations,
        _effective_order,
        decoded.values
      );
    }
  } else if (params.starting_after || params.ending_before) {
    _keyset_where = _build_legacy_cursor_where(table, params);
  }

  const _backward =
    !params.cursor && !!params.ending_before && !params.starting_after;

  const _order_sql = _effective_order.map((entry) => {
    const col = resolve_column(
      table,
      relations,
      entry.column as AllColumns<T, R>
    );
    let dir = entry.direction;
    if (_backward) dir = dir === 'asc' ? 'desc' : 'asc';
    return dir === 'desc' ? desc(col) : asc(col);
  });

  return {
    /** Drizzle select map from `params.fields`, or `undefined` for select-all. */
    select: _select,

    /** Resolved filter SQL from `params.filters` tree. */
    filter_sql: _filter_sql,

    /** The full deterministic sort (user order + tiebreakers). */
    effective_order: _effective_order,

    /**
     * Combined WHERE: filter tree + keyset cursor + any extra conditions.
     * Returns `undefined` when empty — safe to pass to `.where()`.
     */
    where(...extra: (SQL | undefined)[]): SQL | undefined {
      const all = [
        _filter_sql,
        _keyset_where,
        ...extra.filter((s): s is SQL => s != null),
      ].filter((s): s is SQL => s != null);
      return all.length > 0 ? and(...all) : undefined;
    },

    /**
     * Combined ORDER BY from effective order + any extra expressions.
     * Always includes tiebreakers for deterministic pagination.
     */
    order(...extra: SQL[]): SQL[] {
      return [..._order_sql, ...extra];
    },

    /** `limit + 1` for has_more detection, or `undefined` if no limit. */
    get take(): number | undefined {
      return params.limit ? params.limit + 1 : undefined;
    },

    /** Whether pagination direction is backward (legacy only). */
    get backward(): boolean {
      return _backward;
    },

    /**
     * Slices rows, detects has_more, encodes next_cursor from the last row.
     *
     * Pass `cursor_row` when the raw row shape nests cursor fields under a
     * key (e.g. joined rows before mapping). When omitted, cursor values
     * are extracted directly from the row.
     */
    paginate<Row>(
      rows: Row[],
      cursor_row?: (row: Row) => Record<string, unknown>
    ): PaginatedResult<Row> {
      const has_more = params.limit ? rows.length > params.limit : false;
      const items = has_more ? rows.slice(0, params.limit) : [...rows];
      if (_backward) items.reverse();

      let next_cursor: string | undefined;
      if (has_more && items.length > 0) {
        const last = items[items.length - 1];
        const row_data = cursor_row
          ? cursor_row(last)
          : (last as Record<string, unknown>);
        const fields = _effective_order.map((e) => e.column);
        const values = fields.map((f) => extract_cursor_value(row_data, f));
        next_cursor = encode_cursor(fields, values);
      }

      return { items, has_more, next_cursor };
    },

    /**
     * Builds a standalone query for inspection / `.toSQL()`.
     * For actual execution, compose with `db.select()` instead.
     */
    to_query() {
      const qb = new QueryBuilder();
      let query = qb
        .select()
        .from(table as PgTable<TableConfig>)
        .$dynamic()
        .where(this.where())
        .orderBy(...this.order());

      if (this.take != null) query = query.limit(this.take);

      return query;
    },
  };
}

/** @deprecated Use `cursor` param with `create_list_query` instead. */
export function is_backward(params: {
  ending_before?: string;
  starting_after?: string;
}): boolean {
  return !!params.ending_before && !params.starting_after;
}

/**
 * Legacy keyset conditions using `(created_at, id)` tuple comparison.
 * Only correct when ORDER BY is `created_at DESC, id DESC`.
 * @deprecated Use `build_keyset_where` with decoded cursor values.
 */
export function build_cursor_where<T extends CrusherTable>(
  table: T,
  params: { starting_after?: string; ending_before?: string }
): SQL[] {
  const result = _build_legacy_cursor_where(table, params);
  return result ? [result] : [];
}

function _build_legacy_cursor_where<T extends CrusherTable>(
  table: T,
  params: { starting_after?: string; ending_before?: string }
): SQL | undefined {
  const { starting_after, ending_before } = params;

  if (starting_after) {
    return sql`(${table.created_at}, ${table.id}) < (
      SELECT ${table.created_at}, ${table.id} FROM ${table}
      WHERE ${table.id} = ${starting_after} LIMIT 1
    )`;
  }

  if (ending_before) {
    return sql`(${table.created_at}, ${table.id}) > (
      SELECT ${table.created_at}, ${table.id} FROM ${table}
      WHERE ${table.id} = ${ending_before} LIMIT 1
    )`;
  }

  return undefined;
}

/**
 * @deprecated Use `effective_order` from `create_list_query` instead.
 */
export function build_cursor_order<T extends CrusherTable>(
  table: T,
  params: { ending_before?: string; starting_after?: string }
): SQL[] {
  return is_backward(params)
    ? [asc(table.created_at), asc(table.id)]
    : [desc(table.created_at), desc(table.id)];
}
