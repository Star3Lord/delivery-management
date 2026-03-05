<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { Button } from '$lib/components/ui/button/index.js';
  import { list_delivery_slips_v2 } from '$lib/api/delivery-slips.remote';
  import * as Grid from '$lib/components/ui/data-grid/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import {
    useDeliveryListParams,
    LIMIT_OPTIONS,
    type ListParams,
  } from './use-delivery-params.svelte';

  let {
    limit = $bindable(20),
    refresh = $bindable<() => void>(() => {}),
  }: {
    limit: number;
    refresh?: () => void;
  } = $props();

  const list_params = useDeliveryListParams();

  // Writable deriveds: auto-reset to page 1 when filter/sort changes,
  // overridable by go_next/go_previous until the next filter/sort change
  let current_page = $derived.by(() => {
    list_params.server_filters;
    list_params.server_sort;
    return 0;
  });

  let page_cursors = $derived.by(() => {
    list_params.server_filters;
    list_params.server_sort;
    return [undefined] as (string | undefined)[];
  });

  let params = $derived({
    limit,
    cursor: page_cursors[current_page],
    order_by: list_params.server_sort,
    filters: list_params.server_filters,
  } satisfies ListParams);

  refresh = () => list_delivery_slips_v2(params).refresh();

  function go_next(next_cursor?: string) {
    if (!next_cursor) return;
    const next = current_page + 1;
    page_cursors = [...page_cursors.slice(0, next), next_cursor];
    current_page = next;
  }

  function go_previous() {
    if (current_page > 0) current_page--;
  }
</script>

<svelte:boundary>
  <Grid.Content>
    <Grid.Body data={(await list_delivery_slips_v2(params)).items} />
  </Grid.Content>

  <Grid.Footer>
    {#snippet children({ table })}
      {@const result = await list_delivery_slips_v2(params)}
      <div
        class="sticky bottom-0 z-30 mt-auto flex items-center gap-3 border-t border-border bg-background px-4 py-2"
      >
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          {#if table.getFilteredSelectedRowModel().rows.length > 0}
            <span class="font-mono font-medium text-primary">
              {table.getFilteredSelectedRowModel().rows.length}
            </span>
            <span>of {table.getFilteredRowModel().rows.length} rows</span>
          {:else}
            <span>{table.getFilteredRowModel().rows.length} rows</span>
          {/if}
        </div>

        <div class="ml-auto flex items-center gap-2">
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-muted-foreground">Rows</span>
            <Select.Root
              type="single"
              value={String(limit)}
              onValueChange={(v) => {
                if (v) limit = Number(v);
              }}
            >
              <Select.Trigger size="sm" class="h-7 w-16 gap-1 text-xs">
                {limit}
              </Select.Trigger>
              <Select.Content align="end" class="min-w-20">
                {#each LIMIT_OPTIONS as opt (opt)}
                  <Select.Item value={String(opt)} class="text-xs">
                    {opt}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>

          <Separator orientation="vertical" class="h-5!" />

          <div class="flex items-center gap-1">
            <span class="font-mono text-xs text-muted-foreground">Page</span>
            <span
              class="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular-nums"
            >
              {current_page + 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              class="size-7"
              onclick={go_previous}
              disabled={current_page === 0 || $effect.pending() > 0}
            >
              <ChevronLeftIcon class="size-3.5" />
              <span class="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="size-7"
              onclick={() => go_next(result.next_cursor)}
              disabled={!result.has_more || $effect.pending() > 0}
            >
              <ChevronRightIcon class="size-3.5" />
              <span class="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
    {/snippet}
  </Grid.Footer>

  {#snippet pending()}
    <Grid.Content>
      <Grid.Loading rows={limit} />
    </Grid.Content>
  {/snippet}

  {#snippet failed(error, reset)}
    <div
      class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
    >
      <p class="text-sm text-destructive">
        {(error as Error)?.message ?? 'Failed to load deliveries'}
      </p>
      <Button variant="outline" size="sm" onclick={reset}>Retry</Button>
    </div>
  {/snippet}
</svelte:boundary>
