<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
  import ListRestart from '@lucide/svelte/icons/list-restart';
  import Pin from '@lucide/svelte/icons/pin';
  import Sortable from 'sortablejs';
  // import Sortable from 'sortablejs/modular/sortable.esm.js';
  import { tick, type Snippet } from 'svelte';
  import { sortable } from '$lib/actions/sortable';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Popover from '$lib/components/ui/popover';
  import { Separator } from '$lib/components/ui/separator';
  import {
    reorder,
    reorderMaybeWithMove,
  } from '$lib/hooks/use-sortable.svelte';

  import { cn } from '$lib/utils';
  import { columnMap } from './columns';
  import { useColumnState } from './context.svelte';

  let {
    trigger,
  }: {
    trigger?: Snippet<[{ props: Record<string, unknown> }]>;
  } = $props();

  let open = $state(false);

  const columnState = useColumnState();

  const leftPinnedFilter = (id: string) =>
    columnState.pinning.left?.includes(id);
  // && id !== 'table-row-select';
  const rightPinnedFilter = (id: string) =>
    columnState.pinning.right?.includes(id);
  // && id !== 'table-row-actions';
  const freeFilter = (id: string) =>
    !columnState.pinning.left?.includes(id) &&
    !columnState.pinning.right?.includes(id);

  const isMenuTrigger = (
    evt: Sortable.SortableEvent & { originalEvent: Event }
  ) => {
    const originalEvent = evt.originalEvent;
    const target = originalEvent?.target as HTMLElement | null;
    const menuTriggerElement = target
      ? Sortable.utils.closest(target, 'button')
      : null;
    return menuTriggerElement;
  };

  const onSortableEnd = async (evt: Sortable.SortableEvent) => {
    console.log({ event_type: 'onSortableEnd', evt });
    await tick();

    const isMultiDrag =
      'oldIndicies' in evt &&
      'newIndicies' in evt &&
      evt.oldIndicies.length > 1;

    const from = evt.from.dataset.pinnedGroup;
    const to = evt.to.dataset.pinnedGroup;

    const leftPinnedOrder = columnState.order.filter(leftPinnedFilter);
    const rightPinnedOrder = columnState.order.filter(rightPinnedFilter);
    const freeOrder = columnState.order.filter(freeFilter);

    const fromOrder =
      from === 'left'
        ? leftPinnedOrder
        : from === 'right'
          ? rightPinnedOrder
          : freeOrder;

    const toOrder =
      to === 'left'
        ? leftPinnedOrder
        : to === 'right'
          ? rightPinnedOrder
          : freeOrder;

    const [newFromOrder, newToOrder] = reorderMaybeWithMove(
      evt,
      fromOrder,
      toOrder,
      from === to
    );

    const newLeftPinnedOrder =
      from === 'left'
        ? newFromOrder
        : to === 'left'
          ? newToOrder
          : leftPinnedOrder;
    const newRightPinnedOrder =
      from === 'right'
        ? newFromOrder
        : to === 'right'
          ? newToOrder
          : rightPinnedOrder;
    const newFreeOrder =
      from === 'free' ? newFromOrder : to === 'free' ? newToOrder : freeOrder;

    const newOrder = [
      ...newLeftPinnedOrder,
      ...newFreeOrder,
      ...newRightPinnedOrder,
    ];

    await new Promise((resolve) => setTimeout(resolve, 100));
    await tick();

    columnState.setPinning({
      left: newLeftPinnedOrder,
      right: newRightPinnedOrder,
    });
    columnState.order = newOrder;
  };

  let sortableOptions: Sortable.Options = {
    group: {
      name: 'free',
      // pull: 'clone',
      put: ['left-pinned', 'right-pinned'],
    },
    delay: 100,
    // delayOnTouchOnly: true,
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
    // avoidImplicitDeselect: true,

    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',

    revertOnSpill: true,
    fallbackTolerance: 3,

    onSort(event) {
      console.log({ event_type: 'onSort', event });
    },
    onChoose(event) {
      console.log({ event_type: 'onChoose', event });
    },
    onEnd: onSortableEnd,
    onSelect(evt) {
      console.log({ event_type: 'onSelect', evt });
      const shouldDeselect = isMenuTrigger(
        evt as typeof evt & { originalEvent: Event }
      );
      if (shouldDeselect) {
        Sortable.utils.deselect(evt.item);
      } else {
        // add data-selected attribute to the item
        evt.item.dataset.selected = 'true';
      }
    },
    onDeselect(evt) {
      console.log({ event_type: 'onDeselect', evt });
      const shouldSelect = isMenuTrigger(
        evt as typeof evt & { originalEvent: Event }
      );
      if (shouldSelect) {
        Sortable.utils.select(evt.item);
      } else {
        delete evt.item.dataset.selected;
      }
    },
  };

  let leftPinnedSortableOptions: Sortable.Options = {
    group: {
      name: 'left-pinned',
      // pull: 'clone',
      put: ['free', 'right-pinned'],
    },
  };

  let rightPinnedSortableOptions: Sortable.Options = {
    group: {
      name: 'right-pinned',
      // pull: 'clone',
      put: ['left-pinned', 'free'],
    },
  };

  const handleColumnSelect = (event: Event) => {};

  const moveRight = () => {
    console.log('move right');
  };

  const moveLeft = () => {
    console.log('move left');
  };

  const handleColumnSelectUsingCheckbox = (event: Event) => {
    if ('checked' in event) {
      const isChecked = event.checked as boolean;
      const target = event.target as HTMLInputElement;
      const columnItem = target.closest('li');
      if (columnItem) {
        if (isChecked) {
          Sortable.utils.select(columnItem);
        } else {
          Sortable.utils.deselect(columnItem);
        }
      }
    }
  };
</script>

{#snippet columnOptionsMenu({
  columnId,
  ...triggerProps
}: { columnId: string } & Record<string, unknown>)}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          class="z-[1] -m-1 ml-0 size-6 rounded-md opacity-[1.5] group-data-[selected]/slot:hidden hover:bg-neutral-300/70 dark:hover:bg-neutral-700/70"
          {...triggerProps}
        >
          <Ellipsis class="size-2 text-muted-foreground" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      class="min-w-64 bg-popover"
      align="start"
      side="bottom"
      sideOffset={0}
      alignOffset={0}
    >
      <!-- <DropdownMenu.Group>
        <DropdownMenu.GroupHeading>Actions</DropdownMenu.GroupHeading>
        <DropdownMenu.Item
          onclick={() => navigator.clipboard.writeText(columnId)}
        >
          Copy payment ID
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      <DropdownMenu.Separator /> -->
      {#if columnState.pinning.left?.includes(columnId) === true}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={moveLeft}
        >
          <Pin class="size-3.5 rotate-90 text-muted-foreground" />
          Unpin from left
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={moveLeft}
        >
          <Pin class="size-3.5 rotate-90 text-muted-foreground" />
          Pin to left
        </DropdownMenu.Item>
      {/if}

      {#if columnState.pinning.right?.includes(columnId) === true}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={moveRight}
        >
          <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
          Unpin from right
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={moveLeft}
        >
          <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
          Pin to right
        </DropdownMenu.Item>
      {/if}

      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={moveLeft}
      >
        <ArrowLeft class="!size-3.5 stroke-[1.5]" />
        Move left
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={moveRight}
      >
        <ArrowRight class="!size-3.5 stroke-[1.5]" />
        Move right
      </DropdownMenu.Item>
      <!-- {#if column.getCanHide()} -->
      <DropdownMenu.Separator />
      <!-- <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => column.toggleVisibility(false)}
        > -->
      <DropdownMenu.Item class="gap-1.5 text-[0.825rem] font-medium">
        <EyeOff class="!size-3.5 stroke-[1.5]" />
        Hide
      </DropdownMenu.Item>
      <!-- {/if} -->
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
  <DropdownMenu.Group>
    <ul
      class="flex flex-col gap-0"
      data-pinned-group={pinned ? pinned : 'free'}
      use:sortable={sortableOptions}
    >
      {#each items as columnId, i (columnId)}
        {@const isVisible = columnState.visibility[columnId] !== false}
        <DropdownMenu.Item closeOnSelect={false} onSelect={handleColumnSelect}>
          {#snippet child({ props })}
            <li
              id="draggable-{columnId}"
              data-pinned-group={pinned ? pinned : 'free'}
              {...props}
              class={cn(
                props?.class?.toString(),
                'group/slot cursor-grab rounded-lg border border-transparent p-0 transition-colors duration-100 ease-in-out outline-none select-none focus-visible:outline-none active:cursor-grabbing data-[highlighted]:bg-accent/90 data-[highlighted]:disabled:bg-transparent',
                !isVisible &&
                  'not-visible cursor-not-allowed opacity-50 active:cursor-not-allowed active:opacity-50 data-[highlighted]:bg-accent/90'
              )}
            >
              <div
                class={cn(
                  'relative flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm transition-colors duration-200 ease-in-out'
                  // !isVisible &&
                  //   'group/hover:border-accent group-hover/slot:bg-transparent group-hover/slot:text-current'
                )}
              >
                <div
                  role="button"
                  tabindex={-1}
                  class="group-hover/slot:opacity-0 focus-visible:outline"
                >
                  <GripHorizontal
                    class="drag-handle size-3 text-muted-foreground"
                  />
                </div>
                <Checkbox
                  onchange={handleColumnSelectUsingCheckbox}
                  class="absolute top-1/2 left-0 z-0 size-3.5 translate-x-1.5 -translate-y-1/2 rounded-sm transition-[opacity,transform] duration-300 ease-in-out group-hover/slot:!translate-x-1.5 group-hover/slot:!opacity-100 group-[:not([data-selected])]/slot:-translate-x-0.5 group-[:not([data-selected])]/slot:opacity-0"
                />
                <div class="flex-grow capitalize">
                  {columnMap.get(columnId)?.label || columnId}
                </div>
                <div class="relative flex items-center justify-end gap-1">
                  {#if !isVisible}
                    <EyeOff class="size-3.5 text-muted-foreground" />
                  {/if}
                  {#if pinned === 'left'}
                    <Pin class="size-3.5 rotate-90 text-muted-foreground" />
                  {:else if pinned === 'right'}
                    <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
                  {/if}
                  {@render columnOptionsMenu({
                    columnId,
                    disabled: false, //!isVisible,
                  })}
                  <!-- <Checkbox
                    checked
                    class="absolute z-0 top-1/2 right-0 -translate-y-1/2 group-[:not([data-selected])]/slot:translate-x-2 translate-x-0 size-3.5 rounded-sm group-[:not([data-selected])]/slot:opacity-0 transition-[opacity,transform] duration-300 ease-in-out"
                  /> -->
                </div>
              </div>
            </li>
          {/snippet}
        </DropdownMenu.Item>
      {/each}
    </ul>
  </DropdownMenu.Group>
{/snippet}

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      {@render trigger?.({ props })}
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    align="end"
    class="max-h-[60vh] w-72 min-w-64 overflow-y-auto scroll-smooth p-1"
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
        <DropdownMenu.Separator class="my-1 bg-border" />
      {/if}
      {@render sortableColumnOrderList({
        sortableOptions,
        items: columnState.order.filter(freeFilter),
      })}
      {#if columnState.pinning.right}
        <DropdownMenu.Separator class="my-1 bg-border" />
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
  </DropdownMenu.Content>
</DropdownMenu.Root>

<style lang="postcss">
  @reference "../../../../routes/layout.css";

  .sortable-selected {
    /* @apply bg-sky-300/5; */
    @apply bg-accent;
  }

  .sortable-chosen {
    /* @apply focus-within:!border-transparent; */
    @apply !border-blue-500;
  }

  .sortable-drag {
    /* @apply border-blue-500 bg-red-500 opacity-100; */
  }

  .sortable-ghost {
    /* @apply bg-blue-500/80 text-white; */
    @apply opacity-0;
  }
</style>
