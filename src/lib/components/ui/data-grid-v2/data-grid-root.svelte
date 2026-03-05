<script lang="ts" generics="TData, TValue">
  import type { Snippet } from 'svelte';
  import {
    getCoreRowModel,
    getSortedRowModel,
    type ColumnDef,
    type TableOptions,
  } from '@tanstack/table-core';
  import { untrack } from 'svelte';
  import { createSvelteTable } from '$lib/components/ui/data-table/index.js';
  import { createStyle } from '$lib/utils.js';
  import {
    DataGridState,
    setDataGrid,
    type ColumnLabelMap,
    type DataGridConfig,
    type FilterSchema,
    type RelationLoaderMap,
  } from './context.svelte';

  type RootProps = {
    columns: ColumnDef<TData, TValue>[];
    column_labels?: ColumnLabelMap;
    config?: DataGridConfig;
    filterSchema?: FilterSchema;
    relationLoaders?: RelationLoaderMap;
    children: Snippet;
  };

  let {
    columns,
    column_labels,
    config,
    filterSchema,
    relationLoaders,
    children,
  }: RootProps = $props();

  const grid = untrack(
    () =>
      new DataGridState<TData>({
        columns: columns as ColumnDef<TData, unknown>[],
        column_labels,
        config,
        filterSchema,
        relationLoaders,
      })
  );

  const columnResizeMode: TableOptions<TData>['columnResizeMode'] = 'onChange';

  const applyUpdater = <T,>(updater: T | ((prev: T) => T), current: T): T =>
    typeof updater === 'function'
      ? (updater as (prev: T) => T)(current)
      : updater;

  const table = createSvelteTable({
    get data() {
      return grid.data;
    },
    get columns() {
      return columns;
    },
    defaultColumn: {
      size: 200,
      minSize: 100,
      enableResizing: true,
      enablePinning: true,
    },
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualSorting: true,
    enableMultiSort: true,
    enableSortingRemoval: false,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (u) => {
      grid.sorting = applyUpdater(
        u,
        untrack(() => grid.sorting)
      );
    },
    onColumnOrderChange: (updater) => {
      if (typeof updater === 'function') {
        grid.layout.setOrder(updater(untrack(() => grid.layout.order)));
      } else {
        grid.layout.setOrder(updater);
      }
    },
    enableColumnPinning: true,
    onColumnPinningChange: (updater) => {
      if (typeof updater === 'function') {
        grid.layout.setPinning(updater(untrack(() => grid.layout.pinning)));
      } else {
        grid.layout.setPinning(updater);
      }
    },
    enableColumnResizing: true,
    columnResizeMode,
    onColumnSizingChange: (u) => {
      grid.columnSizing = applyUpdater(
        u,
        untrack(() => grid.columnSizing)
      );
    },
    onColumnSizingInfoChange: (u) => {
      grid.columnSizingInfo = applyUpdater(
        u,
        untrack(() => grid.columnSizingInfo)
      );
    },
    onColumnVisibilityChange: (u) => {
      grid.layout.setVisibility(
        applyUpdater(
          u,
          untrack(() => grid.layout.visibility)
        )
      );
    },
    onRowSelectionChange: (u) => {
      grid.rowSelection = applyUpdater(
        u,
        untrack(() => grid.rowSelection)
      );
    },
    state: {
      get columnFilters() {
        return grid.columnFilters;
      },
      get columnOrder() {
        return grid.layout.order;
      },
      get columnPinning() {
        return grid.layout.pinning;
      },
      get columnSizing() {
        return grid.columnSizing;
      },
      get columnSizingInfo() {
        return grid.columnSizingInfo;
      },
      get columnVisibility() {
        return grid.layout.visibility;
      },
      get rowSelection() {
        return grid.rowSelection;
      },
      get sorting() {
        return grid.sorting;
      },
    },
  });

  grid.table = table;
  setDataGrid(grid);
</script>

<div
  class="flex min-h-fit w-full grow flex-col"
  style={createStyle(grid.columnSizeVars)}
>
  {@render children()}
</div>
