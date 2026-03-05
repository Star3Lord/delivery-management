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
  import * as Grid from '$lib/components/ui/data-grid/index.js';
  import type { RelationLoaderMap } from '$lib/components/ui/data-grid/index.js';
  import FilterSettings from '$lib/components/ui/data-grid/column-filter-settings.svelte';
  import { delivery_slip_filter_schema } from '$lib/api/delivery-slips.filter-schema';
  import { list_customers } from '$lib/api/customers.remote';
  import { list_vehicles } from '$lib/api/vehicles.remote';
  import { list_products } from '$lib/api/products.remote';

  import { columns, columnMap } from './columns';
  import Toolbar from './toolbar.svelte';
  import TableWithPagination from './table-with-pagination.svelte';
  import TableWithInfinite from './table-with-infinite.svelte';
  import CreateDialog from '../create/create-dialog.svelte';

  let limit = $state(20);
  let refresh = $state<() => void>(() => {});
  let refreshing = $state(false);
  let create_dialog_open = $state(false);

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

  const relationLoaders: RelationLoaderMap = {
    customer: async () => {
      const result = await list_customers({ limit: 500 });
      return result.items.map((c) => ({ label: c.name, value: c.id }));
    },
    vehicle: async () => {
      const result = await list_vehicles({ limit: 500 });
      return result.items.map((v) => ({ label: v.number_plate, value: v.id }));
    },
    product: async () => {
      const result = await list_products({ limit: 500 });
      return result.items.map((p) => ({ label: p.name, value: p.id }));
    },
  };
</script>

<Grid.Root
  {columns}
  column_labels={columnMap}
  filterSchema={delivery_slip_filter_schema}
  {relationLoaders}
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
    <Toolbar
      bind:mode
      {...{ handle_refresh, refreshing }}
      onCreateNew={() => (create_dialog_open = true)}
    />

    <Grid.Header />
  </div>

  {#if mode === 'infinite'}
    <TableWithInfinite bind:limit bind:refresh />
  {:else}
    <TableWithPagination bind:limit bind:refresh />
  {/if}
</Grid.Root>

<CreateDialog bind:open={create_dialog_open} onSuccess={handle_refresh} />
