<script lang="ts" generics="TData, TValue">
  import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnOrderState,
    type ColumnPinningState,
    type ColumnSizingState,
    type PaginationState,
    type RowSelectionState,
    type SortingState,
    type VisibilityState,
  } from '@tanstack/table-core';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    createSvelteTable,
    FlexRender,
  } from '$lib/components/ui/data-table/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import { cn, createStyle } from '$lib/utils.js';
  import ColumnResizer from './data-table-column-resizer.svelte';
  import { useColumnState } from './context.svelte';

  type DataTableProps<TData, TValue> = {
    data: TData[];
    columns: ColumnDef<TData, TValue>[];
  };

  let { data, columns }: DataTableProps<TData, TValue> = $props();

  let columnFilters = $state<ColumnFiltersState>([]);
  let columnSizing = $state<ColumnSizingState>({});
  let columnVisibility = $state<VisibilityState>({});
  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
  let rowSelection = $state<RowSelectionState>({});
  let sorting = $state<SortingState>([]);
  const columnResizeMode: 'onChange' | 'onEnd' = 'onChange';

  let columnState = useColumnState();

  const table = createSvelteTable({
    get data() {
      return data;
    },
    columns,
    defaultColumn: {
      size: 200,
      minSize: 100,
      enableResizing: true,
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
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        columnVisibility = updater(columnVisibility);
      } else {
        columnVisibility = updater;
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
        // return columnOrder;
        return columnState.order;
      },
      get columnPinning() {
        // return columnPinning;
        return columnState.pinning;
      },
      get columnSizing() {
        return columnSizing;
      },
      get columnVisibility() {
        return columnVisibility;
      },
      get pagination() {
        return pagination;
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
</script>

<div class="flex items-center px-6 py-4">
  <Input
    placeholder="Filter slip number..."
    value={(table.getColumn('external_id')?.getFilterValue() as string) ?? ''}
    onchange={(e) => {
      table.getColumn('external_id')?.setFilterValue(e.currentTarget.value);
    }}
    oninput={(e) => {
      table.getColumn('external_id')?.setFilterValue(e.currentTarget.value);
    }}
    class="max-w-sm"
  />
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="outline" class="ml-auto">Columns</Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      {#each table
        .getAllColumns()
        .filter((col) => col.getCanHide()) as column (column.id)}
        <DropdownMenu.CheckboxItem
          class="capitalize"
          bind:checked={
            () => column.getIsVisible(), (v) => column.toggleVisibility(!!v)
          }
        >
          {column.id}
        </DropdownMenu.CheckboxItem>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<!-- <ScrollArea class="h-[200px] w-[350px] rounded-md border p-4"> -->
<div class="relative w-full overflow-auto border-b border-border">
  <Table.Root
    class="[&_thead_th]:shadow-border-b min-w-full table-fixed border-collapse border-border [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[2]"
    style={createStyle({
      ...columnSizeVars,
      width: `${table.getTotalSize()}px`,
    })}
  >
    <Table.Header
      class="border-border [&_th]:border-r [&_th:last-child]:border-r-0 [&_tr]:!border-b-0"
    >
      {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
        <Table.Row
          class="group/row relative top-0 border-b-0 border-border bg-background hover:bg-background data-[state=selected]:bg-muted [&_td]:border-r [&_td:last-child]:border-r-0"
        >
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
            <Table.Head
              class="h-8 truncate border-t-0 border-b-0 border-border bg-background px-0 text-left align-middle text-xs font-normal text-muted-foreground capitalize [&:has([role=checkbox])]:pr-0 {headerClass}"
              style={createStyle({
                // ...(header.column.columnDef.size && {
                //   width: `${header.column.columnDef.size}px`,
                // }),
                ...(headerStyle && headerStyle),
                // ...(header.column.getCanResize() && {
                //   width: `${header.getSize()}px`,
                // }),
                width: `calc(var(--header-${header?.id}-size) * 1px)`,
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
    <Table.Body class="border-border">
      {#each table.getRowModel().rows as row (row.id)}
        <Table.Row
          class="group/row relative top-0 border-b border-border transition-colors last:border-b-0 hover:bg-muted/50 data-[state=selected]:bg-muted [&_td]:border-r [&_td:last-child]:border-r-0"
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
            <!-- {@const isCellPinned = cell.column.columnDef?.id ? pinnedColumns.includes(cell.column.columnDef.id) : false} -->
            <Table.Cell
              class={cn(
                'min-h-8 border-border px-3 py-2 align-middle text-sm font-medium [&:has([role=checkbox])]:pr-0',
                cellClass
              )}
              style={createStyle({
                ...(cellStyle && cellStyle),
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
          <Table.Cell colspan={columns.length} class="h-24 text-center">
            No results.
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
<!-- </ScrollArea> -->

<div class="flex items-center justify-end space-x-2 px-6 py-4">
  <div class="flex-1 text-sm text-muted-foreground">
    {table.getFilteredSelectedRowModel().rows.length} of{' '}
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
