<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Table } from '@tanstack/table-core';
  import ColumnsThree from '@lucide/svelte/icons/columns-3';
  import { Button } from '$lib/components/ui/button/index.js';
  import ViewSettings from '$lib/components/ui/data-grid-v2/column-view-settings.svelte';
  import { cn } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  let {
    children,
    view_settings = true,
  }: {
    children?: Snippet<[{ table: Table<unknown> }]>;
    view_settings?: boolean;
  } = $props();

  const grid = useDataGrid();
</script>

<div class="border-b border-border px-6 py-3">
  <div class="flex items-center gap-2">
    {#if children}
      {@render children({ table: grid.table })}
    {/if}
    {#if view_settings}
      <ViewSettings column_labels={grid.column_labels}>
        {#snippet trigger({ props })}
          <Button
            {...props}
            variant="outline"
            class={cn('h-8', !children && 'ml-auto')}
          >
            <ColumnsThree class="aspect-video size-3" />
            <span class="text-xs leading-3 font-semibold tracking-tight">
              View Settings
            </span>
          </Button>
        {/snippet}
      </ViewSettings>
    {/if}
  </div>
</div>
