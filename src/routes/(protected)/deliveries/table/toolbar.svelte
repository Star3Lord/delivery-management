<script lang="ts">
  import InfinityIcon from '@lucide/svelte/icons/infinity';
  import LayoutListIcon from '@lucide/svelte/icons/layout-list';
  import ColumnsThree from '@lucide/svelte/icons/columns-3';
  import FilterIcon from '@lucide/svelte/icons/filter';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import type { Table } from '@tanstack/table-core';
  import type { Snippet } from 'svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { ButtonGroup } from '$lib/components/ui/button-group/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import FilterSettings from '$lib/components/ui/data-grid/column-filter-settings.svelte';
  import ViewSettings from '$lib/components/ui/data-grid/column-view-settings.svelte';
  import { useDataGrid } from '$lib/components/ui/data-grid/context.svelte';
  import { cn } from '$lib/utils.js';

  let {
    mode = $bindable<'infinite' | 'pagination'>('pagination'),
    handle_refresh,
    refreshing,
  }: {
    mode: 'infinite' | 'pagination';
    handle_refresh: () => void;
    refreshing: boolean;
  } = $props();

  const grid = useDataGrid();
</script>

{#snippet refreshButton()}
  <Button
    variant="outline"
    size="icon"
    class="size-8"
    onclick={handle_refresh}
    disabled={refreshing}
  >
    <RefreshCwIcon class="size-3.5 {refreshing ? 'animate-spin' : ''}" />
    <span class="sr-only">Refresh</span>
  </Button>
{/snippet}

<div class="border-b border-border px-6 py-3">
  <div class="flex items-center gap-2">
    <Input
      placeholder="Filter slip number…"
      value={(grid.table
        .getColumn('external_id')
        ?.getFilterValue() as string) ?? ''}
      oninput={(e) => {
        grid.table
          .getColumn('external_id')
          ?.setFilterValue(e.currentTarget.value);
      }}
      class="max-w-sm"
    />
    <FilterSettings>
      {#snippet trigger({ props })}
        <Button {...props} variant="outline" class="h-8">
          <FilterIcon class="size-3" />
          Filter
        </Button>
      {/snippet}
    </FilterSettings>
    <ViewSettings column_labels={grid.column_labels}>
      {#snippet trigger({ props })}
        <Button {...props} variant="outline" class="h-8">
          <ColumnsThree class="aspect-video size-3" />
          <span class="text-xs leading-3 font-semibold tracking-tight">
            View Settings
          </span>
        </Button>
      {/snippet}
    </ViewSettings>
    {@render refreshButton()}
    <ButtonGroup class="ml-auto h-8 rounded-md border border-border">
      <Button
        variant={mode === 'infinite' ? 'secondary' : 'ghost'}
        class="h-8 gap-1.5 rounded-none rounded-l-[calc(var(--radius-md)-1px)] px-3 text-xs font-medium transition-colors"
        onclick={() => (mode = 'infinite')}
      >
        <InfinityIcon class="size-3.5" />
        Scroll
      </Button>
      <Button
        variant={mode === 'pagination' ? 'secondary' : 'ghost'}
        class="h-8 gap-1.5 rounded-none rounded-r-[calc(var(--radius-md)-1px)] px-3 text-xs font-medium transition-colors"
        onclick={() => (mode = 'pagination')}
      >
        <LayoutListIcon class="size-3.5" />
        Pages
      </Button>
    </ButtonGroup>
  </div>
</div>
