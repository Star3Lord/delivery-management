import {
  getContext,
  setContext,
  untrack,
  type Component,
  type Snippet,
} from 'svelte';
import { cn, createStyle } from '$lib/utils.js';
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingInfoState,
  type ColumnSizingState,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from '@tanstack/table-core';

export type ColumnLabelMap = Map<
  string,
  {
    label: string;
    icon?:
      | { component: Component; props?: Record<string, unknown> }
      | {
          snippet: Snippet<[{ props: Record<string, unknown> }]>;
          args?: [{ props: Record<string, unknown> }];
        };
  }
>;

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_present'
  | 'is_not_present';

export type {
  FilterDataType,
  FilterSchemaField,
  FilterSchema,
  RelationLoaderMap,
} from '$lib/server/validation/query';
import type {
  FilterSchema,
  RelationLoaderMap,
} from '$lib/server/validation/query';

export type FilterCondition = {
  type: 'condition';
  id: string;
  fieldKey: string;
  customJsonKey?: string;
  operator: FilterOperator | '';
  operand: string;
  enabled: boolean;
};

export type FilterGroup = {
  type: 'group';
  id: string;
  logic: 'and' | 'or';
  children: FilterNode[];
  enabled?: boolean;
};

export type FilterNode = FilterCondition | FilterGroup;

export type ServerFilterCondition = {
  type: 'condition';
  field: string;
  operator: FilterOperator;
  value: string;
};

export type ServerFilterGroup = {
  type: 'group';
  logic: 'and' | 'or';
  children: ServerFilterNode[];
};

export type ServerFilterNode = ServerFilterCondition | ServerFilterGroup;

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'equals',
  neq: 'not equals',
  gt: 'greater than',
  gte: 'greater or equal',
  lt: 'less than',
  lte: 'less or equal',
  contains: 'contains',
  not_contains: 'not contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  is_present: 'is present',
  is_not_present: 'is not present',
};

export const RELATION_OPERATOR_LABELS: Partial<Record<FilterOperator, string>> =
  {
    eq: 'is',
    neq: 'is not',
  };

export const NO_VALUE_OPERATORS = new Set<FilterOperator>([
  'is_empty',
  'is_not_empty',
  'is_present',
  'is_not_present',
]);

let _filterId = 0;
export function createFilterId(): string {
  return `filter-${++_filterId}`;
}

export function createRootFilterGroup(): FilterGroup {
  return { type: 'group', id: 'root', logic: 'and', children: [] };
}

/**
 * Converts a UI `FilterGroup` tree into a `ServerFilterGroup` tree.
 * With schema-driven filters, `fieldKey` already IS the server field path,
 * so no mapping is needed for standard fields. For JSON custom sub-fields,
 * the field is constructed from the schema field's group + customJsonKey.
 */
export function buildServerFilterTree(node: FilterGroup): ServerFilterGroup {
  return {
    type: 'group',
    logic: node.logic,
    children: node.children
      .map((child): ServerFilterNode | null => {
        if (
          child.type === 'condition' &&
          child.enabled &&
          child.fieldKey &&
          child.operator &&
          (child.operand || NO_VALUE_OPERATORS.has(child.operator))
        ) {
          const field = child.customJsonKey
            ? `${child.fieldKey.split('.')[0]}.${child.customJsonKey}`
            : child.fieldKey;
          return {
            type: 'condition',
            field,
            operator: child.operator,
            value: child.operand,
          };
        }
        if (child.type === 'group' && child.enabled !== false) {
          const group = buildServerFilterTree(child);
          return group.children.length > 0 ? group : null;
        }
        return null;
      })
      .filter((n): n is ServerFilterNode => n != null),
  };
}

export type DataGridConfig = {
  column_order: string[];
  column_pinning: { left: string[]; right: string[] };
  column_visibility: Record<string, boolean>;
  column_sizing: Record<string, number>;
  sorting: { id: string; desc: boolean }[];
  filters?: FilterGroup;
};

const arraysEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

type NormalizedColumnLayout = {
  order: ColumnOrderState;
  pinning: ColumnPinningState;
};
type ColumnGroup = 'left' | 'free' | 'right';
type GroupedColumnOrder = Record<ColumnGroup, string[]>;
type PinTarget = 'left' | 'right' | false;

export type ColumnLayoutInit = {
  order?: ColumnOrderState;
  pinning?: ColumnPinningState;
  visibility?: VisibilityState;
};

export class ColumnLayout {
  #columnOrder = $state.raw<ColumnOrderState>([]);
  #columnPinning = $state.raw<ColumnPinningState>({});
  #columnVisibility = $state<VisibilityState>({});
  #initialColumnOrder: ColumnOrderState = [];
  #allColumnIds: string[] = [];

  constructor(init: ColumnLayoutInit) {
    this.#allColumnIds = [...new Set(init.order ?? [])];

    const normalized = this.#normalizeLayout(
      init.order ?? [],
      init.pinning ?? {}
    );

    this.#initialColumnOrder = [...normalized.order];
    this.#columnOrder = [...normalized.order];
    this.#columnPinning = {
      left: [...(normalized.pinning.left ?? [])],
      right: [...(normalized.pinning.right ?? [])],
    };
    this.#columnVisibility = init.visibility ?? {};
  }

  get order() {
    return this.#columnOrder;
  }

  set order(value: ColumnOrderState) {
    this.setOrder(value);
  }

  get pinning() {
    return this.#columnPinning;
  }

  get visibility() {
    return this.#columnVisibility;
  }

  setOrder = (value: ColumnOrderState) => {
    this.setOrderAndPinning(value, this.#columnPinning);
  };

  setPinning = (value: ColumnPinningState) => {
    this.setOrderAndPinning(this.#columnOrder, value);
  };

  setOrderAndPinning = (
    order: ColumnOrderState,
    pinning: ColumnPinningState
  ) => {
    const normalized = this.#normalizeLayout(order, pinning);
    const normalizedLeft = normalized.pinning.left ?? [];
    const normalizedRight = normalized.pinning.right ?? [];
    const currentLeft = this.#columnPinning.left ?? [];
    const currentRight = this.#columnPinning.right ?? [];

    if (
      arraysEqual(this.#columnOrder, normalized.order) &&
      arraysEqual(currentLeft, normalizedLeft) &&
      arraysEqual(currentRight, normalizedRight)
    ) {
      return;
    }

    this.#columnOrder = [...normalized.order];
    this.#columnPinning = {
      left: [...normalizedLeft],
      right: [...normalizedRight],
    };
  };

  setVisibility = (value: VisibilityState) => {
    this.#columnVisibility = value;
  };

  toggleVisibility = (columnId: string, value: boolean) => {
    this.#columnVisibility[columnId] = value;
  };

  moveColumnLeft = (columnId: string) => {
    this.#moveColumn(columnId, 'left');
  };

  moveColumnRight = (columnId: string) => {
    this.#moveColumn(columnId, 'right');
  };

  canMoveColumnLeft = (columnId: string) => {
    return this.#canMoveColumn(columnId, 'left');
  };

  canMoveColumnRight = (columnId: string) => {
    return this.#canMoveColumn(columnId, 'right');
  };

  pinColumn = (columnId: string, target: PinTarget) => {
    this.#pinColumn(columnId, target);
  };

  resetOrder = () => {
    this.setOrder([...this.#initialColumnOrder]);
  };

  #collectAllowedColumnIds = (
    order: ColumnOrderState,
    pinning: ColumnPinningState
  ): string[] => {
    const mergedIds = [
      ...this.#allColumnIds,
      ...order,
      ...(pinning.left ?? []),
      ...(pinning.right ?? []),
    ];
    const seen: Record<string, true> = {};
    const allowedIds: string[] = [];
    for (const id of mergedIds) {
      if (!id || seen[id]) continue;
      seen[id] = true;
      allowedIds.push(id);
    }
    return allowedIds;
  };

  #normalizeLayout = (
    order: ColumnOrderState,
    pinning: ColumnPinningState
  ): NormalizedColumnLayout => {
    const allowedIds = this.#collectAllowedColumnIds(order, pinning);
    const normalizedOrder: string[] = [];
    const seenOrder: Record<string, true> = {};

    for (const id of order) {
      if (!allowedIds.includes(id) || seenOrder[id]) continue;
      seenOrder[id] = true;
      normalizedOrder.push(id);
    }
    for (const id of allowedIds) {
      if (seenOrder[id]) continue;
      seenOrder[id] = true;
      normalizedOrder.push(id);
    }

    const orderIndex = new Map(
      normalizedOrder.map((columnId, index) => [columnId, index])
    );
    const alreadyPinned: Record<string, true> = {};

    const normalizePinnedList = (ids: string[] | undefined) => {
      const next: string[] = [];
      const seen: Record<string, true> = {};
      for (const id of ids ?? []) {
        if (!allowedIds.includes(id) || seen[id] || alreadyPinned[id]) continue;
        seen[id] = true;
        next.push(id);
      }
      next.sort(
        (left, right) =>
          (orderIndex.get(left) ?? Number.MAX_SAFE_INTEGER) -
          (orderIndex.get(right) ?? Number.MAX_SAFE_INTEGER)
      );
      for (const id of next) alreadyPinned[id] = true;
      return next;
    };

    return {
      order: normalizedOrder,
      pinning: {
        left: normalizePinnedList(pinning.left),
        right: normalizePinnedList(pinning.right),
      },
    };
  };

  #getGroupedOrder = (): GroupedColumnOrder => {
    const leftMap: Record<string, true> = {};
    const rightMap: Record<string, true> = {};
    for (const id of this.#columnPinning.left ?? []) leftMap[id] = true;
    for (const id of this.#columnPinning.right ?? []) rightMap[id] = true;
    return {
      left: this.#columnOrder.filter((id) => leftMap[id]),
      free: this.#columnOrder.filter((id) => !leftMap[id] && !rightMap[id]),
      right: this.#columnOrder.filter((id) => rightMap[id]),
    };
  };

  #getColumnGroup = (
    columnId: string,
    grouped: GroupedColumnOrder
  ): ColumnGroup => {
    if (grouped.left.includes(columnId)) return 'left';
    if (grouped.right.includes(columnId)) return 'right';
    return 'free';
  };

  #removeColumnFromGroups = (grouped: GroupedColumnOrder, columnId: string) => {
    grouped.left = grouped.left.filter((id) => id !== columnId);
    grouped.free = grouped.free.filter((id) => id !== columnId);
    grouped.right = grouped.right.filter((id) => id !== columnId);
  };

  #commitGroupedOrder = (grouped: GroupedColumnOrder) => {
    this.setOrderAndPinning(
      [...grouped.left, ...grouped.free, ...grouped.right],
      { left: grouped.left, right: grouped.right }
    );
  };

  #canMoveColumn = (columnId: string, direction: 'left' | 'right') => {
    const grouped = this.#getGroupedOrder();
    const group = this.#getColumnGroup(columnId, grouped);
    const items = grouped[group];
    const index = items.indexOf(columnId);
    if (index < 0) return false;
    return direction === 'left' ? index > 0 : index < items.length - 1;
  };

  #moveColumn = (columnId: string, direction: 'left' | 'right') => {
    const grouped = this.#getGroupedOrder();
    const group = this.#getColumnGroup(columnId, grouped);
    const items = grouped[group];
    const index = items.indexOf(columnId);
    if (index < 0) return;

    const nextIndex = direction === 'left' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    if (!moved) return;
    nextItems.splice(nextIndex, 0, moved);

    grouped[group] = nextItems;
    this.#commitGroupedOrder(grouped);
  };

  #pinColumn = (columnId: string, target: PinTarget) => {
    const grouped = this.#getGroupedOrder();
    const wasLeft = grouped.left.includes(columnId);
    const wasRight = grouped.right.includes(columnId);

    this.#removeColumnFromGroups(grouped, columnId);

    if (target === 'left') {
      grouped.left.push(columnId);
    } else if (target === 'right') {
      grouped.right.unshift(columnId);
    } else if (wasLeft) {
      grouped.free.unshift(columnId);
    } else if (wasRight) {
      grouped.free.push(columnId);
    } else {
      grouped.free.push(columnId);
    }

    this.#commitGroupedOrder(grouped);
  };
}

export type DataGridInit<TData> = {
  columns: ColumnDef<TData, unknown>[];
  column_labels?: ColumnLabelMap;
  config?: DataGridConfig;
  filterSchema?: FilterSchema;
  relationLoaders?: RelationLoaderMap;
};

export class DataGridState<TData = unknown> {
  table!: Table<TData>;
  columns: ColumnDef<TData, unknown>[];
  column_labels: ColumnLabelMap | undefined;
  filterSchema: FilterSchema;
  relationLoaders: RelationLoaderMap;

  layout: ColumnLayout;

  #data = $state.raw<TData[]>([]);
  filterTree = $state.raw<FilterGroup>(createRootFilterGroup());

  columnFilters = $derived.by(
    (): ColumnFiltersState => this.#flattenTreeToColumnFilters(this.filterTree)
  );
  columnSizing = $state.raw<ColumnSizingState>({});
  columnSizingInfo = $state.raw<ColumnSizingInfoState>({
    columnSizingStart: [],
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    startOffset: null,
    startSize: null,
  });
  rowSelection = $state.raw<RowSelectionState>({});
  sorting = $state.raw<SortingState>([]);

  headerScrollerEl: HTMLDivElement | undefined;

  columnSizeVars = $derived.by(() => this.#computeColumnSizeVars());

  /**
   * Pre-computed style + class strings per visible column.
   * Cell styles reference CSS var names (not values), so this cache is stable
   * during resize — it only recomputes when columns/pinning/visibility change.
   */
  cellColumnCache = $derived.by(() => {
    const cols = this.table?.getVisibleLeafColumns() ?? [];
    const cache = new Map<string, { style: string; class: string }>();

    for (const col of cols) {
      const leftBorder = this.#borderClassMap.get(col.id)?.left;
      const rightBorder = this.#borderClassMap.get(col.id)?.right ?? 'border-r';

      const className = cn(
        'min-h-8 truncate border-b border-border bg-clip-border! px-3 py-1 align-middle text-sm font-medium text-ellipsis [&:has([role=checkbox])]:pr-0',
        // this.getLeftBorderClass(col),
        // this.getRightBorderClass(col),
        leftBorder,
        rightBorder,
        this.getCellMeta(col)?.class
      );

      const style = createStyle({
        contain: 'layout style paint',
        ...this.getCellMeta(col)?.style,
        width: `calc(var(--col-${col.id}-size) * 1px)`,
        'min-width': `calc(var(--col-${col.id}-size) * 1px)`,
        'max-width': `calc(var(--col-${col.id}-size) * 1px)`,
        ...this.getCellStyles(col),
      });

      cache.set(col.id, { style, class: className });
    }

    return cache;
  });

  #borderClassMap = $derived.by(() => {
    // Recomputes when visible columns change (order, pinning, visibility)
    const cols = this.table?.getVisibleLeafColumns() ?? [];
    const map = new Map<string, { left?: string; right: string }>();
    if (cols.length === 0) return map;

    const lastId = cols[cols.length - 1]!.id;
    const hasRightPinned = cols.some((c) => c.getIsPinned() === 'right');

    const centerCols = cols.filter((c) => c.getIsPinned() === false);
    const lastCenterId = centerCols[centerCols.length - 1]?.id;

    for (const col of cols) {
      const isLast = col.id === lastId;
      const isLastCenter =
        col.getIsPinned() === false && col.id === lastCenterId;
      const isFirstRight =
        col.getIsPinned() === 'right' && col.getIsFirstColumn('right');

      map.set(col.id, {
        right:
          isLast || (hasRightPinned && isLastCenter)
            ? 'border-r-0'
            : 'border-r',
        left: isFirstRight ? 'border-l' : undefined,
      });
    }
    return map;
  });

  constructor(init: DataGridInit<TData>) {
    this.columns = init.columns;
    this.column_labels = init.column_labels;
    this.filterSchema = init.filterSchema ?? [];
    this.relationLoaders = init.relationLoaders ?? {};

    const cfg = init.config;
    const defaultOrder = init.columns.map(
      (c) => c.id || ((c as { accessorKey?: string }).accessorKey as string)
    );

    this.layout = new ColumnLayout({
      order: cfg?.column_order ?? defaultOrder,
      pinning: cfg?.column_pinning ?? { left: [], right: [] },
      visibility: cfg?.column_visibility ?? {},
    });

    if (cfg?.column_sizing) this.columnSizing = cfg.column_sizing;
    if (cfg?.sorting) {
      this.sorting = cfg.sorting.map((s) => ({ id: s.id, desc: s.desc }));
    }
    if (cfg?.filters) {
      this.filterTree = cfg.filters;
    }
  }

  get data() {
    return this.#data;
  }

  setData(data: TData[]) {
    this.#data = data;
  }

  config = $derived.by(
    (): DataGridConfig => ({
      column_order: [...this.layout.order],
      column_pinning: {
        left: [...(this.layout.pinning.left ?? [])],
        right: [...(this.layout.pinning.right ?? [])],
      },
      column_visibility: Object.fromEntries(
        Object.entries(this.layout.visibility)
      ),
      column_sizing: Object.fromEntries(Object.entries(this.columnSizing)),
      sorting: this.sorting.map((s) => ({ id: s.id, desc: s.desc })),
      filters: structuredClone(this.filterTree) as FilterGroup,
    })
  );

  serverFilters = $derived.by(
    (): ServerFilterGroup => buildServerFilterTree(this.filterTree)
  );

  addCondition = (
    fieldKey: string,
    operator: FilterOperator,
    operand: string,
    parentId = 'root'
  ): string => {
    const id = createFilterId();
    const condition: FilterCondition = {
      type: 'condition',
      id,
      fieldKey,
      operator,
      operand,
      enabled: true,
    };
    this.filterTree = this.#insertNode(this.filterTree, parentId, condition);
    return id;
  };

  updateCondition = (
    conditionId: string,
    updates: Partial<
      Pick<
        FilterCondition,
        'fieldKey' | 'customJsonKey' | 'operator' | 'operand' | 'enabled'
      >
    >
  ) => {
    this.filterTree = this.#updateNode(this.filterTree, conditionId, updates);
  };

  removeNode = (nodeId: string) => {
    this.filterTree = this.#removeNodeById(this.filterTree, nodeId);
  };

  addGroup = (logic: 'and' | 'or', parentId = 'root'): string => {
    const id = createFilterId();
    const group: FilterGroup = { type: 'group', id, logic, children: [] };
    this.filterTree = this.#insertNode(this.filterTree, parentId, group);
    return id;
  };

  updateGroupLogic = (groupId: string, logic: 'and' | 'or') => {
    this.filterTree = this.#updateGroupLogicById(
      this.filterTree,
      groupId,
      logic
    );
  };

  clearFilters = () => {
    this.filterTree = createRootFilterGroup();
  };

  getFilterableFields = (): FilterSchema => {
    return this.filterSchema;
  };

  syncHeaderScroll = (event: Event) => {
    const body = event.currentTarget as HTMLDivElement | null;
    if (!this.headerScrollerEl || !body) return;
    this.headerScrollerEl.scrollLeft = body.scrollLeft;
  };

  getCommonPinningStyles(column: Column<TData>) {
    const isPinned = column.getIsPinned();
    const isLastLeft = isPinned === 'left' && column.getIsLastColumn('left');
    return {
      'box-shadow': isLastLeft
        ? '-1px 0 0 0 hsl(var(--border)) inset'
        : undefined,
      left:
        isPinned === 'left'
          ? `calc(var(--pin-left-${column.id}) * 1px)`
          : undefined,
      right:
        isPinned === 'right'
          ? `calc(var(--pin-right-${column.id}) * 1px)`
          : undefined,
    };
  }

  getHeaderStyles(column: Column<TData>) {
    const isPinned = column.getIsPinned();
    return {
      ...this.getCommonPinningStyles(column),
      position: isPinned ? 'sticky' : 'relative',
      'z-index': isPinned ? 2 : 1,
      'background-color': 'var(--table-header-bg)',
      'background-clip': 'border-box',
      'box-sizing': 'border-box',
      isolation: isPinned ? 'isolate' : undefined,
    };
  }

  getCellStyles(column: Column<TData>) {
    const isPinned = column.getIsPinned();
    return {
      ...this.getCommonPinningStyles(column),
      position: isPinned ? 'sticky' : 'relative',
      'z-index': isPinned ? 1 : 0,
      'background-color': 'var(--row-bg, var(--table-body-bg))',
      'background-clip': 'border-box',
      'box-sizing': 'border-box',
      isolation: isPinned ? 'isolate' : undefined,
    };
  }

  getHeaderMeta(column: Column<TData>) {
    return (
      column.columnDef?.meta as {
        header?: {
          class?: string;
          style?: CSSStyleDeclaration;
          [key: string]: unknown;
        };
      }
    )?.header;
  }

  getCellMeta(column: Column<TData>) {
    return (
      column.columnDef?.meta as {
        cell?: {
          class?: string;
          style?: CSSStyleDeclaration;
          [key: string]: unknown;
        };
      }
    )?.cell;
  }

  getRightBorderClass(column: Column<TData>): string {
    return this.#borderClassMap.get(column.id)?.right ?? 'border-r';
  }

  getLeftBorderClass(column: Column<TData>): string | undefined {
    return this.#borderClassMap.get(column.id)?.left;
  }

  #flattenTreeToColumnFilters(node: FilterGroup): ColumnFiltersState {
    const result: ColumnFiltersState = [];
    for (const child of node.children) {
      if (child.type === 'condition' && child.enabled) {
        result.push({
          id: child.fieldKey,
          value: { operator: child.operator, operand: child.operand },
        });
      } else if (child.type === 'group') {
        result.push(...this.#flattenTreeToColumnFilters(child));
      }
    }
    return result;
  }

  #insertNode(
    tree: FilterGroup,
    parentId: string,
    node: FilterNode
  ): FilterGroup {
    if (tree.id === parentId) {
      return { ...tree, children: [...tree.children, node] };
    }
    return {
      ...tree,
      children: tree.children.map((child) =>
        child.type === 'group' ? this.#insertNode(child, parentId, node) : child
      ),
    };
  }

  #removeNodeById(tree: FilterGroup, nodeId: string): FilterGroup {
    return {
      ...tree,
      children: tree.children
        .filter((child) => child.id !== nodeId)
        .map((child) =>
          child.type === 'group' ? this.#removeNodeById(child, nodeId) : child
        ),
    };
  }

  #updateNode(
    tree: FilterGroup,
    nodeId: string,
    updates: Partial<
      Pick<
        FilterCondition,
        'fieldKey' | 'customJsonKey' | 'operator' | 'operand' | 'enabled'
      >
    >
  ): FilterGroup {
    return {
      ...tree,
      children: tree.children.map((child) => {
        if (child.id === nodeId && child.type === 'condition') {
          return { ...child, ...updates };
        }
        if (child.type === 'group') {
          return this.#updateNode(child, nodeId, updates);
        }
        return child;
      }),
    };
  }

  #updateGroupLogicById(
    tree: FilterGroup,
    groupId: string,
    logic: 'and' | 'or'
  ): FilterGroup {
    if (tree.id === groupId) {
      return { ...tree, logic };
    }
    return {
      ...tree,
      children: tree.children.map((child) =>
        child.type === 'group'
          ? this.#updateGroupLogicById(child, groupId, logic)
          : child
      ),
    };
  }

  #computeColumnSizeVars(): Record<string, number> {
    if (!this.table) return {};
    const headers = this.table.getFlatHeaders();
    const vars: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]!;
      vars[`--header-${h.id}-size`] = h.getSize();
      vars[`--col-${h.column.id}-size`] = h.column.getSize();
    }
    for (const col of this.table.getVisibleLeafColumns()) {
      const pin = col.getIsPinned();
      if (pin === 'left') {
        vars[`--pin-left-${col.id}`] = col.getStart('left');
      } else if (pin === 'right') {
        vars[`--pin-right-${col.id}`] = col.getAfter('right');
      }
    }
    // Keep key insertion order deterministic so style strings stay stable
    // across pure reorder operations where var values didn't change.
    const stableVars: Record<string, number> = {};
    for (const [key, value] of Object.entries(vars).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      stableVars[key] = value;
    }
    return stableVars;
  }
}

const DATAGRID_V2_KEY = Symbol.for('data-grid-v2');

export function setDataGrid<TData>(state: DataGridState<TData>) {
  return setContext(DATAGRID_V2_KEY, state);
}

export function useDataGrid<TData = unknown>(): DataGridState<TData> {
  return getContext<DataGridState<TData>>(DATAGRID_V2_KEY);
}
