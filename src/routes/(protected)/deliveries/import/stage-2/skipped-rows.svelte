<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import UndoIcon from '@lucide/svelte/icons/undo-2';
  import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
  import * as Table from '$lib/components/ui/table/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import {
    list_import_rows,
    recover_skipped_rows,
  } from '$lib/api/import.remote';
  import type { ImportState } from '../import-state.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  type ImportRow = Awaited<ReturnType<typeof list_import_rows>>['rows'][number];

  let rows = $state.raw<ImportRow[]>([]);
  let total = $state(0);
  let page = $state(0);
  let loading_rows = $state(false);
  let selected = $state<Set<string>>(new Set());

  const PAGE_SIZE = 20;

  async function load(p: number) {
    if (!ctx.session_id) return;
    loading_rows = true;
    try {
      const result = await list_import_rows({
        session_id: ctx.session_id,
        status: 'skipped',
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
      });
      rows = result.rows;
      total = result.total;
      page = p;
      selected = new Set();
    } finally {
      loading_rows = false;
    }
  }

  $effect(() => {
    void ctx.version;
    if (ctx.session_id && ctx.step === 2) load(0);
  });

  let total_pages = $derived(Math.ceil(total / PAGE_SIZE));

  let all_selected = $derived(
    rows.length > 0 && rows.every((r) => selected.has(r.id))
  );
  let some_selected = $derived(rows.some((r) => selected.has(r.id)));
  let selected_count = $derived(rows.filter((r) => selected.has(r.id)).length);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function toggle_all() {
    if (all_selected) {
      selected = new Set();
    } else {
      selected = new Set(rows.map((r) => r.id));
    }
  }

  async function recover_selected() {
    if (selected.size === 0 || !ctx.session_id) return;
    loading_rows = true;
    try {
      await recover_skipped_rows({
        session_id: ctx.session_id,
        row_ids: [...selected],
      });
      ctx.version++;
      await load(page);
    } finally {
      loading_rows = false;
    }
  }

  function get_mapped_value(row: ImportRow, field: string): string {
    const mapped = row.mapped_data as Record<string, unknown> | null;
    if (!mapped) return '';
    const val = mapped[field];
    return val != null ? String(val) : '';
  }

  function get_skip_reason(row: ImportRow): string {
    const issues = row.issues as { message: string }[] | null;
    if (issues && issues.length > 0)
      return issues.map((i) => i.message).join('; ');
    return 'User skipped';
  }
</script>

<div class="flex flex-col gap-4 pt-4">
  {#if some_selected}
    <div
      class="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2"
    >
      <span class="text-xs font-medium">{selected_count} selected</span>
      <Button
        size="sm"
        class="h-7 text-xs"
        disabled={loading_rows}
        onclick={recover_selected}
      >
        <UndoIcon class="size-3" />
        Recover to Pending
      </Button>
    </div>
  {/if}

  {#if rows.length === 0}
    <p class="py-12 text-center text-sm text-muted-foreground">
      No skipped rows
    </p>
  {:else}
    <div class="overflow-x-auto rounded-lg border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-10">
              <Checkbox
                checked={all_selected}
                indeterminate={some_selected && !all_selected}
                onCheckedChange={toggle_all}
              />
            </Table.Head>
            <Table.Head class="w-12 text-center">#</Table.Head>
            <Table.Head>Date</Table.Head>
            <Table.Head>Party</Table.Head>
            <Table.Head>Vehicle</Table.Head>
            <Table.Head>Product</Table.Head>
            <Table.Head>Qty</Table.Head>
            <Table.Head>Reason</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each rows as row (row.id)}
            {@const issues = (row.issues as { message: string }[]) ?? []}
            {@const has_issues = issues.length > 0}
            <Table.Row class="opacity-75">
              <Table.Cell class="text-center">
                <Checkbox
                  checked={selected.has(row.id)}
                  onCheckedChange={() => toggle(row.id)}
                />
              </Table.Cell>
              <Table.Cell class="text-center text-xs text-muted-foreground">
                {row.row_index}
              </Table.Cell>
              <Table.Cell class="text-sm">
                {get_mapped_value(row, 'date') || '—'}
              </Table.Cell>
              <Table.Cell class="text-sm">
                {get_mapped_value(row, 'party_name') || '—'}
              </Table.Cell>
              <Table.Cell class="font-mono text-sm">
                {get_mapped_value(row, 'vehicle_number') || '—'}
              </Table.Cell>
              <Table.Cell class="text-sm">
                {get_mapped_value(row, 'product_name') || '—'}
              </Table.Cell>
              <Table.Cell class="font-mono text-sm">
                {get_mapped_value(row, 'product_quantity') || '—'}
              </Table.Cell>
              <Table.Cell>
                {#if has_issues}
                  <div class="flex items-center gap-1">
                    <AlertTriangleIcon class="size-3 shrink-0 text-amber-500" />
                    <span class="text-xs text-amber-600">
                      {issues.map((i) => i.message).join('; ')}
                    </span>
                  </div>
                {:else}
                  <span class="text-xs text-muted-foreground">
                    User skipped
                  </span>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    {#if total_pages > 1}
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">
          Page {page + 1} of {total_pages} ({total} rows)
        </span>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={page === 0 || loading_rows}
            onclick={() => load(page - 1)}
          >
            <ChevronLeftIcon class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={page >= total_pages - 1 || loading_rows}
            onclick={() => load(page + 1)}
          >
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
