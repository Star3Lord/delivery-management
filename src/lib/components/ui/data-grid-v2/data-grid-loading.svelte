<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import { Spinner } from '$lib/components/ui/spinner/index.js';
  import * as TableUI from '$lib/components/ui/table/index.js';
  import { cn, createStyle } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  let {
    rows = 5,
  }: {
    rows?: number;
  } = $props();

  const grid = useDataGrid();
</script>

<TableUI.Body class="border-border">
  {#each { length: rows } as _, i (i)}
    <TableUI.Row class="group/row relative [--row-bg:var(--table-body-bg)]">
      {#each grid.table.getVisibleLeafColumns() as column (column.id)}
        {@const cellLeftBorderClass = grid.getLeftBorderClass(column)}
        {@const cellBorderClass = grid.getRightBorderClass(column)}
        {@const meta = column.columnDef?.meta as Record<
          string,
          Record<string, unknown> | string
        >}
        {@const metaCell = meta?.cell as Record<string, unknown> | undefined}
        {@const cellClass = metaCell?.class as string | undefined}
        {@const cellStyle = metaCell?.style as CSSStyleDeclaration | undefined}
        <TableUI.Cell
          class={cn(
            'min-h-8 truncate border-b border-border bg-clip-border! px-3 py-1 align-middle text-sm font-medium text-ellipsis [&:has([role=checkbox])]:pr-0',
            cellLeftBorderClass,
            cellBorderClass,
            cellClass
          )}
          style={createStyle({
            ...(cellStyle && cellStyle),
            width: `calc(var(--col-${column.id}-size) * 1px)`,
            'min-width': `calc(var(--col-${column.id}-size) * 1px)`,
            'max-width': `calc(var(--col-${column.id}-size) * 1px)`,
            ...grid.getCellStyles(column),
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
</TableUI.Body>
