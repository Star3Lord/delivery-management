import * as v from 'valibot';
import {
  and,
  lt,
  gt,
  lte,
  gte,
  desc,
  asc,
  sql,
  getTableColumns,
  type SQL,
} from 'drizzle-orm';
import {
  customer,
  product,
  vehicle,
  delivery_slip,
  bill,
  bill_item,
  receipt,
} from '$lib/server/db/schema';

export type CrusherTable =
  | typeof bill
  | typeof bill_item
  | typeof customer
  | typeof delivery_slip
  | typeof product
  | typeof receipt
  | typeof vehicle;

export type RelationKeys<T extends CrusherTable> = {
  [K in keyof T['$inferSelect'] & string]: K extends `${infer Prefix}_id`
    ? Prefix
    : never;
}[keyof T['$inferSelect'] & string];

export type RelationColumns<R extends Partial<Record<string, CrusherTable>>> = {
  [K in keyof R & string]: R[K] extends CrusherTable
    ? `${K}.${keyof R[K]['$inferSelect'] & string}`
    : never;
}[keyof R & string];

export type AllColumns<
  T extends CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
> = (keyof T['$inferSelect'] & string) | RelationColumns<R>;

export type ListQueryParams<
  T extends CrusherTable = CrusherTable,
  R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
> = v.InferOutput<ReturnType<typeof create_list_query_validator<T, R>>>;

const date_range_filter = v.object({
  greater_than_or_equal_to: v.optional(v.string()),
  greater_than: v.optional(v.string()),
  less_than_or_equal_to: v.optional(v.string()),
  less_than: v.optional(v.string()),
});

const filter_operator = v.union([
  v.literal('eq'),
  v.literal('neq'),
  v.literal('gt'),
  v.literal('gte'),
  v.literal('lt'),
  v.literal('lte'),
  v.literal('contains'),
  v.literal('not_contains'),
  v.literal('starts_with'),
  v.literal('ends_with'),
  v.literal('is_empty'),
  v.literal('is_not_empty'),
  v.literal('is_present'),
  v.literal('is_not_present'),
]);

export type FilterOperator = v.InferOutput<typeof filter_operator>;

export type ServerFilterCondition<Cols extends string = string> = {
  type: 'condition';
  field: Cols;
  operator: FilterOperator;
  value: string;
};

export type ServerFilterGroup<Cols extends string = string> = {
  type: 'group';
  logic: 'and' | 'or';
  children: ServerFilterNode<Cols>[];
};

export type ServerFilterNode<Cols extends string = string> =
  | ServerFilterCondition<Cols>
  | ServerFilterGroup<Cols>;

export type JsonFieldDef = { column: string; keys: readonly string[] };

// ── Filter Schema (client-side, serializable) ──────────────────────────

export type FilterDataType =
  | 'string'
  | 'number'
  | 'date'
  | 'enum'
  | 'boolean'
  | 'relation';

export type FilterSchemaField = {
  key: string;
  label: string;
  type: FilterDataType;
  operators: FilterOperator[];
  options?: { label: string; value: string }[];
  group?: string;
  groupLabel?: string;
  loaderKey?: string;
  jsonCustomSubField?: {
    type: FilterDataType;
    operators: FilterOperator[];
  };
};

export type FilterSchema = FilterSchemaField[];

export type RelationLoaderMap = Record<
  string,
  () => Promise<{ label: string; value: string }[]>
>;

/**
 * Creates a filter schema validated against the actual DB table/relations.
 * Every field `key` must be a valid column path (table column, relation.column,
 * or jsonColumn.key). Throws at startup if a key is invalid.
 */
export function create_filter_schema<
  T extends CrusherTable,
  const R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(
  table: T,
  relations: R | undefined,
  options: { jsonFields?: JsonFieldDef[] } | undefined,
  fields: FilterSchemaField[]
): FilterSchema {
  const validColumns = new Set<string>(Object.keys(getTableColumns(table)));

  if (relations) {
    for (const [prefix, relTable] of Object.entries(relations) as [
      string,
      CrusherTable,
    ][]) {
      for (const col of Object.keys(getTableColumns(relTable))) {
        validColumns.add(`${prefix}.${col}`);
      }
    }
  }

  if (options?.jsonFields) {
    for (const { column, keys } of options.jsonFields) {
      for (const key of keys) {
        validColumns.add(`${column}.${key}`);
      }
    }
  }

  for (const field of fields) {
    if (field.jsonCustomSubField) continue;
    if (!validColumns.has(field.key)) {
      throw new Error(
        `create_filter_schema: unknown field key "${field.key}". ` +
          `Valid columns: ${[...validColumns].join(', ')}`
      );
    }
  }

  return fields;
}

export function create_list_query_validator<
  T extends CrusherTable,
  const R extends Partial<Record<RelationKeys<T>, CrusherTable>> = {},
>(table: T, relations?: R, options?: { jsonFields?: JsonFieldDef[] }) {
  const allColumns: string[] = Object.keys(getTableColumns(table));

  if (relations) {
    for (const [prefix, relTable] of Object.entries(relations) as [
      RelationKeys<T>,
      CrusherTable,
    ][]) {
      for (const col of Object.keys(
        getTableColumns(relTable)
      ) as (keyof CrusherTable['$inferSelect'])[]) {
        allColumns.push(`${prefix}.${col}`);
      }
    }
  }

  if (options?.jsonFields) {
    for (const { column, keys } of options.jsonFields) {
      for (const key of keys) {
        allColumns.push(`${column}.${key}`);
      }
    }
  }

  const columns = allColumns as [AllColumns<T, R>, ...AllColumns<T, R>[]];

  const filter_condition = v.object({
    type: v.literal('condition'),
    field: v.picklist(columns),
    operator: filter_operator,
    value: v.string(),
  });

  const filter_node: v.GenericSchema<ServerFilterNode<AllColumns<T, R>>> =
    v.union([
      filter_condition,
      v.object({
        type: v.literal('group'),
        logic: v.union([v.literal('and'), v.literal('or')]),
        children: v.array(v.lazy(() => filter_node)),
      }),
    ]);

  return v.object({
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    starting_after: v.optional(v.string()),
    ending_before: v.optional(v.string()),
    fields: v.optional(v.array(v.picklist(columns))),
    filters: v.optional(filter_node),
    order_by: v.optional(
      v.array(
        v.object({
          column: v.picklist(columns),
          direction: v.optional(v.union([v.literal('asc'), v.literal('desc')])),
        })
      )
    ),
  });
}
