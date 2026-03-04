<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as TableUI from '$lib/components/ui/table/index.js';
  import { cn } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  let {
    children,
    class: className,
  }: {
    children?: Snippet;
    class?: string;
  } = $props();

  const grid = useDataGrid();
  const colCount = $derived(grid.table.getVisibleLeafColumns().length);
</script>

<TableUI.Body class="border-border">
  <TableUI.Row>
    <TableUI.Cell
      colspan={colCount}
      class={cn('h-24 border-b text-center', className)}
    >
      {#if children}
        {@render children()}
      {:else}
        No results.
      {/if}
    </TableUI.Cell>
  </TableUI.Row>
</TableUI.Body>
