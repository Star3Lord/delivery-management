<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Table } from '@tanstack/table-core';
  import { cn } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  let {
    children,
    class: className,
  }: {
    children?: Snippet<[{ table: Table<unknown> }]>;
    class?: string;
  } = $props();

  const grid = useDataGrid();
</script>

{#if children}
  {@render children({ table: grid.table })}
{:else}
  <div
    class={cn(
      'sticky bottom-0 z-30 -mt-px flex items-center justify-end space-x-2 border-t border-border bg-background px-6 py-4',
      className
    )}
  >
    <div class="flex-1 text-sm text-muted-foreground">
      {grid.table.getFilteredSelectedRowModel().rows.length} of
      {grid.table.getFilteredRowModel().rows.length} row(s) selected.
    </div>
  </div>
{/if}
