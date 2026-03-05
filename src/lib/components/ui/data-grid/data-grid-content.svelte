<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as TableUI from '$lib/components/ui/table/index.js';
  import { useDataGrid } from './context.svelte';

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  const grid = useDataGrid();
</script>

<div
  {@attach (node) => {
    node.addEventListener('scroll', grid.syncHeaderScroll, { passive: true });
    return () => node.removeEventListener('scroll', grid.syncHeaderScroll);
  }}
  class="relative overflow-x-auto overflow-y-clip"
>
  <TableUI.Root
    class="table-fixed border-separate border-spacing-0 border-border"
    style={`width: ${grid.table.getTotalSize()}px;`}
  >
    <colgroup>
      {#each grid.table.getVisibleLeafColumns() as column (column.id)}
        <col
          style:width={`calc(var(--col-${column.id}-size) * 1px)`}
          style:min-width={`calc(var(--col-${column.id}-size) * 1px)`}
          style:max-width={`calc(var(--col-${column.id}-size) * 1px)`}
        />
      {/each}
    </colgroup>
    {@render children()}
  </TableUI.Root>
</div>
