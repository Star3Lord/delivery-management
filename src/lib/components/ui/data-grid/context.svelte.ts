import { getContext, setContext } from 'svelte';
import {
  type ColumnOrderState,
  type ColumnPinningState,
  type VisibilityState,
} from '@tanstack/table-core';

export type ColumnStateProps = {
  order?: ColumnOrderState;
  pinning?: ColumnPinningState;
  visibility?: VisibilityState;
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

class ColumnState {
  readonly props: ColumnStateProps;
  #columnOrder = $state<ColumnOrderState>([]);
  #columnPinning = $state<ColumnPinningState>({});
  #columnVisibility = $state<VisibilityState>({});
  #initialColumnOrder = $state<ColumnOrderState>([]);
  #allColumnIds: string[] = [];

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
      if (!id || seen[id]) {
        continue;
      }
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
      if (!allowedIds.includes(id) || seenOrder[id]) {
        continue;
      }
      seenOrder[id] = true;
      normalizedOrder.push(id);
    }

    for (const id of allowedIds) {
      if (seenOrder[id]) {
        continue;
      }
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
        if (!allowedIds.includes(id) || seen[id] || alreadyPinned[id]) {
          continue;
        }
        seen[id] = true;
        next.push(id);
      }

      next.sort(
        (left, right) =>
          (orderIndex.get(left) ?? Number.MAX_SAFE_INTEGER) -
          (orderIndex.get(right) ?? Number.MAX_SAFE_INTEGER)
      );

      for (const id of next) {
        alreadyPinned[id] = true;
      }

      return next;
    };

    const left = normalizePinnedList(pinning.left);
    const right = normalizePinnedList(pinning.right);

    return {
      order: normalizedOrder,
      pinning: {
        left,
        right,
      },
    };
  };

  #getGroupedOrder = (): GroupedColumnOrder => {
    const leftMap: Record<string, true> = {};
    const rightMap: Record<string, true> = {};

    for (const id of this.#columnPinning.left ?? []) {
      leftMap[id] = true;
    }
    for (const id of this.#columnPinning.right ?? []) {
      rightMap[id] = true;
    }

    return {
      left: this.#columnOrder.filter((id) => leftMap[id]),
      free: this.#columnOrder.filter((id) => !leftMap[id] && !rightMap[id]),
      right: this.#columnOrder.filter((id) => rightMap[id]),
    };
  };

  #getColumnGroup = (
    columnId: string,
    groupedOrder: GroupedColumnOrder
  ): ColumnGroup => {
    if (groupedOrder.left.includes(columnId)) {
      return 'left';
    }
    if (groupedOrder.right.includes(columnId)) {
      return 'right';
    }
    return 'free';
  };

  #removeColumnFromGroups = (
    groupedOrder: GroupedColumnOrder,
    columnId: string
  ) => {
    groupedOrder.left = groupedOrder.left.filter((id) => id !== columnId);
    groupedOrder.free = groupedOrder.free.filter((id) => id !== columnId);
    groupedOrder.right = groupedOrder.right.filter((id) => id !== columnId);
  };

  #commitGroupedOrder = (groupedOrder: GroupedColumnOrder) => {
    this.setOrderAndPinning(
      [...groupedOrder.left, ...groupedOrder.free, ...groupedOrder.right],
      {
        left: groupedOrder.left,
        right: groupedOrder.right,
      }
    );
  };

  #canMoveColumn = (columnId: string, direction: 'left' | 'right') => {
    const groupedOrder = this.#getGroupedOrder();
    const group = this.#getColumnGroup(columnId, groupedOrder);
    const items = groupedOrder[group];
    const index = items.indexOf(columnId);

    if (index < 0) {
      return false;
    }
    return direction === 'left' ? index > 0 : index < items.length - 1;
  };

  #moveColumn = (columnId: string, direction: 'left' | 'right') => {
    const groupedOrder = this.#getGroupedOrder();
    const group = this.#getColumnGroup(columnId, groupedOrder);
    const items = groupedOrder[group];
    const index = items.indexOf(columnId);

    if (index < 0) {
      return;
    }

    const nextIndex = direction === 'left' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [movedColumnId] = nextItems.splice(index, 1);
    if (!movedColumnId) {
      return;
    }
    nextItems.splice(nextIndex, 0, movedColumnId);

    groupedOrder[group] = nextItems;
    this.#commitGroupedOrder(groupedOrder);
  };

  #pinColumn = (columnId: string, target: PinTarget) => {
    const groupedOrder = this.#getGroupedOrder();
    const wasLeftPinned = groupedOrder.left.includes(columnId);
    const wasRightPinned = groupedOrder.right.includes(columnId);

    this.#removeColumnFromGroups(groupedOrder, columnId);

    if (target === 'left') {
      groupedOrder.left.push(columnId);
    } else if (target === 'right') {
      // Keep the right-most pinned columns stable and prepend new ones.
      groupedOrder.right.unshift(columnId);
    } else if (wasLeftPinned) {
      groupedOrder.free.unshift(columnId);
    } else if (wasRightPinned) {
      groupedOrder.free.push(columnId);
    } else {
      groupedOrder.free.push(columnId);
    }

    this.#commitGroupedOrder(groupedOrder);
  };

  constructor(props: ColumnStateProps) {
    this.props = props;
    this.#allColumnIds = [...new Set(props.order ?? [])];

    const normalizedInitialLayout = this.#normalizeLayout(
      props.order ?? [],
      props.pinning ?? {}
    );

    this.#initialColumnOrder = [...normalizedInitialLayout.order];

    this.#columnOrder = [...normalizedInitialLayout.order];
    this.#columnPinning = {
      left: [...(normalizedInitialLayout.pinning.left ?? [])],
      right: [...(normalizedInitialLayout.pinning.right ?? [])],
    };
    this.#columnVisibility = props.visibility ?? {};
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
    const normalizedLayout = this.#normalizeLayout(order, pinning);
    const normalizedLeft = normalizedLayout.pinning.left ?? [];
    const normalizedRight = normalizedLayout.pinning.right ?? [];
    const currentLeft = this.#columnPinning.left ?? [];
    const currentRight = this.#columnPinning.right ?? [];

    if (
      arraysEqual(this.#columnOrder, normalizedLayout.order) &&
      arraysEqual(currentLeft, normalizedLeft) &&
      arraysEqual(currentRight, normalizedRight)
    ) {
      return;
    }

    this.#columnOrder = [...normalizedLayout.order];
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
}

const SYMBOL_KEY = 'data-grid-column-order';

export function setColumnState(props: ColumnStateProps): ColumnState {
  return setContext(Symbol.for(SYMBOL_KEY), new ColumnState(props));
}

export function useColumnState(): ColumnState {
  return getContext(Symbol.for(SYMBOL_KEY));
}

// ── Types ─────────────────────────────────────────────────────

export type ColumnLabelMap = Map<
  string,
  { label: string; icon?: { component: any; props?: Record<string, unknown> } }
>;

// ── Table config (mode, limit, etc.) ──────────────────────────

export type DataFetchMode = 'pagination' | 'infinite';
export type InfiniteTrigger = 'observer' | 'button';

export class TableConfig {
  mode = $state<DataFetchMode>('pagination');
  infinite_trigger = $state<InfiniteTrigger>('button');
  limit = $state(20);

  constructor(init?: {
    mode?: DataFetchMode;
    infinite_trigger?: InfiniteTrigger;
    limit?: number;
  }) {
    if (init?.mode) this.mode = init.mode;
    if (init?.infinite_trigger) this.infinite_trigger = init.infinite_trigger;
    if (init?.limit) this.limit = init.limit;
  }
}

const TABLE_CONFIG_KEY = Symbol.for('data-grid-table-config');

export function setTableConfig(
  init?: ConstructorParameters<typeof TableConfig>[0]
): TableConfig {
  return setContext(TABLE_CONFIG_KEY, new TableConfig(init));
}

export function useTableConfig(): TableConfig {
  return getContext<TableConfig>(TABLE_CONFIG_KEY);
}
