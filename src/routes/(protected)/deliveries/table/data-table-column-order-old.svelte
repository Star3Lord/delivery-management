<script lang="ts">
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { createSwapy, type Swapy } from 'swapy';
  import * as Popover from '$lib/components/ui/popover';
  import { useColumnState } from './context.svelte';
  import { ColumnOrdering } from '@tanstack/table-core';

  let {
    trigger,
  }: {
    trigger?: Snippet<
      [
        {
          props: Record<string, unknown>;
        },
      ]
    >;
  } = $props();

  let open = $state(false);

  let container = $state<HTMLElement | undefined>();
  let swapy = $state<{ instance: Swapy | null }>({ instance: null });

  // Retrieve column state from the shared context.
  const columnState = useColumnState();

  let currentOrder = $state<typeof columnState.order>(
    columnState.order.map((e) => e)
  );

  const createSwapyInstance = () => {
    if (container) {
      // Create a swapy instance with your desired configuration.
      const swapyInstance = createSwapy(container, {
        manualSwap: false,
        dragAxis: 'y',
        autoScrollOnDrag: true,
        animation: 'dynamic',
        // swapMode: 'drop',
        // dragOnHold: true,
        // Further configuration options can be added here.
      });

      swapyInstance.onSwapStart((event) => {
        console.log('Column swap started:', event);
      });
      swapyInstance.onSwapEnd((event) => {
        // const newOrder = event.slotItemMap.asArray.sort((a, b) => Number(a.slot) - Number(b.slot)).map(({ item }) => item);
        const newOrder = event.slotItemMap.asArray.map(({ item }) => item);
        console.log({ newOrder, order: columnState.order });
        // columnState.setOrder(newOrder);
      });
      swapy.instance = swapyInstance;
      return () => {
        swapyInstance.destroy();
        swapy.instance = null;
      };
    }
  };

  $effect(() => {
    let cleanup: (() => void) | undefined;
    if (open) {
      cleanup = createSwapyInstance();
    }
    return () => {
      cleanup?.();
    };
  });

  $effect(() => {
    currentOrder = columnState.order;
  });

  // onDestroy(() => {
  //   removeSwapyInstance();
  // });
</script>

<!--
  Tailwind CSS is used for styling:
  - "flex flex-row gap-2 select-none": Lays out the columns horizontally with a gap and disables text selection.
  - Each column uses:
    - "px-3 py-2": Padding.
    - "bg-gray-50": A light gray background.
    - "border border-gray-300": A standard gray border.
    - "cursor-grab": Indicates the element can be dragged.
    - "rounded": Rounded corners.
    - "active:cursor-grabbing active:opacity-80": Visual feedback when the item is being dragged.
  
  The data attribute "data-swapy-item" (with the column id) is provided so the swapy instance can recognize draggable items.
-->

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      {@render trigger?.({ props })}
    {/snippet}
  </Popover.Trigger>
  <Popover.Content align="end" class="p-2">
    <div
      class="flex h-full flex-col gap-1 overflow-y-auto scroll-smooth select-none"
      bind:this={container}
    >
      {#each currentOrder as columnId, i}
        <div
          class="group/slot data-[swapy-highlighted]:bg-opacity-100 cursor-grab rounded-lg active:cursor-grabbing active:opacity-80"
          data-swapy-slot={i}
        >
          <div
            class="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm transition-colors duration-200 ease-in-out group-hover/slot:bg-accent group-hover/slot:text-accent-foreground data-[swapy-dragging]:border-blue-500"
            data-swapy-item={columnId}
          >
            <GripHorizontal class="size-3" />
            {columnId}
          </div>
        </div>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
