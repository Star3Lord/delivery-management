<script lang="ts">
  import type { ColumnPinningState } from '@tanstack/table-core';
  import type { Snippet } from 'svelte';
  import { setColumnState } from './context.svelte';
  let {
    order = [],
    pinning = {},
    children,
  }: {
    order: string[];
    pinning: ColumnPinningState;
    children: Snippet;
  } = $props();

  const columnState = setColumnState({
    get order() {
      return order;
    },
    get pinning() {
      return pinning;
    },
  });
</script>

{@render children?.()}
