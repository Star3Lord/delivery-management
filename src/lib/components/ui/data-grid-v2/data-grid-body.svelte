<script lang="ts" generics="TData">
  import { FlexRender } from '$lib/components/ui/data-table/index.js';
  import * as TableUI from '$lib/components/ui/table/index.js';
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
      class="group/row relative transition-colors [content-visibility:auto] [contain-intrinsic-block-size:32px] [--row-bg:var(--table-body-bg)] hover:[--row-bg:var(--table-body-bg-hover)] data-[state=selected]:[--row-bg:var(--table-body-bg-selected)]"
      data-state={row.getIsSelected() && 'selected'}
    >
      {#each row.getVisibleCells() as cell (cell.id)}
        {@const cached = grid.cellColumnCache.get(cell.column.id)}
        <TableUI.Cell class={cached?.class ?? ''} style={cached?.style ?? ''}>
          <FlexRender
            content={cell.column.columnDef.cell}
            context={cell.getContext()}
          />
        </TableUI.Cell>
      {/each}
    </TableUI.Row>
  {/each}
</TableUI.Body>
