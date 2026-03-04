<script lang="ts">
  import { FlexRender } from '$lib/components/ui/data-table/index.js';
  import ColumnResizer from '$lib/components/ui/data-grid-v2/column-resizer.svelte';
  import * as TableUI from '$lib/components/ui/table/index.js';
  import { cn, createStyle } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  const grid = useDataGrid();
</script>

<div
  bind:this={grid.headerScrollerEl}
  class="overflow-x-hidden border-b border-border"
>
  <TableUI.Root
    class="table-fixed border-separate border-spacing-0 border-border"
    style={createStyle({
      ...grid.columnSizeVars,
      width: `${grid.table.getTotalSize()}px`,
    })}
  >
    <colgroup>
      {#each grid.table.getVisibleLeafColumns() as column (column.id)}
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
      {#each grid.table.getHeaderGroups() as headerGroup (headerGroup.id)}
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
            {@const headerLeftBorderClass = grid.getLeftBorderClass(
              header.column
            )}
            {@const headerBorderClass = grid.getRightBorderClass(header.column)}
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
                ...grid.getHeaderStyles(header.column),
              })}
              colspan={header.colSpan}
            >
              {#if !header.isPlaceholder}
                <FlexRender
                  content={header.column.columnDef.header}
                  context={header.getContext()}
                />
              {/if}
              <ColumnResizer {header} table={grid.table} />
            </TableUI.Head>
          {/each}
        </TableUI.Row>
      {/each}
    </TableUI.Header>
  </TableUI.Root>
</div>
