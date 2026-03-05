<script lang="ts" generics="TData, TValue">
  import type { Header, Table } from '@tanstack/table-core';
  import { cn, createStyle } from '$lib/utils.js';

  let {
    header,
    table,
  }: {
    header: Header<TData, TValue>;
    table: Table<TData>;
  } = $props();

  let transform = $derived.by(() => {
    return table.options.columnResizeMode === 'onEnd' &&
      header.column.getIsResizing()
      ? `translateX(${(table.options.columnResizeDirection === 'rtl' ? -1 : 1) * (table.getState().columnSizingInfo.deltaOffset ?? 0)}px)`
      : '';
  });
</script>

{#if header.column.getCanResize() === true}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="group/resizer absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
    style:user-select="none"
    style:touch-action="none"
    style:transform
    style:will-change="transform"
    onmousedown={header.getResizeHandler()}
    ontouchstart={header.getResizeHandler()}
    ondblclick={header.column.resetSize}
  >
    <div
      class={cn(
        'absolute top-0 -right-px h-full w-px rounded-[0.125rem] bg-neutral-300 transition-[color,background-color,border-color,width] duration-150 ease-in-out group-hover/resizer:w-1 group-hover/resizer:bg-neutral-700 dark:bg-neutral-700 dark:group-hover/resizer:bg-neutral-300',
        header.column.getIsResizing() && 'w-1 !bg-blue-500 dark:!bg-blue-500'
      )}
      style:pointer-events="none"
    ></div>
  </div>
{/if}
