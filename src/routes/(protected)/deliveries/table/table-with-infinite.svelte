<script lang="ts">
  import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import ChevronsDownIcon from '@lucide/svelte/icons/chevrons-down';
  import { Button } from '$lib/components/ui/button/index.js';
  import { list_delivery_slips_v2 } from '$lib/api/delivery-slips.remote';
  import * as Grid from '$lib/components/ui/data-grid-v2/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { createInfiniteQuery } from '@tanstack/svelte-query';
  import {
    useDeliveryListParams,
    LIMIT_OPTIONS,
    type ListParams,
    type ListResult,
  } from './use-delivery-params.svelte';

  let {
    limit = $bindable(20),
    refresh = $bindable<() => void>(() => {}),
  }: {
    limit: number;
    refresh?: () => void;
  } = $props();

  const list_params = useDeliveryListParams();

  const query = createInfiniteQuery(() => ({
    queryKey: [
      'delivery_slips_v2',
      {
        filters: list_params.server_filters,
        order_by: list_params.server_sort,
        limit,
      },
    ],
    queryFn: ({ pageParam }) => list_delivery_slips_v2(pageParam),
    getNextPageParam: (last_page: ListResult) => {
      if (!last_page.has_more || !last_page.next_cursor) return undefined;
      return {
        limit,
        cursor: last_page.next_cursor,
        order_by: list_params.server_sort,
        filters: list_params.server_filters,
      } satisfies ListParams;
    },
    initialPageParam: {
      limit,
      cursor: undefined as string | undefined,
      order_by: list_params.server_sort,
      filters: list_params.server_filters,
    } satisfies ListParams,
    select: (data) =>
      data.pages.flatMap((p) => p.items ?? []) as ListResult['items'],
  }));

  refresh = () => query.refetch();
</script>

{#if query.isError && !query.isPending}
  <div
    class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
  >
    <p class="text-sm text-destructive">
      {query.error?.message ?? 'Failed to load deliveries'}
    </p>
    <Button variant="outline" size="sm" onclick={() => query.refetch()}>
      Retry
    </Button>
  </div>
{:else if query.isPending}
  <Grid.Content>
    <Grid.Loading rows={limit} />
  </Grid.Content>
{:else}
  <Grid.Content>
    <Grid.Body data={query.data ?? []} />
  </Grid.Content>

  {#if query.isFetchingNextPage}
    <Grid.Content>
      <Grid.Loading rows={3} />
    </Grid.Content>
  {/if}

  {#if query.hasNextPage}
    <div
      {@attach (node) => {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          },
          { rootMargin: '200px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
      }}
      class="h-1"
    ></div>
  {:else if (query.data?.length ?? 0) > 0}
    <div
      class="flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground"
    >
      <CheckCircle2Icon class="size-3.5" />
      All items loaded
    </div>
  {/if}
{/if}

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
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2Icon class="size-3.5" />
            All loaded
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
</Grid.Footer>
