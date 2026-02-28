<script lang="ts" generics="TData, TValue">
  import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type Column,
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnSizingState,
    type ColumnSizingInfoState,
    type PaginationState,
    type RowSelectionState,
    type SortingState,
    type VisibilityState,
    type TableOptions,
  } from '@tanstack/table-core';
  import ColumnsThree from '@lucide/svelte/icons/columns-3';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    createSvelteTable,
    FlexRender,
  } from '$lib/components/ui/data-table/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import { cn, createStyle } from '$lib/utils.js';
  import ColumnResizer from './data-table-column-resizer.svelte';
  import ViewSettingsOld from './data-table-column-view-settings-old.svelte';
  import ViewSettings from './data-table-column-view-settings.svelte';
  import ColumnVisibility from './data-table-column-visibility.svelte';
  import { useColumnState } from './context.svelte';

  type DataTableProps<TData, TValue> = {
    data: TData[];
    columns: ColumnDef<TData, TValue>[];
  };

  let { data, columns }: DataTableProps<TData, TValue> = $props();

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
  // let columnVisibility = $state<VisibilityState>({});
  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
  let rowSelection = $state<RowSelectionState>({});
  let sorting = $state<SortingState>([]);
  const headerScrollerId = 'deliveries-table-header-scroller';
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
    // getRo/
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
    // getPaginationRowModel: getPaginationRowModel(),
    // onPaginationChange: (updater) => {
    //   if (typeof updater === 'function') {
    //     pagination = updater(pagination);
    //   } else {
    //     pagination = updater;
    //   }
    // },
    // manualSorting: true,
    enableMultiSort: true,
    enableSortingRemoval: false,
    // isMultiSortEvent: (e) => true,
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
        // columnOrder = updater(columnOrder);
        columnState.setOrder(updater(columnState.order));
      } else {
        // columnOrder = updater;
        columnState.setOrder(updater);
      }
    },
    enableColumnPinning: true,
    onColumnPinningChange: (updater) => {
      if (typeof updater === 'function') {
        // columnPinning = updater(columnPinning);
        columnState.setPinning(updater(columnState.pinning));
      } else {
        // columnPinning = updater;
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
        // columnVisibility = updater(columnVisibility);
        columnState.setVisibility(updater(columnState.visibility));
      } else {
        // columnVisibility = updater;
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
      // get pagination() {
      //   return pagination;
      // },
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
    const headerElement = document.getElementById(
      headerScrollerId
    ) as HTMLDivElement | null;
    if (!headerElement || !bodyElement) {
      return;
    }

    headerElement.scrollLeft = bodyElement.scrollLeft;
  };
</script>

<div class="flex w-full flex-col">
  <div class="sticky top-0 z-40 bg-background">
    <div class="border-b border-border px-6 py-4">
      <div class="flex items-center gap-2">
        <Input
          placeholder="Filter slip number..."
          value={(table.getColumn('external_id')?.getFilterValue() as string) ??
            ''}
          onchange={(e) => {
            table
              .getColumn('external_id')
              ?.setFilterValue(e.currentTarget.value);
          }}
          oninput={(e) => {
            table
              .getColumn('external_id')
              ?.setFilterValue(e.currentTarget.value);
          }}
          class="max-w-sm"
        />
        <ViewSettings>
          {#snippet trigger({ props })}
            <Button {...props} variant="outline" class="ml-auto h-8">
              <ColumnsThree class="aspect-video size-3" />
              <span class="text-xs leading-3 font-semibold tracking-tight">
                View Settings
              </span>
            </Button>
          {/snippet}
        </ViewSettings>
        <ViewSettingsOld>
          {#snippet trigger({ props })}
            <Button {...props} variant="outline" class="h-8">
              <ColumnsThree class="aspect-video size-3" />
              <span class="text-xs leading-3 font-semibold tracking-tight">
                View Settings (old)
              </span>
            </Button>
          {/snippet}
        </ViewSettingsOld>
        <ColumnVisibility columns={table.getAllColumns()}>
          {#snippet trigger({ props })}
            <Button {...props} variant="outline" class="h-8">
              <span class="text-xs font-semibold">Columns</span>
            </Button>
          {/snippet}
        </ColumnVisibility>
      </div>
    </div>

    <div id={headerScrollerId} class="overflow-x-hidden border-b border-border">
      <Table.Root
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

        <Table.Header class="border-border bg-(--table-header-bg)">
          {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
            <Table.Row class="group/row relative border-b-0 border-border">
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
                <Table.Head
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
                </Table.Head>
              {/each}
            </Table.Row>
          {/each}
        </Table.Header>
      </Table.Root>
    </div>
  </div>

  <!-- <ScrollArea class="h-[200px] w-[350px] rounded-md border p-4"> -->
  <div onscroll={syncHeaderScroll} class="relative overflow-x-auto">
    <Table.Root
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
        <Table.Body class="border-border">
          {#each table.getRowModel().rows as row (row.id)}
            <Table.Row
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
                <Table.Cell
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
                </Table.Cell>
              {/each}
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell
                colspan={columns.length}
                class="h-24 border-b text-center"
              >
                No results.
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      {/key}
    </Table.Root>
  </div>
  <!-- </ScrollArea> -->

  <div
    class="sticky bottom-0 z-30 -mt-px flex items-center justify-end space-x-2 border-t border-border bg-background px-6 py-4"
  >
    <div class="flex-1 text-sm text-muted-foreground">
      {table.getFilteredSelectedRowModel().rows.length} of
      {table.getFilteredRowModel().rows.length} row(s) selected.
    </div>
    <Button
      variant="outline"
      size="sm"
      onclick={() => table.previousPage()}
      disabled={!table.getCanPreviousPage()}
    >
      Previous
    </Button>
    <Button
      variant="outline"
      size="sm"
      onclick={() => table.nextPage()}
      disabled={!table.getCanNextPage()}
    >
      Next
    </Button>
  </div>
</div>
