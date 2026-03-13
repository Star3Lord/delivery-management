<script lang="ts" generics="TData, TValue">
  import type { Column } from '@tanstack/table-core';
  import type { ComponentProps, Snippet, Component } from 'svelte';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Pin from '@lucide/svelte/icons/pin';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import { cn } from '$lib/utils.js';
  import { useDataGrid } from './context.svelte';

  let {
    label,
    icon,
    variant = 'ghost',
    class: className,
    column,
    ...restProps
  }: ComponentProps<typeof Button> & {
    label?: string;
    icon?: {
      component: Component;
      snippet?: Snippet<[props: Record<string, unknown>] | []>;
      props?: Record<string, unknown>;
    };
    column: Column<TData, TValue>;
  } = $props();

  const grid = useDataGrid();

  const moveLeft = () => {
    grid.layout.moveColumnLeft(column.id);
  };

  const moveRight = () => {
    grid.layout.moveColumnRight(column.id);
  };

  const pinLeft = () => {
    grid.layout.pinColumn(column.id, 'left');
  };

  const pinRight = () => {
    grid.layout.pinColumn(column.id, 'right');
  };

  const unpin = () => {
    grid.layout.pinColumn(column.id, false);
  };
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        {variant}
        class={cn(
          'w-full justify-start gap-1 rounded-none px-3 text-[0.825rem] text-foreground',
          className
        )}
        {...restProps}
      >
        {#if icon?.snippet}
          {#if icon.props}
            {@render icon.snippet?.(icon.props)}
          {:else}
            {@render icon.snippet?.()}
          {/if}
        {:else if icon?.component}
          <icon.component {...icon.props} />
        {/if}

        <span class="truncate">{label}</span>
        {#if column.getIsSorted() === 'desc'}
          <ArrowDown class="ml-0.5" />
        {:else if column.getIsSorted() === 'asc'}
          <ArrowUp class="ml-0.5" />
        {/if}
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    class="min-w-72 bg-popover"
    align="start"
    side="bottom"
    sideOffset={0}
    alignOffset={0}
  >
    {#if column.getCanSort()}
      <DropdownMenu.Group>
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => column.toggleSorting(false, true)}
        >
          <ArrowUp class="size-3.5! stroke-[1.5]" />
          Sort ascending
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => column.toggleSorting(true, true)}
        >
          <ArrowDown class="size-3.5! stroke-[1.5]" />
          Sort descending
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class="gap-1.5 text-[0.825rem] font-medium"
          onclick={() => column.clearSorting()}
        >
          <ArrowUpDown class="size-3.5! stroke-[1.5]" />
          Reset sort
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    {/if}
    {#if column.getCanSort()}
      <DropdownMenu.Separator class="bg-border" />
    {/if}
    {#if column.getCanPin()}
      <DropdownMenu.Group>
        {#if column.getIsPinned() === 'left'}
          <DropdownMenu.Item
            class="gap-1.5 text-[0.825rem] font-medium"
            onclick={unpin}
          >
            <Pin class="size-3.5 rotate-90 text-muted-foreground" />
            Unpin from left
          </DropdownMenu.Item>
        {:else}
          <DropdownMenu.Item
            class="gap-1.5 text-[0.825rem] font-medium"
            onclick={pinLeft}
          >
            <Pin class="size-3.5 rotate-90 text-muted-foreground" />
            Pin to left
          </DropdownMenu.Item>
        {/if}

        {#if column.getIsPinned() === 'right'}
          <DropdownMenu.Item
            class="gap-1.5 text-[0.825rem] font-medium"
            onclick={unpin}
          >
            <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
            Unpin from right
          </DropdownMenu.Item>
        {:else}
          <DropdownMenu.Item
            class="gap-1.5 text-[0.825rem] font-medium"
            onclick={pinRight}
          >
            <Pin class="size-3.5 -rotate-90 text-muted-foreground" />
            Pin to right
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Group>
      <DropdownMenu.Separator class="bg-border" />
    {/if}
    <DropdownMenu.Group>
      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={moveLeft}
        disabled={!grid.layout.canMoveColumnLeft(column.id)}
      >
        <ArrowLeft class="size-3.5! stroke-[1.5]" />
        Move left
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={moveRight}
        disabled={!grid.layout.canMoveColumnRight(column.id)}
      >
        <ArrowRight class="size-3.5! stroke-[1.5]" />
        Move right
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    {#if column.getCanHide()}
      <DropdownMenu.Separator class="bg-border" />
      <DropdownMenu.Item
        class="gap-1.5 text-[0.825rem] font-medium"
        onclick={() => column.toggleVisibility(false)}
      >
        <EyeOff class="size-3.5! stroke-[1.5]" />
        Hide
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
