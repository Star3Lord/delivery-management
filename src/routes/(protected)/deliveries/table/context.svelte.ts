import { getContext, setContext, createContext } from 'svelte';
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

class ColumnState {
  readonly props: ColumnStateProps;
  #columnOrder = $state<ColumnOrderState>([]);
  #columnPinning = $state<ColumnPinningState>({});
  #columnVisibility = $state<VisibilityState>({});
  #initialColumnOrder = $state<ColumnOrderState>([]);
  #initialColumnPinning = $state<ColumnPinningState>({});
  #initialColumnVisibility = $state<VisibilityState>({});

  constructor(props: ColumnStateProps) {
    this.props = props;
    this.#initialColumnOrder = props.order ?? [];
    this.#initialColumnPinning = props.pinning ?? {};
    this.#initialColumnVisibility = props.visibility ?? {};
    this.#columnOrder = props.order ?? [];
    this.#columnPinning = props.pinning ?? {};
    this.#columnVisibility = props.visibility ?? {};
  }

  get order() {
    return this.#columnOrder;
  }

  set order(value: ColumnOrderState) {
    this.#columnOrder = value;
  }

  get pinning() {
    return this.#columnPinning;
  }

  get visibility() {
    return this.#columnVisibility;
  }

  setOrder = (value: ColumnOrderState) => {
    this.#columnOrder = value;
  };

  setPinning = (value: ColumnPinningState) => {
    this.#columnPinning = value;
  };

  setVisibility = (value: VisibilityState) => {
    this.#columnVisibility = value;
  };

  toggleVisibility = (columnId: string, value: boolean) => {
    this.#columnVisibility[columnId] = value;
  };

  moveColumnLeft = (columnId: string) => {
    const newOrder = [...this.order];
    const index = newOrder.indexOf(columnId);
    if (index > 0) {
      newOrder.splice(index, 1);
      newOrder.splice(index - 1, 0, columnId);
    }
    this.setOrder(newOrder);
  };

  moveColumnRight = (columnId: string) => {
    const newOrder = [...this.order];
    const index = newOrder.indexOf(columnId);
    if (index < newOrder.length - 1) {
      newOrder.splice(index, 1);
      newOrder.splice(index + 1, 0, columnId);
    }
    this.setOrder(newOrder);
  };

  resetOrder = () => {
    this.setOrder(this.#initialColumnOrder);
  };
}

const SYMBOL_KEY = 'data-table-column-order';

export function setColumnState(props: ColumnStateProps): ColumnState {
  return setContext(Symbol.for(SYMBOL_KEY), new ColumnState(props));
}

export function useColumnState(): ColumnState {
  return getContext(Symbol.for(SYMBOL_KEY));
}

// export const [useColumnState, setColumnState] = createContext<ColumnState>();
