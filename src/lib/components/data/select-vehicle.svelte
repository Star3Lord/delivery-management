<script lang="ts">
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
  import TruckIcon from '@lucide/svelte/icons/truck';
  import CarIcon from '@lucide/svelte/icons/car';
  import VanIcon from '@lucide/svelte/icons/van';
  import type { ComponentProps, Snippet } from 'svelte';
  import { list_all_vehicles } from '$lib/api/vehicles.remote';
  import { Button } from '../ui/button/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Spinner } from '$lib/components/ui/spinner/index.js';
  import type { WithoutChild } from '$lib/utils';
  import { PALETTES, get_initials, hash_name } from './utils.js';

  type VehicleOption = Awaited<ReturnType<typeof list_all_vehicles>>[number];

  let {
    selected_id = $bindable<string | undefined>(),
    disabled = false,
    trigger = undefined,
  }: {
    selected_id?: string;
    disabled?: boolean;
    trigger?: Snippet<
      [
        {
          selected?: VehicleOption;
          loading?: boolean;
          error?: Error;
          refresh?: () => void;
        } & WithoutChild<ComponentProps<typeof Select.Trigger>>,
      ]
    >;
  } = $props();

  let options = $derived(list_all_vehicles());

  let selected = $derived(options.current?.find((i) => i.id === selected_id));
</script>

{#snippet trigger_child({ props }: { props: Record<string, unknown> })}
  {@render trigger?.({
    selected: selected,
    loading: options.loading,
    error: options.error,
    refresh: () => options.refresh(),
    ...props,
  })}
{/snippet}

{#snippet optionSnippet({ option }: { option: VehicleOption })}
  <div
    class="group/option relative inline-flex w-full max-w-full min-w-0 items-center gap-2 rounded-md px-1 py-0"
  >
    <span
      class="inline-flex shrink-0 items-center justify-center text-muted-foreground/75"
    >
      {#if option.vehicle_type === 'truck'}
        <TruckIcon class="size-3.5 text-inherit" />
      {:else if option.vehicle_type === 'car'}
        <CarIcon class="size-3.5 text-inherit" />
      {:else if option.vehicle_type === 'van'}
        <VanIcon class="size-3.5 text-inherit" />
      {:else}
        <TruckIcon class="size-3.5 text-inherit" />
      {/if}
    </span>
    <span
      class="block min-w-0 truncate rounded-md bg-muted px-1 py-0 text-sm ring-1 ring-border ring-inset"
    >
      {option.number_plate}
    </span>
  </div>
{/snippet}

<Select.Root
  type="single"
  {disabled}
  bind:value={
    () => selected_id,
    (v) => (selected_id = (v?.length ?? 0) > 0 ? v : undefined)
  }
>
  <Select.Trigger
    class="w-full"
    child={trigger ? trigger_child : undefined}
    disabled={options.loading}
  >
    {#if options.loading}
      <div
        class="flex items-center justify-center gap-1.5 px-0 text-center text-sm text-muted-foreground"
      >
        <Spinner class="size-4 animate-spin" />
        <span>Loading options...</span>
      </div>
    {:else if !options.error && options.current}
      {#if selected_id && selected?.number_plate}
        {@render optionSnippet({ option: selected })}
      {:else}
        <span class="text-muted-foreground">Select vehicle…</span>
      {/if}
    {:else}
      <div
        class="inline-flex items-center gap-1.5 text-center text-sm text-muted-foreground"
      >
        <CircleXIcon class="size-3 text-muted-foreground" />
        <span>Failed to load options</span>
      </div>
    {/if}
  </Select.Trigger>
  <Select.Content class="max-h-72">
    {#if options.loading}
      <div
        class="flex items-center justify-center gap-2 px-2 py-4 text-center text-sm text-muted-foreground"
      >
        <Spinner class="size-4 animate-spin" />
        <span>Loading options...</span>
      </div>
    {:else if !options.error && options.current}
      <Select.Item value="" label="None" class="text-muted-foreground">
        <div
          class="flex items-center justify-center gap-1.5 px-1 py-0.5 text-center text-xs text-muted-foreground"
        >
          <span>Reset</span>
          <span class="text-[10px] text-muted-foreground/40">
            — click to remove selection
          </span>
        </div>
      </Select.Item>
      {#each options.current as option (option.id)}
        <Select.Item
          value={option.id}
          label={option.number_plate}
          class="group/option"
        >
          {@render optionSnippet({ option: option })}
        </Select.Item>
      {:else}
        <div class="px-2 py-4 text-center text-sm text-muted-foreground">
          No options available
        </div>
      {/each}
    {:else}
      <div
        class="w-full flex-col items-center gap-3 px-2 py-1 text-center text-sm text-muted-foreground"
      >
        <p>Failed to load options</p>
        <Button
          size="icon"
          variant="outline"
          class="p-0"
          onclick={() => options.refresh()}
        >
          <RefreshCcwIcon class="size-3.5" />
          <span class="sr-only">Retry</span>
        </Button>
      </div>
    {/if}
  </Select.Content>
</Select.Root>
