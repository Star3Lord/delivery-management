<script lang="ts">
  import * as HoverCard from '$lib/components/ui/hover-card';
  import { get_recent_slips_by_vehicle_for_preview } from '$lib/api/delivery-slips.remote';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import { resolve } from '$app/paths';

  type RecentSlips = Awaited<
    ReturnType<typeof get_recent_slips_by_vehicle_for_preview>
  >;

  let {
    value,
  }: {
    value?: {
      id: string;
      number_plate: string;
      vehicle_type?: string | null;
    };
  } = $props();

  let open = $state(false);

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en', {
      day: 'numeric',
      month: 'short',
    });
  }
</script>

{#snippet slip_rows(slips: RecentSlips)}
  <div class="border-t border-border/40 px-3.5 pt-2.5 pb-3">
    <p
      class="mb-1.5 text-[10px] font-medium tracking-wider text-muted-foreground/40 uppercase"
    >
      Recent
    </p>
    {#if slips.length > 0}
      {#each slips as slip (slip.external_id)}
        <div class="flex items-center py-[5px] text-[11px]">
          <span class="shrink-0 font-mono text-foreground/60">
            #{slip.external_id}
          </span>
          <span class="mx-1.5 text-muted-foreground/20">·</span>
          <span class="shrink-0 text-muted-foreground/45">
            {fmtDate(slip.date)}
          </span>
          <span class="mx-1.5 text-muted-foreground/20">·</span>
          <span class="min-w-0 truncate text-muted-foreground/45">
            {slip.party_name ?? '—'}
          </span>
        </div>
      {/each}
    {:else}
      <p class="py-1 text-[11px] text-muted-foreground/35">
        No recent deliveries
      </p>
    {/if}
  </div>
{/snippet}

{#if value}
  <HoverCard.Root bind:open openDelay={300} closeDelay={100}>
    <HoverCard.Trigger
      href={resolve(`/vehicles/${value.id}`)}
      class="group relative inline-flex max-w-full min-w-0 items-center rounded-md px-1.5 py-0.5 no-underline transition-colors duration-150 hover:bg-muted"
    >
      <span
        class="block min-w-0 truncate font-mono text-[13px] tracking-wide text-foreground/70 transition-colors duration-150 group-hover:text-foreground/90"
      >
        {value.number_plate}
      </span>
      <span
        class="absolute top-1/2 right-0.5 inline-flex size-4.5 -translate-y-1/2 items-center justify-center rounded-[inherit] opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100"
      >
        <ArrowUpRight
          class="size-3 -translate-x-0.5 translate-y-0.5 scale-75 text-foreground transition-all delay-100 duration-200 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:scale-100"
        />
      </span>
    </HoverCard.Trigger>

    <HoverCard.Content
      class="w-fit max-w-md overflow-hidden p-0"
      side="bottom"
      align="start"
      sideOffset={8}
    >
      <div class="px-3.5 pt-3.5 pb-2">
        <p
          class="font-mono text-sm font-medium tracking-wide text-foreground/90"
        >
          {value.number_plate}
        </p>
        {#if value.vehicle_type}
          <p class="mt-0.5 text-[11px] text-muted-foreground/55">
            {value.vehicle_type}
          </p>
        {/if}
      </div>

      {#if open}
        <svelte:boundary>
          {@render slip_rows(
            await get_recent_slips_by_vehicle_for_preview({
              vehicle_id: value.id,
            })
          )}

          {#snippet pending()}
            <div
              class="flex items-center justify-center gap-2 border-t border-border/40 px-3.5 py-3"
            >
              <LoaderCircle
                class="size-3 animate-spin text-muted-foreground/40"
              />
              <span class="text-[11px] text-muted-foreground/40">
                Loading...
              </span>
            </div>
          {/snippet}
          {#snippet failed(_, reset)}
            <button
              onclick={reset}
              class="flex w-full items-center justify-center gap-1.5 border-t border-border/40 px-3.5 py-3 transition-colors hover:bg-muted/20"
            >
              <span class="text-[11px] text-rose-400/60">Failed to load</span>
              <span class="text-[10px] text-muted-foreground/35">— retry</span>
            </button>
          {/snippet}
        </svelte:boundary>
      {/if}
    </HoverCard.Content>
  </HoverCard.Root>
{:else}
  <span class="text-sm text-muted-foreground">—</span>
{/if}
