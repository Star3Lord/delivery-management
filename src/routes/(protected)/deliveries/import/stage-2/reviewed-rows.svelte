<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import * as Table from '$lib/components/ui/table/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { list_import_rows } from '$lib/api/import.remote';
  import type { ImportState } from '../import-state.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  type ImportRow = Awaited<ReturnType<typeof list_import_rows>>['rows'][number];

  let filter = $state<string>('all');
  let reviewed_rows = $state.raw<ImportRow[]>([]);
  let reviewed_total = $state(0);
  let reviewed_page = $state(0);
  let loading_reviewed = $state(false);

  const PAGE_SIZE = 20;

  const FILTER_OPTIONS: { value: string; label: string; statuses: string[] }[] =
    [
      { value: 'all', label: 'All', statuses: ['approved', 'saved'] },
      {
        value: 'approved',
        label: 'Approved (unsaved)',
        statuses: ['approved'],
      },
      { value: 'saved', label: 'Saved', statuses: ['saved'] },
    ];

  let active_filter = $derived(
    FILTER_OPTIONS.find((f) => f.value === filter) ?? FILTER_OPTIONS[0]
  );

  async function load_reviewed(page: number) {
    if (!ctx.session_id) return;
    loading_reviewed = true;
    try {
      const result = await list_import_rows({
        session_id: ctx.session_id,
        status: active_filter.statuses as ('approved' | 'saved' | 'skipped')[],
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      reviewed_rows = result.rows;
      reviewed_total = result.total;
      reviewed_page = page;
    } finally {
      loading_reviewed = false;
    }
  }

  $effect(() => {
    void filter;
    void ctx.version;
    if (ctx.session_id && ctx.step === 2) {
      load_reviewed(0);
    }
  });

  let total_pages = $derived(Math.ceil(reviewed_total / PAGE_SIZE));

  function get_mapped_value(row: ImportRow, field: string): string {
    const mapped = row.mapped_data as Record<string, unknown> | null;
    if (!mapped) return '';
    const val = mapped[field];
    return val != null ? String(val) : '';
  }

  function status_badge_variant(
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'saved') return 'default';
    if (status === 'approved') return 'outline';
    if (status === 'skipped') return 'secondary';
    return 'outline';
  }

  function status_label(status: string): string {
    if (status === 'approved') return 'Approved';
    if (status === 'saved') return 'Saved';
    if (status === 'skipped') return 'Skipped';
    return status;
  }
</script>

<div class="flex flex-col gap-4 pt-4">
  <div class="flex items-center justify-between">
    <Select.Root type="single" bind:value={filter}>
      <Select.Trigger class="w-48">
        {active_filter.label}
      </Select.Trigger>
      <Select.Content>
        {#each FILTER_OPTIONS as opt (opt.value)}
          <Select.Item value={opt.value}>{opt.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>

    <span class="text-sm text-muted-foreground">{reviewed_total} rows</span>
  </div>

  {#if reviewed_rows.length === 0}
    <p class="py-12 text-center text-sm text-muted-foreground">
      {#if filter === 'approved'}
        No approved rows waiting to be saved.
      {:else}
        No approved or saved rows yet.
      {/if}
    </p>
  {:else}
    <div class="overflow-x-auto rounded-lg border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-12 text-center">#</Table.Head>
            <Table.Head>Date</Table.Head>
            <Table.Head>Party</Table.Head>
            <Table.Head>Vehicle</Table.Head>
            <Table.Head>Product</Table.Head>
            <Table.Head>Qty</Table.Head>
            <Table.Head>Royalty</Table.Head>
            <Table.Head class="w-24">Status</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each reviewed_rows as row (row.id)}
            <Table.Row
              class={row.status === 'approved' ? 'bg-green-500/5' : ''}
            >
              <Table.Cell class="text-center text-xs text-muted-foreground">
                {row.row_index}
              </Table.Cell>
              <Table.Cell class="text-sm">
                {get_mapped_value(row, 'date')}
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
                {get_mapped_value(row, 'product_quantity')}
              </Table.Cell>
              <Table.Cell class="text-sm">
                {@const rn = get_mapped_value(row, 'royalty_number')}
                {rn || '—'}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={status_badge_variant(row.status)}
                  class="text-[10px] {row.status === 'approved'
                    ? 'border-green-500/50 text-green-600'
                    : ''}"
                >
                  {status_label(row.status)}
                </Badge>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    {#if total_pages > 1}
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">
          Page {reviewed_page + 1} of {total_pages}
        </span>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={reviewed_page === 0 || loading_reviewed}
            onclick={() => load_reviewed(reviewed_page - 1)}
          >
            <ChevronLeftIcon class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={reviewed_page >= total_pages - 1 || loading_reviewed}
            onclick={() => load_reviewed(reviewed_page + 1)}
          >
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
