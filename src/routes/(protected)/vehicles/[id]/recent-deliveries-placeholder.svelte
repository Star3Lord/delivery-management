<script lang="ts">
  import CircleDashedIcon from '@lucide/svelte/icons/circle-dashed';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import PackageIcon from '@lucide/svelte/icons/package';
  import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { get_recent_slips_by_vehicle } from '$lib/api/delivery-slips.remote';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Spinner } from '$lib/components/ui/spinner/index.js';
  import FileText from '@lucide/svelte/icons/file-text';

  let { vehicle_id }: { vehicle_id: string } = $props();
</script>

<section>
  <h2 class="text-sm font-medium text-muted-foreground">Recent Deliveries</h2>

  <ul class="mt-3 divide-y divide-border/40">
    <svelte:boundary>
      {#each await get_recent_slips_by_vehicle( { vehicle_id, limit: 20 } ) as delivery (delivery.id)}
        <li
          class="group/product-delivery flex translate-x-0 items-center gap-4 py-3 opacity-100 transition-discrete delay-[calc(0.01s*(sibling-index()-1))] duration-150 ease-in-out starting:-translate-x-4 starting:opacity-0"
        >
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50"
          >
            <FileText class="size-3.5 text-muted-foreground/40" />
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="truncate text-xs text-muted-foreground/50">
              <div
                class="flex w-fit items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5"
              >
                <span class="text-xs text-muted-foreground">
                  {delivery.party?.name}
                </span>
              </div>
            </div>
            <div class="flex items-baseline gap-2 px-2">
              <span class="font-mono text-xs text-foreground/80">
                {delivery.date}
              </span>
              <Badge variant="outline" class="text-xs text-muted-foreground/40">
                {#if delivery.state === 'pending'}
                  <CircleDashedIcon
                    class="size-3 text-amber-500 dark:text-amber-400"
                  />
                {:else if delivery.state === 'billed'}
                  <CircleCheckIcon
                    class="size-3 text-green-500 dark:text-green-400"
                  />
                {:else if delivery.state === 'discarded'}
                  <TrashIcon class="size-3 text-red-500" />
                {/if}
                <span class="text-[10px] text-muted-foreground/60 capitalize">
                  {delivery.state}
                </span>
              </Badge>
            </div>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1 px-2">
            <div class="flex items-center gap-1">
              <Badge
                variant="outline"
                class="text-xs text-foreground/70 capitalize"
              >
                <PackageIcon class="size-3 text-muted-foreground/40" />
                {delivery.product?.name ?? '-'}
              </Badge>
            </div>
            <div class="font-mono text-xs text-foreground/50 tabular-nums">
              {delivery.product_quantity}
              <span class="font-sans text-xs text-muted-foreground/50">
                {delivery.product_quantity_unit}
              </span>
            </div>
          </div>
        </li>
      {/each}

      {#snippet pending()}
        <li>
          <div
            class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
          >
            <Spinner class="size-4 animate-spin text-muted-foreground/40" />
            <p class="text-sm text-muted-foreground">
              Loading recent deliveries...
            </p>
          </div>
        </li>
      {/snippet}

      {#snippet failed(_, reset)}
        <li>
          <div
            class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
          >
            <p class="text-sm text-muted-foreground">
              Failed to load recent deliveries
            </p>
            <Button variant="outline" size="sm" onclick={reset}>
              <RefreshCcwIcon class="size-4" />
              Retry
            </Button>
          </div>
        </li>
      {/snippet}
    </svelte:boundary>
  </ul>
</section>
