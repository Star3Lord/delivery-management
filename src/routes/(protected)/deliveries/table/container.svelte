<script lang="ts">
  import type {
    ColumnPinningState,
    ColumnOrderState,
  } from '@tanstack/table-core';
  import FilterIcon from '@lucide/svelte/icons/filter';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import InfinityIcon from '@lucide/svelte/icons/infinity';
  import LayoutListIcon from '@lucide/svelte/icons/layout-list';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { ButtonGroup } from '$lib/components/ui/button-group/index.js';
  import * as Grid from '$lib/components/ui/data-grid-v2/index.js';
  import FilterSettings from '$lib/components/ui/data-grid-v2/column-filter-settings.svelte';

  import { columns, columnMap } from './columns';
  import TableWithPagination from './table-with-pagination.svelte';
  import TableWithInfinite from './table-with-infinite.svelte';

  let limit = $state(20);
  let refresh = $state<() => void>(() => {});
  let refreshing = $state(false);

  async function handle_refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      await Promise.resolve(refresh());
    } finally {
      refreshing = false;
    }
  }

  let mode = $state<'infinite' | 'pagination'>('pagination');

  const order: ColumnOrderState = columns.map(
    (c) => c.id || ((c as any).accessorKey as string)
  );

  const pinning: ColumnPinningState = {
    left: ['table-row-select'],
    right: ['table-row-actions'],
  };
</script>

<Grid.Root
  {columns}
  column_labels={columnMap}
  config={{
    column_order: order,
    column_pinning: {
      left: pinning.left ?? [],
      right: pinning.right ?? [],
    },
    column_visibility: {},
    column_sizing: {},
    sorting: [],
  }}
>
  <div class="sticky top-0 z-40 bg-background">
    <Grid.Toolbar>
      {#snippet children({ table })}
        <Input
          placeholder="Filter slip number…"
          value={(table.getColumn('external_id')?.getFilterValue() as string) ??
            ''}
          oninput={(e) => {
            table
              .getColumn('external_id')
              ?.setFilterValue(e.currentTarget.value);
          }}
          class="max-w-sm"
        />
        {#snippet toolbarActions()}
          <FilterSettings>
            {#snippet trigger({ props })}
              <Button {...props} variant="outline" class="h-8">
                <FilterIcon class="size-3" />
                Filter
              </Button>
            {/snippet}
          </FilterSettings>
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            onclick={handle_refresh}
            disabled={refreshing}
          >
            <RefreshCwIcon
              class="size-3.5 {refreshing ? 'animate-spin' : ''}"
            />
            <span class="sr-only">Refresh</span>
          </Button>

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
        {/snippet}
        {@render toolbarActions()}
      {/snippet}
    </Grid.Toolbar>

    <Grid.Header />
  </div>

  {#if mode === 'infinite'}
    <TableWithInfinite bind:limit bind:refresh />
  {:else}
    <TableWithPagination bind:limit bind:refresh />
  {/if}
</Grid.Root>
