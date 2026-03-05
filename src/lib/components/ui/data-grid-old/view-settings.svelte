<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
  import ListRestart from '@lucide/svelte/icons/list-restart';
  import Pin from '@lucide/svelte/icons/pin';
  import Sortable from 'sortablejs';
  import type { Attachment } from 'svelte/attachments';
  import type { Snippet } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import { reorderMaybeWithMove } from '$lib/hooks/use-sortable.svelte';
  import { cn } from '$lib/utils';
  import { useColumnState, type ColumnLabelMap } from './context.svelte';

  type PinnedGroup = 'left' | 'free' | 'right';
  type GroupedColumnOrder = Record<PinnedGroup, string[]>;

  let {
    trigger,
    column_labels,
    non_hideable_columns = new Set(['table-row-select', 'table-row-actions']),
  }: {
    trigger?: Snippet<[{ props: Record<string, unknown> }]>;
    column_labels?: ColumnLabelMap;
    non_hideable_columns?: Set<string>;
  } = $props();

  let open = $state(false);

  const columnState = useColumnState();

  const groupedOrder = $derived.by((): GroupedColumnOrder => {
    const leftLookup: Record<string, true> = {};
    const rightLookup: Record<string, true> = {};

    for (const id of columnState.pinning.left ?? []) {
      leftLookup[id] = true;
    }
    for (const id of columnState.pinning.right ?? []) {
      rightLookup[id] = true;
    }

    const left: string[] = [];
    const free: string[] = [];
    const right: string[] = [];

    for (const id of columnState.order) {
      if (leftLookup[id]) {
        left.push(id);
      } else if (rightLookup[id]) {
        right.push(id);
      } else {
        free.push(id);
      }
    }

    return {
      left,
      free,
      right,
    };
  });

  const getColumnLabel = (columnId: string): string => {
    return column_labels?.get(columnId)?.label ?? columnId;
  };

  const getPinnedGroup = (value?: string): PinnedGroup => {
    if (value === 'left' || value === 'right' || value === 'free') {
      return value;
    }
    return 'free';
  };

  const getGroupedOrder = (): GroupedColumnOrder => ({
    left: [...groupedOrder.left],
    free: [...groupedOrder.free],
    right: [...groupedOrder.right],
  });

  const commitGroupedOrder = (groupedOrder: GroupedColumnOrder) => {
    const nextLeft = [...groupedOrder.left];
    const nextFree = [...groupedOrder.free];
    const nextRight = [...groupedOrder.right];
    const nextOrder = [...nextLeft, ...nextFree, ...nextRight];
    columnState.setOrderAndPinning(nextOrder, {
      left: nextLeft,
      right: nextRight,
    });
  };

  const toggleColumnVisibility = (columnId: string) => {
    const visible = columnState.visibility[columnId] !== false;
    columnState.toggleVisibility(columnId, !visible);
  };

  const onSortableEnd = (evt: Sortable.SortableEvent) => {
    if (evt.oldIndex === undefined || evt.newIndex === undefined) {
      return;
    }

    const from = getPinnedGroup(evt.from.dataset.pinnedGroup);
    const to = getPinnedGroup(evt.to.dataset.pinnedGroup);
    if (from !== to) {
      return;
    }

    const groupedOrder = getGroupedOrder();
    const [nextGroup] = reorderMaybeWithMove(
      evt,
      groupedOrder[from],
      groupedOrder[from],
      true
    );

    groupedOrder[from] = nextGroup;
    commitGroupedOrder(groupedOrder);
  };

  const sharedSortableOptions: Omit<Sortable.Options, 'group'> = {
    sort: true,
    direction: 'vertical',
    animation: 140,
    swapThreshold: 0.75,
    filter: '.not-visible',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    revertOnSpill: true,
    fallbackTolerance: 3,
    onEnd: onSortableEnd,
  };

  const freeSortableOptions: Sortable.Options = {
    ...sharedSortableOptions,
    group: { name: 'free', pull: false, put: false },
  };

  const leftPinnedSortableOptions: Sortable.Options = {
    ...sharedSortableOptions,
    group: { name: 'left-pinned', pull: false, put: false },
  };

  const rightPinnedSortableOptions: Sortable.Options = {
    ...sharedSortableOptions,
    group: { name: 'right-pinned', pull: false, put: false },
  };

  const createSortableAttachment = (
    options: Sortable.Options
  ): Attachment<HTMLElement> => {
    return (node) => {
      const sortableInstance = Sortable.create(node, options);
      return () => sortableInstance.destroy();
    };
  };

  const freeSortableAttachment = createSortableAttachment(freeSortableOptions);
  const leftPinnedSortableAttachment = createSortableAttachment(
    leftPinnedSortableOptions
  );
  const rightPinnedSortableAttachment = createSortableAttachment(
    rightPinnedSortableOptions
  );

  columnState.setOrderAndPinning(columnState.order, columnState.pinning);
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
          class="z-1 -m-1 ml-0 size-6 rounded-md opacity-[1.5] hover:bg-neutral-300/70 dark:hover:bg-neutral-700/70"
          {...triggerProps}
        >
          <Ellipsis class="size-3 text-muted-foreground" />
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
      {#if groupedOrder.left.includes(columnId)}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => columnState.pinColumn(columnId, false)}
        >
          <Pin class="size-3.5 rotate-90 text-muted-foreground" />
          Unpin from left
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => columnState.pinColumn(columnId, 'left')}
        >
          <Pin class="size-3.5 rotate-90 text-muted-foreground" />
          Pin to left
        </DropdownMenu.Item>
      {/if}

      {#if groupedOrder.right.includes(columnId)}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => columnState.pinColumn(columnId, false)}
        >
          <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
          Unpin from right
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => columnState.pinColumn(columnId, 'right')}
        >
          <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
          Pin to right
        </DropdownMenu.Item>
      {/if}

      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={() => columnState.moveColumnLeft(columnId)}
        disabled={!columnState.canMoveColumnLeft(columnId)}
      >
        <ArrowLeft class="size-3.5! stroke-[1.5]" />
        Move left
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={() => columnState.moveColumnRight(columnId)}
        disabled={!columnState.canMoveColumnRight(columnId)}
      >
        <ArrowRight class="size-3.5! stroke-[1.5]" />
        Move right
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={() => toggleColumnVisibility(columnId)}
        disabled={non_hideable_columns.has(columnId)}
      >
        <EyeOff class="size-3.5! stroke-[1.5]" />
        {columnState.visibility[columnId] !== false ? 'Hide' : 'Show'}
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet sortableColumnOrderList({
  sortableAttachment,
  items,
  pinned,
}: {
  sortableAttachment: Attachment<HTMLElement>;
  items: string[];
  pinned?: 'left' | 'right';
})}
  <DropdownMenu.Group>
    <ul
      class="flex flex-col gap-0"
      data-pinned-group={pinned ? pinned : 'free'}
      {@attach sortableAttachment}
    >
      {#each items as columnId (columnId)}
        {@const isVisible = columnState.visibility[columnId] !== false}
        <DropdownMenu.Item closeOnSelect={false}>
          {#snippet child({ props })}
            <li
              id="draggable-{columnId}"
              data-pinned-group={pinned ? pinned : 'free'}
              {...props}
              class={cn(
                props?.class?.toString(),
                'group/slot cursor-grab rounded-lg border border-transparent p-0 transition-colors duration-100 ease-in-out outline-none select-none focus-visible:outline-none active:cursor-grabbing data-highlighted:bg-accent/90 data-highlighted:disabled:bg-transparent',
                !isVisible &&
                  'not-visible cursor-not-allowed opacity-50 active:cursor-not-allowed active:opacity-50 data-highlighted:bg-accent/90'
              )}
            >
              <div
                class={cn(
                  'relative flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm transition-colors duration-200 ease-in-out'
                )}
              >
                <div role="button" tabindex={-1} class="focus-visible:outline">
                  <GripHorizontal
                    class="drag-handle size-3 text-muted-foreground"
                  />
                </div>
                <div class="grow capitalize">
                  {getColumnLabel(columnId)}
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
                    disabled: false,
                  })}
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
        <ListRestart class="size-3" />
      </Button>
    </div>
    {#if groupedOrder.left.length > 0}
      {@render sortableColumnOrderList({
        sortableAttachment: leftPinnedSortableAttachment,
        items: groupedOrder.left,
        pinned: 'left',
      })}
      <DropdownMenu.Separator class="my-1 bg-border" />
    {/if}
    {@render sortableColumnOrderList({
      sortableAttachment: freeSortableAttachment,
      items: groupedOrder.free,
    })}
    {#if groupedOrder.right.length > 0}
      <DropdownMenu.Separator class="my-1 bg-border" />
      {@render sortableColumnOrderList({
        sortableAttachment: rightPinnedSortableAttachment,
        items: groupedOrder.right,
        pinned: 'right',
      })}
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>

<style lang="postcss">
  @reference "../../../../routes/layout.css";

  .sortable-chosen {
    @apply border-blue-500!;
  }

  .sortable-drag {
  }

  .sortable-ghost {
    @apply opacity-0;
  }
</style>
