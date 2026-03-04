<script lang="ts" generics="TData, TValue">
  import type { Snippet } from 'svelte';
  import {
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    type Column,
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnSizingState,
    type ColumnSizingInfoState,
    type RowSelectionState,
    type SortingState,
    type Table,
    type TableOptions,
  } from '@tanstack/table-core';
  import ColumnsThree from '@lucide/svelte/icons/columns-3';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    createSvelteTable,
    FlexRender,
  } from '$lib/components/ui/data-table/index.js';
  import * as TableUI from '$lib/components/ui/table/index.js';
  import { cn, createStyle } from '$lib/utils.js';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import { Spinner } from '$lib/components/ui/spinner/index.js';
  import ColumnResizer from './column-resizer.svelte';
  import ViewSettings from './view-settings.svelte';
  import { useColumnState, type ColumnLabelMap } from './context.svelte';

  type DataGridProps<TData, TValue> = {
    data: TData[];
    columns: ColumnDef<TData, TValue>[];
    column_labels?: ColumnLabelMap;
    loading?: boolean;
    loading_rows?: number;
    toolbar?: Snippet<[{ table: Table<TData> }]>;
    actions?: Snippet<[{ table: Table<TData> }]>;
    footer?: Snippet<[{ table: Table<TData> }]>;
    after_rows?: Snippet;
  };

  let {
    data,
    columns,
    column_labels,
    loading = false,
    loading_rows = 5,
    toolbar,
    actions,
    footer,
    after_rows,
  }: DataGridProps<TData, TValue> = $props();

  let columnFilters = $state<ColumnFiltersState>([]);
  let columnSizing = $state<ColumnSizingState>({});
  let columnSizingInfo = $state<ColumnSizingInfoState>({
    columnSizingStart: [],
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    startOffset: null,
    startSize: null,
  });
  let rowSelection = $state<RowSelectionState>({});
  let sorting = $state<SortingState>([]);
  let headerScrollerEl = $state<HTMLDivElement>();
  const columnResizeMode: TableOptions<TData>['columnResizeMode'] = 'onChange';

  let columnState = useColumnState();

  const table = createSvelteTable({
    get data() {
      return data;
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
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: (updater) => {
      if (typeof updater === 'function') {
        columnFilters = updater(columnFilters);
      } else {
        columnFilters = updater;
      }
    },
    enableMultiSort: true,
    enableSortingRemoval: false,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    },
    onColumnOrderChange: (updater) => {
      if (typeof updater === 'function') {
        columnState.setOrder(updater(columnState.order));
      } else {
        columnState.setOrder(updater);
      }
    },
    enableColumnPinning: true,
    onColumnPinningChange: (updater) => {
      if (typeof updater === 'function') {
        columnState.setPinning(updater(columnState.pinning));
      } else {
        columnState.setPinning(updater);
      }
    },
    enableColumnResizing: true,
    columnResizeMode,
    onColumnSizingChange: (updater) => {
      if (typeof updater === 'function') {
        columnSizing = updater(columnSizing);
      } else {
        columnSizing = updater;
      }
    },
    onColumnSizingInfoChange: (updater) => {
      if (typeof updater === 'function') {
        columnSizingInfo = updater(columnSizingInfo);
      } else {
        columnSizingInfo = updater;
      }
    },
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        columnState.setVisibility(updater(columnState.visibility));
      } else {
        columnState.setVisibility(updater);
      }
    },
    onRowSelectionChange: (updater) => {
      if (typeof updater === 'function') {
        rowSelection = updater(rowSelection);
      } else {
        rowSelection = updater;
      }
    },
    state: {
      get columnFilters() {
        return columnFilters;
      },
      get columnOrder() {
        return columnState.order;
      },
      get columnPinning() {
        return columnState.pinning;
      },
      get columnSizing() {
        return columnSizing;
      },
      get columnSizingInfo() {
        return columnSizingInfo;
      },
      get columnVisibility() {
        return columnState.visibility;
      },
      get rowSelection() {
        return rowSelection;
      },
      get sorting() {
        return sorting;
      },
    },
  });

  const getColumnSizeVars = () => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  };

  const columnSizeVars = $derived.by(() => {
    table.getState().columnSizingInfo;
    table.getState().columnSizing;
    return getColumnSizeVars();
  });

  const getCommonPinningStyles = (column: Column<TData>) => {
    const isPinned = column.getIsPinned();
    const isLastLeftPinnedColumn =
      isPinned === 'left' && column.getIsLastColumn('left');

    return {
      'box-shadow': isLastLeftPinnedColumn
        ? '-1px 0 0 0 hsl(var(--border)) inset'
        : undefined,
      left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
      right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    };
  };

  const getHeaderStyles = (column: Column<TData>) => {
    const isPinned = column.getIsPinned();

    return {
      ...getCommonPinningStyles(column),
      position: isPinned ? 'sticky' : 'relative',
      'z-index': isPinned ? 2 : 1,
      'background-color': 'var(--table-header-bg)',
      'background-clip': 'border-box',
      'box-sizing': 'border-box',
      isolation: isPinned ? 'isolate' : undefined,
    };
  };

  const getCellStyles = (column: Column<TData>) => {
    const isPinned = column.getIsPinned();

    return {
      ...getCommonPinningStyles(column),
      position: isPinned ? 'sticky' : 'relative',
      'z-index': isPinned ? 1 : 0,
      'background-color': 'var(--row-bg, var(--table-body-bg))',
      'background-clip': 'border-box',
      'box-sizing': 'border-box',
      isolation: isPinned ? 'isolate' : undefined,
    };
  };

  const hasVisibleRightPinnedColumns = () =>
    table
      .getVisibleLeafColumns()
      .some((column) => column.getIsPinned() === 'right');

  const getLastVisibleLeafColumn = () => {
    const visibleLeafColumns = table.getVisibleLeafColumns();
    return visibleLeafColumns[visibleLeafColumns.length - 1];
  };

  const getLastVisibleCenterColumn = () => {
    const centerColumns = table
      .getVisibleLeafColumns()
      .filter((column) => column.getIsPinned() === false);
    return centerColumns[centerColumns.length - 1];
  };

  const getRightBorderClass = (column: Column<TData>) => {
    const isLastVisibleColumn = getLastVisibleLeafColumn()?.id === column.id;
    if (isLastVisibleColumn) {
      return 'border-r-0';
    }

    const isLastCenterColumn =
      column.getIsPinned() === false &&
      getLastVisibleCenterColumn()?.id === column.id;

    if (hasVisibleRightPinnedColumns() && isLastCenterColumn) {
      return 'border-r-0';
    }

    return 'border-r';
  };

  const getLeftBorderClass = (column: Column<TData>) => {
    const isFirstRightPinnedColumn =
      column.getIsPinned() === 'right' && column.getIsFirstColumn('right');

    return isFirstRightPinnedColumn ? 'border-l' : undefined;
  };

  const syncHeaderScroll = (event: Event) => {
    const bodyElement = event.currentTarget as HTMLDivElement | null;
    if (!headerScrollerEl || !bodyElement) {
      return;
    }
    headerScrollerEl.scrollLeft = bodyElement.scrollLeft;
  };
</script>

<div class="flex min-h-fit w-full grow flex-col">
  <div class="sticky top-0 z-40 bg-background">
    <div class="border-b border-border px-6 py-3">
      <div class="flex items-center gap-2">
        {#if toolbar}
          {@render toolbar({ table })}
        {/if}
        <ViewSettings {column_labels}>
          {#snippet trigger({ props })}
            <Button
              {...props}
              variant="outline"
              class={cn('h-8', !toolbar && 'ml-auto')}
            >
              <ColumnsThree class="aspect-video size-3" />
              <span class="text-xs leading-3 font-semibold tracking-tight">
                View Settings
              </span>
            </Button>
          {/snippet}
        </ViewSettings>
        {#if actions}
          {@render actions({ table })}
        {/if}
      </div>
    </div>

    <div
      bind:this={headerScrollerEl}
      class="overflow-x-hidden border-b border-border"
    >
      <TableUI.Root
        class="table-fixed border-separate border-spacing-0 border-border"
        style={createStyle({
          ...columnSizeVars,
          width: `${table.getTotalSize()}px`,
        })}
      >
        <colgroup>
          {#each table.getVisibleLeafColumns() as column (column.id)}
            <col
              style={createStyle({
                width: `calc(var(--col-${column.id}-size) * 1px)`,
                'min-width': `calc(var(--col-${column.id}-size) * 1px)`,
                'max-width': `calc(var(--col-${column.id}-size) * 1px)`,
              })}
            />
          {/each}
        </colgroup>

        <TableUI.Header class="border-border bg-(--table-header-bg)">
          {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
            <TableUI.Row class="group/row relative border-b-0 border-border">
              {#each headerGroup.headers as header (header.id)}
                {@const meta = header.column.columnDef?.meta as Record<
                  string,
                  Record<string, unknown> | string
                >}
                {@const metaHeader = meta?.header as
                  | Record<string, unknown>
                  | undefined}
                {@const headerClass = metaHeader?.class as string | undefined}
                {@const headerStyle = metaHeader?.style as
                  | CSSStyleDeclaration
                  | undefined}
                {@const headerLeftBorderClass = getLeftBorderClass(
                  header.column
                )}
                {@const headerBorderClass = getRightBorderClass(header.column)}
                <TableUI.Head
                  class={cn(
                    'h-8 truncate border-t-0 border-b border-border bg-clip-border! px-0 text-left align-middle text-xs font-normal text-muted-foreground capitalize [&:has([role=checkbox])]:pr-0',
                    headerLeftBorderClass,
                    headerBorderClass,
                    headerClass
                  )}
                  style={createStyle({
                    ...(headerStyle && headerStyle),
                    width: `calc(var(--header-${header?.id}-size) * 1px)`,
                    'min-width': `calc(var(--header-${header?.id}-size) * 1px)`,
                    'max-width': `calc(var(--header-${header?.id}-size) * 1px)`,
                    ...getHeaderStyles(header.column),
                  })}
                  colspan={header.colSpan}
                >
                  {#if !header.isPlaceholder}
                    <FlexRender
                      content={header.column.columnDef.header}
                      context={header.getContext()}
                    />
                  {/if}
                  <ColumnResizer {header} {table} />
                </TableUI.Head>
              {/each}
            </TableUI.Row>
          {/each}
        </TableUI.Header>
      </TableUI.Root>
    </div>
  </div>

  <div onscroll={syncHeaderScroll} class="relative overflow-x-auto">
    <TableUI.Root
      class="table-fixed border-separate border-spacing-0 border-border"
      style={createStyle({
        ...columnSizeVars,
        width: `${table.getTotalSize()}px`,
      })}
    >
      <colgroup>
        {#each table.getVisibleLeafColumns() as column (column.id)}
          <col
            style={createStyle({
              width: `calc(var(--col-${column.id}-size) * 1px)`,
              'min-width': `calc(var(--col-${column.id}-size) * 1px)`,
              'max-width': `calc(var(--col-${column.id}-size) * 1px)`,
            })}
          />
        {/each}
      </colgroup>
      {#key table.getState().columnSizingInfo.isResizingColumn}
        <TableUI.Body class="border-border">
          {#each table.getRowModel().rows as row (row.id)}
            <TableUI.Row
              class="group/row relative transition-colors [--row-bg:var(--table-body-bg)] hover:[--row-bg:var(--table-body-bg-hover)] data-[state=selected]:[--row-bg:var(--table-body-bg-selected)]"
              data-state={row.getIsSelected() && 'selected'}
            >
              {#each row.getVisibleCells() as cell (cell.id)}
                {@const meta = cell.column.columnDef?.meta as Record<
                  string,
                  Record<string, unknown> | string
                >}
                {@const metaCell = meta?.cell as
                  | Record<string, unknown>
                  | undefined}
                {@const cellClass = metaCell?.class as string | undefined}
                {@const cellStyle = metaCell?.style as
                  | CSSStyleDeclaration
                  | undefined}
                {@const cellLeftBorderClass = getLeftBorderClass(cell.column)}
                {@const cellBorderClass = getRightBorderClass(cell.column)}
                <TableUI.Cell
                  class={cn(
                    'min-h-8 truncate border-b border-border bg-clip-border! px-3 py-1 align-middle text-sm font-medium text-ellipsis [&:has([role=checkbox])]:pr-0',
                    cellLeftBorderClass,
                    cellBorderClass,
                    cellClass
                  )}
                  style={createStyle({
                    ...(cellStyle && cellStyle),
                    width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                    'min-width': `calc(var(--col-${cell.column.id}-size) * 1px)`,
                    'max-width': `calc(var(--col-${cell.column.id}-size) * 1px)`,
                    ...getCellStyles(cell.column),
                  })}
                >
                  <FlexRender
                    content={cell.column.columnDef.cell}
                    context={cell.getContext()}
                  />
                </TableUI.Cell>
              {/each}
            </TableUI.Row>
          {:else}
            {#if !loading}
              <TableUI.Row>
                <TableUI.Cell
                  colspan={columns.length}
                  class="h-24 border-b text-center"
                >
                  No results.
                </TableUI.Cell>
              </TableUI.Row>
            {/if}
          {/each}
          {#if loading}
            {#each { length: loading_rows } as _, i (i)}
              <TableUI.Row
                class="group/row relative [--row-bg:var(--table-body-bg)]"
              >
                {#each table.getVisibleLeafColumns() as column (column.id)}
                  {@const cellLeftBorderClass = getLeftBorderClass(column)}
                  {@const cellBorderClass = getRightBorderClass(column)}
                  {@const meta = column.columnDef?.meta as Record<
                    string,
                    Record<string, unknown> | string
                  >}
                  {@const metaCell = meta?.cell as
                    | Record<string, unknown>
                    | undefined}
                  {@const cellClass = metaCell?.class as string | undefined}
                  {@const cellStyle = metaCell?.style as
                    | CSSStyleDeclaration
                    | undefined}
                  <TableUI.Cell
                    class={cn(
                      'h-8 min-h-8! truncate border-b border-border bg-clip-border! px-3 py-1 align-middle text-sm font-medium text-ellipsis [&:has([role=checkbox])]:pr-0',
                      cellLeftBorderClass,
                      cellBorderClass,
                      cellClass
                    )}
                    style={createStyle({
                      ...(cellStyle && cellStyle),
                      width: `calc(var(--col-${column.id}-size) * 1px)`,
                      'min-width': `calc(var(--col-${column.id}-size) * 1px)`,
                      'max-width': `calc(var(--col-${column.id}-size) * 1px)`,
                      ...getCellStyles(column),
                    })}
                  >
                    {#if column.id === 'table-row-select'}
                      <!-- <Spinner class="mx-auto size-4 text-muted-foreground" /> -->
                    {:else}
                      <div class="flex h-8 w-full items-center justify-center">
                        <Skeleton class="h-3.5 w-full rounded" />
                      </div>
                    {/if}
                  </TableUI.Cell>
                {/each}
              </TableUI.Row>
            {/each}
          {/if}
        </TableUI.Body>
      {/key}
    </TableUI.Root>
  </div>

  {#if after_rows}
    {@render after_rows()}
  {/if}

  {#if footer}
    {@render footer({ table })}
  {:else}
    <div
      class="sticky bottom-0 z-30 -mt-px flex items-center justify-end space-x-2 border-t border-border bg-background px-6 py-4"
    >
      <div class="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
    </div>
  {/if}
</div>
