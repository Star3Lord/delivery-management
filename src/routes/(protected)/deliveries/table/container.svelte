<script lang="ts">
  import type {
    ColumnOrderState,
    ColumnPinningState,
  } from '@tanstack/table-core';
  import {
    DataGridProvider,
    setTableConfig,
    type DataFetchMode,
    type InfiniteTrigger,
  } from '$lib/components/ui/data-grid/index.js';

  import { columns } from './columns';
  import ContainerPagination from './container-pagination.svelte';
  import ContainerInfinite from './container-infinite.svelte';
  import { untrack } from 'svelte';

  interface Props {
    mode?: DataFetchMode;
    infinite_trigger?: InfiniteTrigger;
    limit?: number;
  }

  let {
    mode = 'pagination',
    infinite_trigger = 'button',
    limit = 20,
  }: Props = $props();

  const config = setTableConfig({
    mode: untrack(() => mode),
    infinite_trigger: untrack(() => infinite_trigger),
    limit: untrack(() => limit),
  });

  const order: ColumnOrderState = columns.map(
    (c) => c.id || ((c as any).accessorKey as string)
  );
  const pinning: ColumnPinningState = {
    left: ['table-row-select'],
    right: ['table-row-actions'],
  };
</script>

<!-- <div class="flex w-full min-h-full flex-col"> -->
  <DataGridProvider {order} {pinning}>
    {#if config.mode === 'pagination'}
      <ContainerPagination />
    {:else}
      <ContainerInfinite />
    {/if}
  </DataGridProvider>
<!-- </div> -->
