<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import DatabaseIcon from '@lucide/svelte/icons/database';
  import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import * as Table from '$lib/components/ui/table/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import {
    list_import_rows,
    find_duplicate_matches,
    review_import_rows,
  } from '$lib/api/import.remote';
  import type { ImportState } from '../import-state.svelte';
  import type { RowDecision } from '$lib/utils/import/types';

  let { ctx }: { ctx: ImportState } = $props();

  type ImportRow = Awaited<ReturnType<typeof list_import_rows>>['rows'][number];
  type MatchResult = Awaited<
    ReturnType<typeof find_duplicate_matches>
  >['matches'][number];

  let all_rows = $state.raw<ImportRow[]>([]);
  let total = $state(0);
  let page_num = $state(0);
  let loading_rows = $state(false);
  let selected = $state<Set<string>>(new Set());
  let threshold = $state('all');

  let expanded_row_id = $state<string | null>(null);
  let matches_cache = $state<Map<string, MatchResult[]>>(new Map());
  let loading_matches = $state<string | null>(null);

  const PAGE_SIZE = 20;

  async function load(p: number) {
    if (!ctx.session_id) return;
    loading_rows = true;
    try {
      const result = await list_import_rows({
        session_id: ctx.session_id,
        status: 'duplicate',
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
      });
      all_rows = result.rows;
      total = result.total;
      page_num = p;
      selected = new Set();
      expanded_row_id = null;
      matches_cache = new Map();
    } finally {
      loading_rows = false;
    }
  }

  $effect(() => {
    void ctx.version;
    if (ctx.session_id && ctx.step === 2) load(0);
  });

  function get_dup_score(row: ImportRow): number {
    const conf = row.match_confidence as { duplicate?: number } | null;
    return conf?.duplicate ?? 0;
  }

  let rows = $derived.by(() => {
    if (threshold === 'all') return all_rows;
    if (threshold === 'high')
      return all_rows.filter((r) => get_dup_score(r) >= 0.95);
    if (threshold === 'medium')
      return all_rows.filter(
        (r) => get_dup_score(r) >= 0.85 && get_dup_score(r) < 0.95
      );
    if (threshold === 'low')
      return all_rows.filter((r) => get_dup_score(r) < 0.85);
    return all_rows;
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
    selected = all_selected ? new Set() : new Set(rows.map((r) => r.id));
  }

  async function toggle_expanded(row: ImportRow) {
    if (expanded_row_id === row.id) {
      expanded_row_id = null;
      return;
    }
    expanded_row_id = row.id;

    if (matches_cache.has(row.id)) return;

    if (!ctx.session_id) return;
    loading_matches = row.id;
    try {
      const result = await find_duplicate_matches({
        row_id: row.id,
        session_id: ctx.session_id,
      });
      const next = new Map(matches_cache);
      next.set(row.id, result.matches);
      matches_cache = next;
    } finally {
      loading_matches = null;
    }
  }

  async function approve_selected() {
    if (selected.size === 0 || !ctx.session_id) return;
    loading_rows = true;
    try {
      const decisions: RowDecision[] = [...selected].map((row_id) => {
        const row = rows.find((r) => r.id === row_id);
        return {
          row_id,
          action: 'approve' as const,
          party_id: row?.matched_party_id,
          vehicle_id: row?.matched_vehicle_id,
          product_id: row?.matched_product_id,
        };
      });
      await review_import_rows({ session_id: ctx.session_id, decisions });
      ctx.version++;
      await load(page_num);
    } finally {
      loading_rows = false;
    }
  }

  async function skip_selected() {
    if (selected.size === 0 || !ctx.session_id) return;
    loading_rows = true;
    try {
      const decisions: RowDecision[] = [...selected].map((row_id) => ({
        row_id,
        action: 'skip' as const,
      }));
      await review_import_rows({ session_id: ctx.session_id, decisions });
      ctx.version++;
      await load(page_num);
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

  function score_color(score: number): string {
    if (score >= 0.95) return 'text-red-500';
    if (score >= 0.85) return 'text-amber-500';
    return 'text-muted-foreground';
  }

  function score_label(score: number): string {
    if (score >= 0.95) return 'Exact';
    if (score >= 0.85) return 'Likely';
    return 'Possible';
  }

  function match_score_color(score: number): string {
    if (score >= 0.95)
      return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';
    if (score >= 0.85)
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
    return 'bg-muted text-muted-foreground';
  }
</script>

<div class="flex flex-col gap-4 pt-4">
  <!-- Toolbar -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Select.Root type="single" bind:value={threshold}>
        <Select.Trigger class="h-8 w-44 text-xs">
          {threshold === 'all'
            ? 'All duplicates'
            : threshold === 'high'
              ? 'Exact matches (95%+)'
              : threshold === 'medium'
                ? 'Likely (85-95%)'
                : 'Possible (<85%)'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="all">All duplicates</Select.Item>
          <Select.Item value="high">Exact matches (95%+)</Select.Item>
          <Select.Item value="medium">Likely (85-95%)</Select.Item>
          <Select.Item value="low">Possible (&lt;85%)</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    {#if some_selected}
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">
          {selected_count} selected
        </span>
        <Button
          size="sm"
          class="h-7 text-xs"
          disabled={loading_rows}
          onclick={approve_selected}
        >
          <CheckIcon class="size-3" />
          Approve anyway
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs"
          disabled={loading_rows}
          onclick={skip_selected}
        >
          <XIcon class="size-3" />
          Skip
        </Button>
      </div>
    {/if}
  </div>

  {#if rows.length === 0}
    <div class="py-12 text-center text-sm text-muted-foreground">
      <CopyIcon class="mx-auto mb-2 size-8 text-muted-foreground/50" />
      {#if threshold !== 'all'}
        No duplicates matching this filter.
      {:else}
        No duplicate rows detected.
      {/if}
    </div>
  {:else}
    <p class="text-xs text-muted-foreground">
      Rows matching existing delivery slips or other rows in this import. Click
      a row to see matching records.
    </p>

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
            <Table.Head class="w-24">Score</Table.Head>
            <Table.Head>Date</Table.Head>
            <Table.Head>Party</Table.Head>
            <Table.Head>Vehicle</Table.Head>
            <Table.Head>Product</Table.Head>
            <Table.Head>Qty</Table.Head>
            <Table.Head class="w-8"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each rows as row (row.id)}
            {@const score = get_dup_score(row)}
            {@const is_expanded = expanded_row_id === row.id}
            {@const row_matches = matches_cache.get(row.id)}
            {@const is_loading = loading_matches === row.id}
            <Table.Row
              class="cursor-pointer opacity-80 transition-colors hover:opacity-100 {is_expanded
                ? 'bg-muted/30'
                : ''}"
              onclick={() => toggle_expanded(row)}
            >
              <Table.Cell
                class="text-center"
                onclick={(e: MouseEvent) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selected.has(row.id)}
                  onCheckedChange={() => toggle(row.id)}
                />
              </Table.Cell>
              <Table.Cell class="text-center text-xs text-muted-foreground">
                {row.row_index}
              </Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-1.5">
                  <div
                    class="h-1.5 rounded-full {score >= 0.95
                      ? 'bg-red-500'
                      : score >= 0.85
                        ? 'bg-amber-500'
                        : 'bg-muted-foreground/30'}"
                    style="width: {Math.round(score * 100)}%"
                  ></div>
                  <span class="font-mono text-xs {score_color(score)}">
                    {Math.round(score * 100)}%
                  </span>
                  <Badge
                    variant={score >= 0.95 ? 'destructive' : 'outline'}
                    class="text-[9px] {score >= 0.85 && score < 0.95
                      ? 'border-amber-500/50 text-amber-600'
                      : ''}"
                  >
                    {score_label(score)}
                  </Badge>
                </div>
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
              <Table.Cell class="text-center">
                <ChevronDownIcon
                  class="size-4 text-muted-foreground transition-transform {is_expanded
                    ? 'rotate-180'
                    : ''}"
                />
              </Table.Cell>
            </Table.Row>

            <!-- Expanded comparison row -->
            {#if is_expanded}
              <Table.Row class="hover:bg-transparent">
                <Table.Cell colspan={9} class="bg-muted/20 p-0">
                  <div class="px-4 py-3">
                    {#if is_loading}
                      <div
                        class="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
                      >
                        <LoaderCircleIcon class="size-4 animate-spin" />
                        Loading matches...
                      </div>
                    {:else if row_matches && row_matches.length > 0}
                      <div class="flex flex-col gap-2">
                        <span
                          class="text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
                        >
                          Matching records ({row_matches.length})
                        </span>

                        <!-- Comparison header -->
                        <div
                          class="overflow-x-auto rounded-md border bg-background"
                        >
                          <table class="w-full text-sm">
                            <thead>
                              <tr
                                class="border-b bg-muted/40 text-xs text-muted-foreground"
                              >
                                <th class="px-3 py-1.5 text-left font-medium">
                                  Source
                                </th>
                                <th class="px-3 py-1.5 text-left font-medium">
                                  Match
                                </th>
                                <th class="px-3 py-1.5 text-left font-medium">
                                  Date
                                </th>
                                <th class="px-3 py-1.5 text-left font-medium">
                                  Party
                                </th>
                                <th class="px-3 py-1.5 text-left font-medium">
                                  Vehicle
                                </th>
                                <th class="px-3 py-1.5 text-left font-medium">
                                  Product
                                </th>
                                <th class="px-3 py-1.5 text-left font-medium">
                                  Qty
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <!-- Import row (the current row for reference) -->
                              <tr class="border-b bg-muted/20">
                                <td class="px-3 py-1.5">
                                  <div class="flex items-center gap-1.5">
                                    <FileSpreadsheetIcon
                                      class="size-3.5 text-blue-500"
                                    />
                                    <span
                                      class="text-xs font-medium text-blue-600 dark:text-blue-400"
                                    >
                                      This row (#{row.row_index})
                                    </span>
                                  </div>
                                </td>
                                <td class="px-3 py-1.5">
                                  <span class="text-xs text-muted-foreground">
                                    —
                                  </span>
                                </td>
                                <td class="px-3 py-1.5 text-xs">
                                  {get_mapped_value(row, 'date') || '—'}
                                </td>
                                <td class="px-3 py-1.5 text-xs">
                                  {get_mapped_value(row, 'party_name') || '—'}
                                </td>
                                <td class="px-3 py-1.5 font-mono text-xs">
                                  {get_mapped_value(row, 'vehicle_number') ||
                                    '—'}
                                </td>
                                <td class="px-3 py-1.5 text-xs">
                                  {get_mapped_value(row, 'product_name') || '—'}
                                </td>
                                <td class="px-3 py-1.5 font-mono text-xs">
                                  {get_mapped_value(row, 'product_quantity') ||
                                    '—'}
                                </td>
                              </tr>

                              {#each row_matches as match (match.delivery_id ?? `import-${match.row_index}`)}
                                {@const is_db = match.source === 'database'}
                                {@const vals = {
                                  date: get_mapped_value(row, 'date'),
                                  party: get_mapped_value(row, 'party_name'),
                                  vehicle: get_mapped_value(
                                    row,
                                    'vehicle_number'
                                  ),
                                  product: get_mapped_value(
                                    row,
                                    'product_name'
                                  ),
                                  qty: get_mapped_value(
                                    row,
                                    'product_quantity'
                                  ),
                                }}
                                <tr class="border-b last:border-b-0">
                                  <td class="px-3 py-1.5">
                                    <div class="flex items-center gap-1.5">
                                      {#if is_db}
                                        <DatabaseIcon
                                          class="size-3.5 text-emerald-500"
                                        />
                                        <span
                                          class="text-xs font-medium text-emerald-600 dark:text-emerald-400"
                                        >
                                          Saved delivery
                                        </span>
                                      {:else}
                                        <FileSpreadsheetIcon
                                          class="size-3.5 text-violet-500"
                                        />
                                        <span
                                          class="text-xs font-medium text-violet-600 dark:text-violet-400"
                                        >
                                          Import row #{match.row_index}
                                        </span>
                                      {/if}
                                    </div>
                                  </td>
                                  <td class="px-3 py-1.5">
                                    <span
                                      class="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold {match_score_color(
                                        match.score
                                      )}"
                                    >
                                      {Math.round(match.score * 100)}%
                                    </span>
                                  </td>
                                  <td
                                    class="px-3 py-1.5 text-xs {match.date !==
                                    vals.date
                                      ? 'font-semibold text-amber-600 dark:text-amber-400'
                                      : ''}"
                                  >
                                    {match.date || '—'}
                                  </td>
                                  <td
                                    class="px-3 py-1.5 text-xs {(match.party_name ??
                                      '') !== vals.party
                                      ? 'font-semibold text-amber-600 dark:text-amber-400'
                                      : ''}"
                                  >
                                    {match.party_name || '—'}
                                  </td>
                                  <td
                                    class="px-3 py-1.5 font-mono text-xs {(match.vehicle_number ??
                                      '') !== vals.vehicle
                                      ? 'font-semibold text-amber-600 dark:text-amber-400'
                                      : ''}"
                                  >
                                    {match.vehicle_number || '—'}
                                  </td>
                                  <td
                                    class="px-3 py-1.5 text-xs {(match.product_name ??
                                      '') !== vals.product
                                      ? 'font-semibold text-amber-600 dark:text-amber-400'
                                      : ''}"
                                  >
                                    {match.product_name || '—'}
                                  </td>
                                  <td
                                    class="px-3 py-1.5 font-mono text-xs {(match.product_quantity ??
                                      '') !== vals.qty
                                      ? 'font-semibold text-amber-600 dark:text-amber-400'
                                      : ''}"
                                  >
                                    {match.product_quantity || '—'}
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    {:else if row_matches}
                      <p class="py-2 text-center text-xs text-muted-foreground">
                        No matching records found above 80% threshold.
                      </p>
                    {/if}
                  </div>
                </Table.Cell>
              </Table.Row>
            {/if}
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    {#if total_pages > 1}
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">
          Page {page_num + 1} of {total_pages} ({total} rows)
        </span>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={page_num === 0 || loading_rows}
            onclick={() => load(page_num - 1)}
          >
            <ChevronLeftIcon class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={page_num >= total_pages - 1 || loading_rows}
            onclick={() => load(page_num + 1)}
          >
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
