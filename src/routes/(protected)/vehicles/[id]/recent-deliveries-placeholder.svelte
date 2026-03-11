<script lang="ts">
  import { get_recent_slips_by_vehicle } from '$lib/api/delivery-slips.remote';
  import FileText from '@lucide/svelte/icons/file-text';

  let { vehicle_id }: { vehicle_id: string } = $props();
</script>

<section>
  <h2 class="text-sm font-medium text-muted-foreground/70">
    Recent Deliveries
  </h2>

  <div class="mt-3 divide-y divide-border/40">
    {#each await get_recent_slips_by_vehicle({ vehicle_id }) as row (row.id)}
      <div class="flex items-center gap-4 py-3">
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50"
        >
          <FileText class="size-3.5 text-muted-foreground/40" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-[13px] text-foreground/80">
              {row.id}
            </span>
            <span class="text-xs text-muted-foreground/40">{row.date}</span>
          </div>
          <div class="mt-0.5 truncate text-xs text-muted-foreground/50">
            <div
              class="flex w-fit items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5"
            >
              <span class="text-xs text-muted-foreground">
                {row.party?.name}
              </span>
            </div>
          </div>
        </div>
        <span class="shrink-0 text-xs text-foreground/50">
          {row.product_quantity}
          {row.product_quantity_unit}
        </span>
      </div>
    {/each}
  </div>
</section>
