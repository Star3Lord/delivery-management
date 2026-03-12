<script lang="ts">
  import * as Table from '$lib/components/ui/table/index.js';
  import type { ImportState } from '../import-state.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  let headers = $derived(ctx.raw_headers);
  let rows = $derived(ctx.sample_rows);
</script>

<div class="pt-4">
  {#if rows.length === 0}
    <p class="py-8 text-center text-sm text-muted-foreground">
      No sample data available
    </p>
  {:else}
    <div class="overflow-x-auto rounded-lg border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-12 text-center">#</Table.Head>
            {#each headers as header (header)}
              <Table.Head class="min-w-[120px] whitespace-nowrap">
                {header}
              </Table.Head>
            {/each}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each rows as row, i (i)}
            <Table.Row>
              <Table.Cell class="text-center text-xs text-muted-foreground">
                {i + 1}
              </Table.Cell>
              {#each headers as header (header)}
                <Table.Cell class="max-w-[200px] truncate text-sm">
                  {row[header] ?? ''}
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
    <p class="mt-2 text-xs text-muted-foreground">
      Showing first {rows.length} of {ctx.stats?.total_rows ?? 0} rows
    </p>
  {/if}
</div>
