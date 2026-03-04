<script lang="ts">
  import type {
    ColumnPinningState,
    ColumnOrderState,
  } from '@tanstack/table-core';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import FilterIcon from '@lucide/svelte/icons/filter';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { list_delivery_slips_v2 } from '$lib/api/delivery-slips.remote';
  import * as Grid from '$lib/components/ui/data-grid-v2/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import {
    buildServerFilterTree,
    type DataGridConfig,
    type ServerFilterGroup,
    type ColumnFilterMeta,
  } from '$lib/components/ui/data-grid-v2/index.js';
  import FilterSettings from '$lib/components/ui/data-grid-v2/column-filter-settings.svelte';

  import { columns, columnMap } from './table/columns';

  type ListParams = Parameters<typeof list_delivery_slips_v2>[0];

  let limit = $state(20);
  const LIMIT_OPTIONS = [10, 20, 50, 100];

  let mode = $state<'infinite' | 'pagination'>('pagination');

  const order: ColumnOrderState = columns.map(
    (c) => c.id || ((c as any).accessorKey as string)
  );

  const pinning: ColumnPinningState = {
    left: ['table-row-select'],
    right: ['table-row-actions'],
  };

  const filterFieldMap = new Map<string, string>();
  const sortFieldMap = new Map<string, string>();

  for (const col of columns) {
    const id = col.id ?? (col as { accessorKey?: string }).accessorKey;
    if (!id) continue;

    const meta = col.meta as
      | { filter?: ColumnFilterMeta; sort?: { field: string } }
      | undefined;

    if (meta?.filter?.field) filterFieldMap.set(id, meta.filter.field);

    if (meta?.sort?.field) {
      sortFieldMap.set(id, meta.sort.field);
    } else if (meta?.filter?.field) {
      sortFieldMap.set(id, meta.filter.field);
    }
  }

  let activeServerFilters = $state<ServerFilterGroup | undefined>();
  let activeServerSort = $state<ListParams['order_by']>([
    { column: 'date', direction: 'desc' },
  ]);

  let page_cursors = $state<(string | undefined)[]>([undefined]);
  let current_page = $state(0);
  let last_result = $state<{ has_more: boolean; next_cursor?: string }>();

  const params = $derived({
    limit: limit,
    cursor: page_cursors[current_page],
    order_by: activeServerSort,
    fields: [
      'id',
      'external_id',
      'date',
      'royalty_number',
      'royalty_quantity',
      'royalty_quantity_unit',
      'party.id',
      'party.name',
      'party.address',
      'vehicle.id',
      'vehicle.vehicle_type',
      'vehicle.number_plate',
      'product.id',
      'product.name',
      'product_quantity',
      'product_quantity_unit',
      'state',
      'created_at',
      'updated_at',
    ],
    filters: activeServerFilters?.children.length
      ? (activeServerFilters as ListParams['filters'])
      : undefined,
  }) satisfies ListParams;

  function capture_result(
    result: Awaited<ReturnType<typeof list_delivery_slips_v2>>
  ) {
    last_result = {
      has_more: result.has_more,
      next_cursor: result.next_cursor,
    };
    return result.items;
  }

  function reset_pagination() {
    page_cursors = [undefined];
    current_page = 0;
    last_result = undefined;
  }

  function go_next() {
    if (!last_result?.next_cursor) return;
    const next = current_page + 1;
    page_cursors = [...page_cursors.slice(0, next), last_result.next_cursor];
    current_page = next;
  }

  function go_previous() {
    if (current_page > 0) current_page--;
  }

  function handleConfigChange(config: DataGridConfig) {
    let needs_reset = false;

    if (config.filters && config.filters.children.length > 0) {
      const next = buildServerFilterTree(config.filters, filterFieldMap);
      if (JSON.stringify(next) !== JSON.stringify(activeServerFilters)) {
        activeServerFilters = next;
        needs_reset = true;
      }
    } else if (activeServerFilters !== undefined) {
      activeServerFilters = undefined;
      needs_reset = true;
    }

    const next_sort = (
      config.sorting.length > 0
        ? config.sorting
            .map((s) => {
              const field = sortFieldMap.get(s.id);
              if (!field) return null;
              return {
                column: field,
                direction: s.desc ? ('desc' as const) : ('asc' as const),
              };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null)
        : [{ column: 'date', direction: 'desc' as const }]
    ) as ListParams['order_by'];

    if (JSON.stringify(next_sort) !== JSON.stringify(activeServerSort)) {
      activeServerSort = next_sort;
      needs_reset = true;
    }

    if (needs_reset) reset_pagination();
  }
</script>

<!-- ── Toolbar actions (refresh button) ────────────────────── -->

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
    onclick={() => list_delivery_slips_v2(params).refresh()}
    disabled={$effect.pending() > 0}
  >
    <RefreshCwIcon
      class="size-3.5 {$effect.pending() > 0 ? 'animate-spin' : ''}"
    />
    <span class="sr-only">Refresh</span>
  </Button>
{/snippet}

<!-- ── Footer ──────────────────────────────────────────────── -->

{#snippet dataGridFooter()}
  <Grid.Footer>
    {#snippet children({ table })}
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
          <!-- Rows per page -->
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

          <!-- Pagination nav -->
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
              disabled={current_page === 0}
            >
              <ChevronLeftIcon class="size-3.5" />
              <span class="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="size-7"
              onclick={go_next}
              disabled={!last_result?.has_more}
            >
              <ChevronRightIcon class="size-3.5" />
              <span class="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
    {/snippet}
  </Grid.Footer>
{/snippet}

<!-- ── Page layout ─────────────────────────────────────────── -->

<div class="relative flex h-full min-h-0 flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Page>Deliveries (v2 Test)</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    {/snippet}
  </PageHeader>

  {#snippet dataGrid()}
    <div class="flex min-h-[calc(100%-var(--header-height))] flex-col">
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
        onConfigChange={handleConfigChange}
      >
        <!-- Sticky toolbar + header -->
        <div class="sticky top-0 z-40 bg-background">
          <Grid.Toolbar>
            {#snippet children({ table })}
              <Input
                placeholder="Filter slip number…"
                value={(table
                  .getColumn('external_id')
                  ?.getFilterValue() as string) ?? ''}
                oninput={(e) => {
                  table
                    .getColumn('external_id')
                    ?.setFilterValue(e.currentTarget.value);
                }}
                class="max-w-sm"
              />
              {@render toolbarActions()}
            {/snippet}
          </Grid.Toolbar>

          <Grid.Header />
        </div>

        <!-- Body: svelte:boundary wraps only data rows -->
        {#if mode === 'infinite'}
          <div>Not implemented yet</div>
        {:else}
          <svelte:boundary>
            <Grid.Content>
              <Grid.Body
                data={capture_result(await list_delivery_slips_v2(params))}
              />
            </Grid.Content>

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
                <Button variant="outline" size="sm" onclick={reset}>
                  Retry
                </Button>
              </div>
            {/snippet}
          </svelte:boundary>
        {/if}

        <!-- Footer -->
        {@render dataGridFooter()}
      </Grid.Root>
    </div>
  {/snippet}

  {@render dataGrid()}
</div>
