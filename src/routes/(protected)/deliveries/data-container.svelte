<script lang="ts">
  import type {
    ColumnOrderState,
    ColumnPinningState,
  } from '@tanstack/table-core';
  import type { DeliverySlip } from '$lib/types';
  import { columns } from './table/columns';
  import DataTable from './table/data-table.svelte';
  import DataTableProvider from './table/data-table-provider.svelte';

  let { items }: { items: DeliverySlip[] } = $props();

  const order: ColumnOrderState = columns.map(
    (column) => column.id || ((column as any).accessorKey as string)
  );
  const pinning: ColumnPinningState = {
    left: ['table-row-select'],
    right: ['table-row-actions'],
  };

  // const visibility = columns.map((column) => column.id || (column?.accessorKey as string));
</script>

<div class="flex min-h-0 w-full flex-1 flex-col">
  <DataTableProvider {order} {pinning}>
    <DataTable data={items} {columns} />
  </DataTableProvider>
</div>
