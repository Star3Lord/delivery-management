<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import ChevronsDownIcon from '@lucide/svelte/icons/chevrons-down';
  import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
  import { list_delivery_slips } from '$lib/api/delivery-slips.remote';
  import { Button } from '$lib/components/ui/button/index.js';
  import { DataGrid } from '$lib/components/ui/data-grid/index.js';
  import { useTableConfig } from '$lib/components/ui/data-grid/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { createInfiniteQuery } from '@tanstack/svelte-query';
  import { untrack } from 'svelte';

  import { columns, columnMap } from './columns';
  import TableFooter from './table-footer.svelte';
  import ToolbarActions from './table-toolbar-actions.svelte';

  type DeliverySlipItem = Awaited<
    ReturnType<typeof list_delivery_slips>
  >['items'][number];

  const config = useTableConfig();

  const fetch_page = async (params: {
    limit?: number;
    starting_after?: string;
  }) => await list_delivery_slips(params);

  const query = createInfiniteQuery(() => ({
    queryKey: ['delivery_slips'],
    queryFn: ({ pageParam }) => fetch_page(pageParam),
    getNextPageParam: (last_page) => {
      if (!last_page.has_more) return undefined;
      const id = last_page.items.at(-1)?.id;
      return id ? { limit: config.limit, starting_after: id } : undefined;
    },
    initialPageParam: {
      limit: untrack(() => config.limit),
      starting_after: undefined as string | undefined,
    },
    select: (data) =>
      data.pages.flatMap((p) => p.items ?? []) as DeliverySlipItem[],
  }));

  function observe(node: HTMLElement, callback: () => void) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) callback();
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }
</script>

{#if query.isPending}
  <div class="flex items-center gap-2 px-6 py-8">
    <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
    <p class="text-sm text-muted-foreground">Loading deliveries…</p>
  </div>
{:else if query.isError}
  <div class="flex flex-col items-start gap-2 px-6 py-8">
    <p class="text-sm text-destructive">
      {query.error?.message ?? 'Failed to load deliveries'}
    </p>
    <Button variant="outline" size="sm" onclick={() => query.refetch()}>
      Retry
    </Button>
  </div>
{:else}
  <DataGrid data={query.data ?? []} {columns} column_labels={columnMap}>
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
        onrefresh={() => query.refetch()}
        is_refreshing={query.isFetching}
      />
    {/snippet}

    {#snippet after_rows()}
      {#if config.infinite_trigger === 'observer' && query.hasNextPage}
        <div
          use:observe={() => {
            if (!query.isFetchingNextPage) query.fetchNextPage();
          }}
          class="flex items-center justify-center py-4"
        >
          {#if query.isFetchingNextPage}
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle class="size-4 animate-spin" />
              Loading more…
            </div>
          {/if}
        </div>
      {:else if config.infinite_trigger === 'observer' && !query.hasNextPage && (query.data?.length ?? 0) > 0}
        <div
          class="flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground"
        >
          <CheckCircle2Icon class="size-3.5" />
          All items loaded
        </div>
      {/if}
    {/snippet}

    {#snippet footer({ table })}
      <TableFooter {table}>
        {#snippet nav()}
          {#if config.infinite_trigger === 'button'}
            {#if query.hasNextPage}
              <Button
                variant="outline"
                size="sm"
                class="h-7 gap-1.5 text-xs"
                onclick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {#if query.isFetchingNextPage}
                  <LoaderCircle class="size-3.5 animate-spin" />
                  Loading…
                {:else}
                  <ChevronsDownIcon class="size-3.5" />
                  Load more
                {/if}
              </Button>
            {:else if (query.data?.length ?? 0) > 0}
              <div
                class="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <CheckCircle2Icon class="size-3.5" />
                All loaded
              </div>
            {/if}
          {/if}
        {/snippet}
      </TableFooter>
    {/snippet}
  </DataGrid>
{/if}
