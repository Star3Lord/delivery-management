<script lang="ts" generics="TData">
  import { FlexRender } from '$lib/components/ui/data-table/index.js';
  import * as TableUI from '$lib/components/ui/table/index.js';
  import { cn, createStyle } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  let {
    data,
  }: {
    data?: TData[];
  } = $props();

  const grid = useDataGrid<TData>();

  $effect.pre(() => {
    if (data !== undefined) grid.setData(data);
  });
</script>

<TableUI.Body class="border-border">
  {#each grid.table.getRowModel().rows as row (row.id)}
    <TableUI.Row
      class="group/row relative transition-colors [--row-bg:var(--table-body-bg)] [contain-intrinsic-block-size:40px] [content-visibility:auto] hover:[--row-bg:var(--table-body-bg-hover)] data-[state=selected]:[--row-bg:var(--table-body-bg-selected)]"
      data-state={row.getIsSelected() && 'selected'}
    >
      {#each row.getVisibleCells() as cell (cell.id)}
        <TableUI.Cell
          class={cn(
            'min-h-8 truncate border-b border-border bg-clip-border! px-3 py-1 align-middle text-sm font-medium text-ellipsis [&:has([role=checkbox])]:pr-0',
            grid.getLeftBorderClass(cell.column),
            grid.getRightBorderClass(cell.column),
            grid.getCellMeta(cell.column)?.class
          )}
          style={createStyle({
            ...grid.getCellMeta(cell.column)?.style,
            width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
            'min-width': `calc(var(--col-${cell.column.id}-size) * 1px)`,
            'max-width': `calc(var(--col-${cell.column.id}-size) * 1px)`,
            ...grid.getCellStyles(cell.column),
          })}
        >
          <FlexRender
            content={cell.column.columnDef.cell}
            context={cell.getContext()}
          />
        </TableUI.Cell>
      {/each}
    </TableUI.Row>
  {/each}
</TableUI.Body>
