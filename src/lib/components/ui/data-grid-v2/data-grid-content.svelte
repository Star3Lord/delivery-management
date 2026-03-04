<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as TableUI from '$lib/components/ui/table/index.js';
  import { createStyle } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  const grid = useDataGrid();
</script>

<div onscroll={grid.syncHeaderScroll} class="relative overflow-x-auto">
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
    {@render children()}
  </TableUI.Root>
</div>
