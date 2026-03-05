<script lang="ts" generics="TData, TValue">
  import type { Column } from '@tanstack/table-core';
  import type { Snippet } from 'svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { useColumnState } from './context.svelte';

  let {
    columns,
    trigger,
  }: {
    columns: Column<TData>[];
    trigger: Snippet<
      [
        {
          props: Record<string, unknown>;
        },
      ]
    >;
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      {@render trigger({ props })}
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    {#each columns.filter((col) => col.getCanHide()) as column (column.id)}
      <DropdownMenu.CheckboxItem
        class="capitalize"
        bind:checked={
          () => column.getIsVisible(), (v) => column.toggleVisibility(!!v)
        }
      >
        {column.id}
      </DropdownMenu.CheckboxItem>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
