<script lang="ts" module>
  import TruckIcon from '@lucide/svelte/icons/truck';
  import TractorIcon from '@lucide/svelte/icons/tractor';
  import BikeIcon from '@lucide/svelte/icons/bike';
  import BusIcon from '@lucide/svelte/icons/bus';
  import CarIcon from '@lucide/svelte/icons/car';
  import VanIcon from '@lucide/svelte/icons/van';
  import ShipIcon from '@lucide/svelte/icons/ship';
  import type { list_vehicles } from '$lib/api/vehicles.remote';
  import { cn } from '$lib/utils';

  type Vehicle = Awaited<ReturnType<typeof list_vehicles>>['items'][number];

  export { vehicleIcon };
</script>

{#snippet vehicleIcon({
  vehicle,
  props: { class: className, ...restProps } = {},
}: {
  vehicle?: Vehicle | null;
  props?: Record<string, unknown>;
})}
  {#if !vehicle}
    <TruckIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else if vehicle.vehicle_type === 'truck'}
    <TruckIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else if vehicle.vehicle_type === 'tractor'}
    <TractorIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else if vehicle.vehicle_type === 'bike'}
    <BikeIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else if vehicle.vehicle_type === 'bus'}
    <BusIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else if vehicle.vehicle_type === 'car'}
    <CarIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else if vehicle.vehicle_type === 'van'}
    <VanIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else if vehicle.vehicle_type === 'ship'}
    <ShipIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {:else}
    <TruckIcon
      {...restProps}
      class={cn('size-3.5', className as string | undefined)}
    />
  {/if}
{/snippet}
