<script lang="ts">
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
  import ListRestart from '@lucide/svelte/icons/list-restart';
  import Pin from '@lucide/svelte/icons/pin';
  import Sortable from 'sortablejs';
  import { tick, type Snippet } from 'svelte';
  import { sortable } from '$lib/actions/sortable';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Popover from '$lib/components/ui/popover';
  import { Separator } from '$lib/components/ui/separator';
  import { reorder } from '$lib/hooks/use-sortable.svelte';
  import { cn } from '$lib/utils';
  import { useColumnState } from '$lib/components/ui/data-grid/context.svelte';

  let {
    trigger,
  }: {
    trigger?: Snippet<[{ props: Record<string, unknown> }]>;
  } = $props();

  let open = $state(false);

  const columnState = useColumnState();

  const leftPinnedFilter = (id: string) =>
    columnState.pinning.left?.includes(id);
  const rightPinnedFilter = (id: string) =>
    columnState.pinning.right?.includes(id);
  const freeFilter = (id: string) =>
    !columnState.pinning.left?.includes(id) &&
    !columnState.pinning.right?.includes(id);

  let sortableOptions: Sortable.Options = {
    group: {
      name: 'free',
      // pull: 'clone',
      put: ['left-pinned', 'right-pinned'],
    },

    sort: true,
    direction: 'vertical',
    animation: 200,
    // easing: "cubic-bezier(1, 0, 0, 1)",
    swapThreshold: 0.75,
    // handle: '.drag-handle',
    filter: '.not-visible',

    // draggable: '.draggable',

    multiDrag: true,
    multiDragKey: 'Meta',
    selectedClass: 'sortable-selected',

    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',

    fallbackTolerance: 3,

    onSort(event) {
      console.log({ event_type: 'onSort', event });
    },

    async onEnd(evt) {
      const freeOrder = columnState.order.filter(freeFilter);
      const newFreeOrder = reorder(evt, freeOrder);
      const newOrder = [
        ...columnState.order.filter(leftPinnedFilter),
        ...newFreeOrder,
        ...columnState.order.filter(rightPinnedFilter),
      ];
      await new Promise((resolve) => setTimeout(resolve, 100));
      await tick();
      // columnState.order = newOrder;
    },
    onSelect(evt) {
      console.log({ event_type: 'onSelect', evt });
    },
    onDeselect(evt) {
      console.log({ event_type: 'onDeselect', evt });
    },
  };

  let leftPinnedSortableOptions: Sortable.Options = {
    group: {
      name: 'left-pinned',
      // pull: 'clone',
      put: ['free', 'right-pinned'],
    },
    async onEnd(evt) {
      const leftPinnedOrder = columnState.order.filter(leftPinnedFilter);
      const newLeftPinnedOrder = reorder(evt, leftPinnedOrder);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await tick();
      // columnState.order = [
      //   ...newLeftPinnedOrder,
      //   ...columnState.order.filter(freeFilter),
      //   ...columnState.order.filter(rightPinnedFilter),
      // ];
    },
  };

  let rightPinnedSortableOptions: Sortable.Options = {
    group: {
      name: 'right-pinned',
      // pull: 'clone',
      put: ['left-pinned', 'free'],
    },
    async onEnd(evt) {
      const rightPinnedOrder = columnState.order.filter(rightPinnedFilter);
      const newRightPinnedOrder = reorder(evt, rightPinnedOrder);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await tick();
      // columnState.order = [
      //   ...columnState.order.filter(leftPinnedFilter),
      //   ...columnState.order.filter(freeFilter),
      //   ...newRightPinnedOrder,
      // ];
    },
  };
</script>

{#snippet columnOptionsMenu({ columnId }: { columnId: string })}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          class="-m-1 ml-0 size-6 rounded-md hover:bg-neutral-300/70 dark:hover:bg-neutral-700/70"
        >
          <Ellipsis class="size-2 text-muted-foreground" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Group>
        <DropdownMenu.GroupHeading>Actions</DropdownMenu.GroupHeading>
        <DropdownMenu.Item
          onclick={() => navigator.clipboard.writeText(columnId)}
        >
          Copy payment ID
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      <DropdownMenu.Separator />
      <DropdownMenu.Item>View customer</DropdownMenu.Item>
      <DropdownMenu.Item>View payment details</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet sortableColumnOrderList({
  sortableOptions,
  items,
  pinned,
}: {
  sortableOptions: Sortable.Options;
  items: string[];
  pinned?: 'left' | 'right';
})}
  <ul class="flex flex-col gap-0" use:sortable={sortableOptions}>
    {#each items as columnId, i (columnId)}
      {@const isVisible = columnState.visibility[columnId] !== false}
      <li
        id="draggable-{columnId}"
        class={cn(
          'group/slot cursor-grab rounded-lg border border-transparent transition-colors duration-200 ease-in-out select-none active:cursor-grabbing [&.sortable-chosen]:border-blue-500 [&.sortable-chosen]:focus-within:border-transparent [&.sortable-ghost]:bg-blue-500/80 [&.sortable-ghost]:text-white [&.sortable-ghost]:opacity-0 [&.sortable-ghost]:dark:bg-blue-500/70',
          !isVisible &&
            'not-visible cursor-not-allowed opacity-50 active:cursor-not-allowed active:opacity-50'
        )}
      >
        <div
          class={cn(
            'flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm transition-colors duration-200 ease-in-out group-hover/slot:bg-accent/90 group-hover/slot:text-accent-foreground',
            !isVisible &&
              'group/hover:border-accent group-hover/slot:bg-transparent group-hover/slot:text-current'
          )}
        >
          <div role="button" tabindex={0} class="focus-visible:outline-none">
            <GripHorizontal class="drag-handle size-3 text-muted-foreground" />
          </div>
          <div class="flex-grow">{columnId}</div>
          <div class="flex items-center justify-end gap-1">
            {#if !isVisible}
              <EyeOff class="size-3.5 text-muted-foreground" />
            {/if}
            {#if pinned === 'left'}
              <Pin class="size-3.5 rotate-90 text-muted-foreground" />
            {:else if pinned === 'right'}
              <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
            {/if}
            {@render columnOptionsMenu({ columnId })}
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/snippet}

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      {@render trigger?.({ props })}
    {/snippet}
  </Popover.Trigger>
  <Popover.Content
    align="end"
    class="max-h-[60vh] overflow-y-auto scroll-smooth p-1"
  >
    <div class="mb-0 flex items-center gap-1 px-2 py-1 pb-0">
      <h3
        class="pl-0.5 text-[0.725rem] leading-3 font-medium tracking-wide text-muted-foreground"
      >
        View Settings
      </h3>
      <Button
        variant="ghost"
        size="icon"
        class="-mr-1 ml-auto size-[1.675rem] rounded-md p-2 text-xs hover:bg-neutral-300/70 dark:hover:bg-neutral-700/70"
        onclick={columnState.resetOrder}
        tooltipRootProps={{
          delayDuration: 500,
        }}
        tabindex={-1}
      >
        <!-- {#snippet tooltipContent()}
          Reset
        {/snippet} -->
        <ListRestart class="size-3" />
      </Button>
    </div>
    {#key columnState.order}
      {#if columnState.pinning.left}
        {@render sortableColumnOrderList({
          sortableOptions: { ...sortableOptions, ...leftPinnedSortableOptions },
          items: columnState.order.filter(leftPinnedFilter),
          pinned: 'left',
        })}
        <Separator class="my-1" />
      {/if}
      {@render sortableColumnOrderList({
        sortableOptions,
        items: columnState.order.filter(freeFilter),
      })}
      {#if columnState.pinning.right}
        <Separator class="my-1" />
        {@render sortableColumnOrderList({
          sortableOptions: {
            ...sortableOptions,
            ...rightPinnedSortableOptions,
          },
          items: columnState.order.filter(rightPinnedFilter),
          pinned: 'right',
        })}
      {/if}
    {/key}
  </Popover.Content>
</Popover.Root>

<style>
  @reference "../../../../routes/layout.css";

  .sortable-selected {
    @apply bg-pink-500;
  }
  /* @apply bg-indigo-500; */

  .sortable-drag {
    /* @apply border-blue-500 bg-red-500 opacity-100; */
  }

  /* .sortable-ghost {
    @apply opacity-100 bg-blue-200 dark:bg-blue-800;
  } */
</style>
