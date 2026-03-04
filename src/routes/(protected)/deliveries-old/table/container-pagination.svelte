<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { list_delivery_slips } from '$lib/api/delivery-slips.remote';
  import { Button } from '$lib/components/ui/button/index.js';
  import { DataGrid } from '$lib/components/ui/data-grid/index.js';
  import { useTableConfig } from '$lib/components/ui/data-grid/index.js';
  import { Input } from '$lib/components/ui/input/index.js';

  import { columns, columnMap } from './columns';
  import TableFooter from './table-footer.svelte';
  import ToolbarActions from './table-toolbar-actions.svelte';

  type DeliverySlipItem = Awaited<
    ReturnType<typeof list_delivery_slips>
  >['items'][number];

  const config = useTableConfig<DeliverySlipItem>();

  let page_cursors = $state<(string | undefined)[]>([undefined]);
  let current_page = $state(0);

  const params = $derived({
    limit: config.limit,
    starting_after: page_cursors[current_page],
    ending_before: undefined,
    order_by: config.order_by,
  }) satisfies {
    limit: number;
    starting_after: string | undefined;
    ending_before: string | undefined;
    order_by: { column: keyof DeliverySlipItem; direction: 'asc' | 'desc' }[];
  };

  function go_next(last_id: string | undefined) {
    if (!last_id) return;
    const next = current_page + 1;
    page_cursors = [...page_cursors.slice(0, next), last_id];
    current_page = next;
  }

  function go_previous() {
    if (current_page > 0) current_page--;
  }
</script>

{#snippet pagination_nav(
  has_more: boolean,
  last_id: string | undefined,
  is_loading: boolean
)}
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
      disabled={current_page === 0 || is_loading}
    >
      <ChevronLeftIcon class="size-3.5" />
      <span class="sr-only">Previous page</span>
    </Button>
    <Button
      variant="outline"
      size="icon"
      class="size-7"
      onclick={() => go_next(last_id)}
      disabled={!has_more || is_loading}
    >
      <ChevronRightIcon class="size-3.5" />
      <span class="sr-only">Next page</span>
    </Button>
  </div>
{/snippet}

{#snippet dataGrid()}
  {@const result = await list_delivery_slips(params)}
  <DataGrid data={result.items} {columns} column_labels={columnMap}>
    {#snippet toolbar({ table })}
      <Input
        placeholder="Filter slip number…"
        value={(table.getColumn('external_id')?.getFilterValue() as string) ??
          ''}
        oninput={(e) => {
          table.getColumn('external_id')?.setFilterValue(e.currentTarget.value);
        }}
        class="max-w-sm"
      />
    {/snippet}

    {#snippet actions()}
      <ToolbarActions
        onrefresh={() => list_delivery_slips(params).refresh()}
        is_refreshing={$effect.pending() > 0}
      />
    {/snippet}

    {#snippet footer({ table })}
      <TableFooter {table}>
        {#snippet nav()}
          {@render pagination_nav(
            result.has_more,
            result.items.at(-1)?.id,
            false
          )}
        {/snippet}
      </TableFooter>
    {/snippet}
  </DataGrid>
{/snippet}

<svelte:boundary>
  {@render dataGrid()}

  {#snippet pending()}
    <DataGrid
      data={[]}
      {columns}
      column_labels={columnMap}
      loading={true}
      loading_rows={config.limit}
    >
      {#snippet toolbar({ table })}
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
      {/snippet}

      {#snippet actions()}
        <ToolbarActions is_refreshing={true} />
      {/snippet}

      {#snippet footer({ table })}
        <TableFooter {table}>
          {#snippet nav()}
            {@render pagination_nav(false, undefined, true)}
          {/snippet}
        </TableFooter>
      {/snippet}
    </DataGrid>
  {/snippet}

  {#snippet failed(error, reset)}
    <div class="flex flex-col items-start gap-2 px-6 py-8">
      <p class="text-sm text-destructive">
        {(error as Error)?.message ?? 'Failed to load deliveries'}
      </p>
      <Button variant="outline" size="sm" onclick={reset}>Retry</Button>
    </div>
  {/snippet}
</svelte:boundary>
