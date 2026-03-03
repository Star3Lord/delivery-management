<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Table } from '@tanstack/table-core';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { useTableConfig } from '$lib/components/ui/data-grid/index.js';

  interface Props {
    table: Table<any>;
    nav?: Snippet;
  }

  let { table, nav }: Props = $props();

  const config = useTableConfig();

  const LIMIT_OPTIONS = [10, 20, 50, 100];

  const selected_count = $derived(
    table.getFilteredSelectedRowModel().rows.length
  );
  const total_count = $derived(table.getFilteredRowModel().rows.length);
</script>

<div
  class="sticky bottom-0 z-30 mt-auto flex items-center gap-3 border-t border-border bg-background px-4 py-2"
>
  <div class="flex items-center gap-1 text-xs text-muted-foreground">
    {#if selected_count > 0}
      <div
        class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-mono font-medium text-primary"
      >
        {selected_count}
        <span class="font-mono font-normal text-primary/70">selected</span>
      </div>
      <span>of {total_count} rows</span>
    {:else}
      <span>{total_count} rows</span>
    {/if}
  </div>

  <div class="ml-auto flex items-center gap-2">
    <div class="flex items-center gap-1.5">
      <span class="text-xs text-muted-foreground">Rows</span>
      <Select.Root
        type="single"
        value={String(config.limit)}
        onValueChange={(v) => {
          if (v) config.limit = Number(v);
        }}
      >
        <Select.Trigger size="sm" class="h-7 w-16 gap-1 text-xs">
          {config.limit}
        </Select.Trigger>
        <Select.Content align="end" class="min-w-20">
          {#each LIMIT_OPTIONS as opt (opt)}
            <Select.Item value={String(opt)} class="text-xs">
              {opt}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    {#if nav}
      <Separator orientation="vertical" class="h-5!" />
      {@render nav()}
    {/if}
  </div>
</div>
