<script lang="ts">
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import BikeIcon from '@lucide/svelte/icons/bike';
  import BusIcon from '@lucide/svelte/icons/bus';
  import CarIcon from '@lucide/svelte/icons/car';
  import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
  import ShipIcon from '@lucide/svelte/icons/ship';
  import TractorIcon from '@lucide/svelte/icons/tractor';
  import TruckIcon from '@lucide/svelte/icons/truck';
  import VanIcon from '@lucide/svelte/icons/van';
  import { resolve } from '$app/paths';
  import { list_vehicles } from '$lib/api/vehicles.remote';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Spinner } from '$lib/components/ui/spinner/index.js';
  import { vehicleIcon } from './snippets.svelte';

  type Vehicle = Awaited<ReturnType<typeof list_vehicles>>['items'][number];
</script>

<div class="relative flex h-full min-h-0 flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <div class="flex flex-1 items-center justify-between">
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Page>Vehicles</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    {/snippet}
  </PageHeader>

  <div class="flex min-h-[calc(100%-var(--header-height))] flex-col p-6">
    {#snippet vehicleItem({ vehicle }: { vehicle: Vehicle })}
      <div
        class="relative flex w-full items-center gap-2 rounded-md p-2 transition-colors duration-150 ease-in-out hover:bg-muted/50"
      >
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
        >
          {@render vehicleIcon({
            vehicle,
            props: { class: 'size-4 text-muted-foreground' },
          })}
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-medium text-foreground">
            {vehicle.number_plate}
          </h3>
        </div>
        <!-- <div class="absolute top-1/2 right-2 -translate-y-1/2 group-hover/vehicle:flex hidden scale-0 group-hover/vehicle:scale-100 -translate-x-1 group-hover/vehicle:translate-x-0 transition-transform duration-500 ease-in-out">
                    <ArrowUpRightIcon class="size-4" />
                </div> -->
        <span
          class="absolute top-1/2 right-4 inline-flex size-4.5 -translate-y-1/2 items-center justify-center rounded-[inherit] opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover/vehicle:opacity-100"
        >
          <ArrowUpRightIcon
            class="size-6 -translate-x-0.5 translate-y-0.5 scale-75 text-foreground transition-all delay-100 duration-200 ease-out group-hover/vehicle:translate-x-0 group-hover/vehicle:translate-y-0 group-hover/vehicle:scale-100"
          />
        </span>
      </div>
    {/snippet}

    <section>
      <h2 class="px-2 text-sm font-medium text-muted-foreground">
        All Vehicles
      </h2>

      <ul class="mt-3 flex flex-col gap-0">
        <svelte:boundary>
          {#each (await list_vehicles( { limit: undefined } )).items as vehicle, index (vehicle.id)}
            <li
              class="group/vehicle w-full translate-x-0 opacity-100 transition-discrete delay-[calc(0.01s*(sibling-index()-1))] duration-150 ease-in-out starting:-translate-x-4 starting:opacity-0"
            >
              <a
                href={resolve(`/vehicles/${vehicle.id}`)}
                class="w-full no-underline"
              >
                {@render vehicleItem({ vehicle })}
              </a>
            </li>
          {/each}

          {#snippet pending()}
            <li>
              <div
                class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
              >
                <Spinner class="size-4 animate-spin text-muted-foreground/40" />
                <p class="text-sm text-muted-foreground">Loading vehicles...</p>
              </div>
            </li>
          {/snippet}

          {#snippet failed(_, reset)}
            <li>
              <div
                class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
              >
                <p class="text-sm text-muted-foreground">
                  Failed to load vehicles
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
  </div>
</div>
