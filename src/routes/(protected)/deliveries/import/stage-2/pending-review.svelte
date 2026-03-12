<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import BanIcon from '@lucide/svelte/icons/ban';
  import * as Table from '$lib/components/ui/table/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import { list_all_customers } from '$lib/api/customers.remote';
  import { list_all_vehicles } from '$lib/api/vehicles.remote';
  import { list_all_products } from '$lib/api/products.remote';
  import type { ImportState } from '../import-state.svelte';
  import type { RowDecision } from '$lib/utils/import/types';
  import RowReviewSheet from './row-review-sheet.svelte';
  import type { RowEdits } from './row-review-sheet.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  let parties_query = $derived(list_all_customers());
  let vehicles_query = $derived(list_all_vehicles());
  let products_query = $derived(list_all_products());

  type BatchRow = (typeof ctx.current_batch)[number];
  type RowAction = 'approve' | 'skip' | null;

  type RowOverride = {
    action: RowAction;
    party_id?: string | null;
    vehicle_id?: string | null;
    product_id?: string | null;
    new_party_name?: string | null;
    new_vehicle_number?: string | null;
    new_product_name?: string | null;
    field_overrides?: Record<string, unknown>;
  };

  type RowOverrides = Record<string, RowOverride>;

  let overrides = $state<RowOverrides>({});
  let selected_ids = $state<Set<string>>(new Set());

  // Review sheet state
  let review_row = $state<BatchRow | null>(null);
  let review_open = $state(false);

  $effect(() => {
    void ctx.current_batch;
    overrides = {};
    selected_ids = new Set();
  });

  // ── Helpers ──────────────────────────────────────────────

  function row_has_issues(row: BatchRow): boolean {
    const issues = row.issues as { field: string }[] | null;
    return !!issues && issues.length > 0;
  }

  function row_is_duplicate(row: BatchRow): boolean {
    return row.status === 'duplicate';
  }

  function row_is_actionable(row: BatchRow): boolean {
    return row.status === 'pending' || row.status === 'duplicate';
  }

  let actionable_rows = $derived(ctx.current_batch.filter(row_is_actionable));

  // ── Selection ────────────────────────────────────────────

  let all_selected = $derived(
    actionable_rows.length > 0 &&
      actionable_rows.every((r) => selected_ids.has(r.id))
  );

  let some_selected = $derived(
    actionable_rows.some((r) => selected_ids.has(r.id))
  );

  let selected_count = $derived(
    actionable_rows.filter((r) => selected_ids.has(r.id)).length
  );

  function toggle_select(row_id: string) {
    const next = new Set(selected_ids);
    if (next.has(row_id)) next.delete(row_id);
    else next.add(row_id);
    selected_ids = next;
  }

  function toggle_select_all() {
    if (all_selected) {
      selected_ids = new Set();
    } else {
      selected_ids = new Set(actionable_rows.map((r) => r.id));
    }
  }

  // ── Actions ──────────────────────────────────────────────

  function set_action(row_id: string, action: RowAction) {
    overrides = {
      ...overrides,
      [row_id]: { ...overrides[row_id], action },
    };
  }

  function apply_action_to_selected(action: RowAction) {
    const next = { ...overrides };
    for (const id of selected_ids) {
      next[id] = { ...next[id], action };
    }
    overrides = next;
  }

  function apply_action_to_all(action: RowAction) {
    const next: RowOverrides = { ...overrides };
    for (const row of actionable_rows) {
      next[row.id] = { ...next[row.id], action };
    }
    overrides = next;
  }

  function approve_without_issues() {
    const next = { ...overrides };
    for (const row of actionable_rows) {
      if (!row_has_issues(row) && !row_is_duplicate(row)) {
        next[row.id] = { ...next[row.id], action: 'approve' };
      }
    }
    overrides = next;
  }

  function skip_with_issues() {
    const next = { ...overrides };
    for (const row of actionable_rows) {
      if (row_has_issues(row)) {
        next[row.id] = { ...next[row.id], action: 'skip' };
      }
    }
    overrides = next;
  }

  function skip_duplicates() {
    const next = { ...overrides };
    for (const row of ctx.current_batch) {
      if (row_is_duplicate(row)) {
        next[row.id] = { ...next[row.id], action: 'skip' };
      }
    }
    overrides = next;
  }

  function clear_all_actions() {
    overrides = {};
  }

  function get_row_action(row_id: string): RowAction {
    return overrides[row_id]?.action ?? null;
  }

  // ── Review sheet handlers ────────────────────────────────

  function open_review(row: BatchRow) {
    review_row = row;
    review_open = true;
  }

  function handle_review_approve(edits: RowEdits) {
    if (!review_row) return;
    overrides = {
      ...overrides,
      [review_row.id]: {
        action: 'approve',
        party_id: edits.party_id,
        vehicle_id: edits.vehicle_id,
        product_id: edits.product_id,
        new_party_name: edits.new_party_name,
        new_vehicle_number: edits.new_vehicle_number,
        new_product_name: edits.new_product_name,
        field_overrides: edits.field_overrides,
      },
    };
  }

  function handle_review_skip() {
    if (!review_row) return;
    overrides = {
      ...overrides,
      [review_row.id]: { ...overrides[review_row.id], action: 'skip' },
    };
  }

  // ── Derived stats ────────────────────────────────────────

  let has_decisions = $derived(
    Object.values(overrides).some((o) => o.action != null)
  );

  let decision_count = $derived(
    Object.values(overrides).filter((o) => o.action != null).length
  );

  let approve_count = $derived(
    Object.values(overrides).filter((o) => o.action === 'approve').length
  );

  let skip_count = $derived(
    Object.values(overrides).filter((o) => o.action === 'skip').length
  );

  let total_pages = $derived(Math.ceil(ctx.batch_total / ctx.batch_size));

  let issues_count = $derived(ctx.current_batch.filter(row_has_issues).length);
  let duplicates_count = $derived(
    ctx.current_batch.filter(row_is_duplicate).length
  );
  let clean_count = $derived(
    actionable_rows.filter((r) => !row_has_issues(r) && !row_is_duplicate(r))
      .length
  );

  async function submit_decisions() {
    const decisions: RowDecision[] = [];
    for (const [row_id, o] of Object.entries(overrides)) {
      if (!o.action) continue;
      const row = ctx.current_batch.find((r) => r.id === row_id);
      decisions.push({
        row_id,
        action: o.action,
        party_id: o.party_id ?? row?.matched_party_id,
        vehicle_id: o.vehicle_id ?? row?.matched_vehicle_id,
        product_id: o.product_id ?? row?.matched_product_id,
        new_party_name: o.new_party_name,
        new_vehicle_name: o.new_vehicle_number,
        new_product_name: o.new_product_name,
      });
    }
    await ctx.review_batch(decisions);
  }

  function get_mapped_value(row: BatchRow, field: string): string {
    const mapped = row.mapped_data as Record<string, unknown> | null;
    if (!mapped) return '';
    const val = mapped[field];
    return val != null ? String(val) : '';
  }
</script>

<!-- Review Sheet -->
<RowReviewSheet
  row={review_row}
  bind:open={review_open}
  onApprove={handle_review_approve}
  onSkip={handle_review_skip}
/>

<div class="flex flex-col gap-4 pt-4">
  {#if ctx.current_batch.length === 0}
    <div class="py-12 text-center text-sm text-muted-foreground">
      {#if ctx.is_completed}
        All rows have been reviewed.
      {:else}
        No pending rows. All rows have been reviewed.
      {/if}
    </div>
  {:else}
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      {#if some_selected}
        <div
          class="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1"
        >
          <span class="text-xs font-medium text-muted-foreground">
            {selected_count} selected
          </span>
          <div class="mx-1 h-4 w-px bg-border"></div>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs"
            onclick={() => apply_action_to_selected('approve')}
          >
            <CheckIcon class="size-3" />
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs"
            onclick={() => apply_action_to_selected('skip')}
          >
            <XIcon class="size-3" />
            Skip
          </Button>
        </div>
      {/if}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button variant="outline" size="sm" {...props}>
              Quick Actions
              <ChevronDownIcon class="size-3.5" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start">
          <DropdownMenu.Group>
            <DropdownMenu.GroupHeading>
              Apply to all on page
            </DropdownMenu.GroupHeading>
            <DropdownMenu.Item onclick={() => apply_action_to_all('approve')}>
              <CheckIcon class="size-3.5 text-green-600" />
              Approve all rows
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => apply_action_to_all('skip')}>
              <XIcon class="size-3.5 text-red-500" />
              Skip all rows
            </DropdownMenu.Item>
          </DropdownMenu.Group>
          <DropdownMenu.Separator />
          <DropdownMenu.Group>
            <DropdownMenu.GroupHeading>Smart actions</DropdownMenu.GroupHeading>
            <DropdownMenu.Item
              onclick={approve_without_issues}
              disabled={clean_count === 0}
            >
              <ShieldCheckIcon class="size-3.5 text-green-600" />
              Approve clean rows ({clean_count})
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={skip_with_issues}
              disabled={issues_count === 0}
            >
              <AlertTriangleIcon class="size-3.5 text-amber-500" />
              Skip rows with issues ({issues_count})
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={skip_duplicates}
              disabled={duplicates_count === 0}
            >
              <CopyIcon class="size-3.5 text-blue-500" />
              Skip duplicates ({duplicates_count})
            </DropdownMenu.Item>
          </DropdownMenu.Group>
          {#if has_decisions}
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={clear_all_actions}>
              <BanIcon class="size-3.5 text-muted-foreground" />
              Clear all decisions
            </DropdownMenu.Item>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <div class="flex-1"></div>

      {#if has_decisions}
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          {#if approve_count > 0}
            <span class="text-green-600">{approve_count} approve</span>
          {/if}
          {#if skip_count > 0}
            <span class="text-red-500">{skip_count} skip</span>
          {/if}
        </div>
      {/if}

      <Button
        size="sm"
        disabled={!has_decisions || ctx.loading}
        onclick={submit_decisions}
      >
        Submit {decision_count} Decision{decision_count === 1 ? '' : 's'}
      </Button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto rounded-lg border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-10 text-center">
              <Checkbox
                checked={all_selected}
                indeterminate={some_selected && !all_selected}
                onCheckedChange={toggle_select_all}
              />
            </Table.Head>
            <Table.Head class="w-12 text-center">#</Table.Head>
            <Table.Head>Date</Table.Head>
            <Table.Head>Party</Table.Head>
            <Table.Head>Vehicle</Table.Head>
            <Table.Head>Product</Table.Head>
            <Table.Head>Qty</Table.Head>
            <Table.Head>Royalty</Table.Head>
            <Table.Head class="w-20">Flags</Table.Head>
            <Table.Head class="w-36">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each ctx.current_batch as row (row.id)}
            {@const action = get_row_action(row.id)}
            {@const is_dup = row_is_duplicate(row)}
            {@const has_issue = row_has_issues(row)}
            {@const issues =
              (row.issues as { field: string; message: string }[]) ?? []}
            {@const is_selected = selected_ids.has(row.id)}
            {@const is_actionable = row_is_actionable(row)}
            <Table.Row
              class="{action === 'approve'
                ? 'bg-green-500/5'
                : action === 'skip'
                  ? 'bg-muted/50 opacity-60'
                  : ''} {is_selected
                ? 'ring-1 ring-primary/20 ring-inset'
                : ''}"
            >
              <Table.Cell class="text-center">
                {#if is_actionable}
                  <Checkbox
                    checked={is_selected}
                    onCheckedChange={() => toggle_select(row.id)}
                  />
                {/if}
              </Table.Cell>

              <Table.Cell class="text-center text-xs text-muted-foreground">
                {row.row_index}
              </Table.Cell>

              <Table.Cell class="text-sm">
                {get_mapped_value(row, 'date')}
              </Table.Cell>

              <Table.Cell>
                {#if overrides[row.id]?.party_id}
                  {@const party = parties_query.current?.find(
                    (p) => p.id === overrides[row.id].party_id
                  )}
                  <div class="flex items-center gap-1">
                    <Badge variant="outline" class="text-[9px]">Edited</Badge>
                    <span class="text-sm">{party?.name ?? '—'}</span>
                  </div>
                {:else if overrides[row.id]?.new_party_name}
                  <div class="flex items-center gap-1">
                    <Badge variant="secondary" class="text-[10px]">New</Badge>
                    <span class="text-sm">
                      {overrides[row.id].new_party_name}
                    </span>
                  </div>
                {:else if row.matched_party_id}
                  {@const party = parties_query.current?.find(
                    (p) => p.id === row.matched_party_id
                  )}
                  <div class="flex items-center gap-1">
                    <span class="text-sm">{party?.name ?? '—'}</span>
                    {#if row.match_confidence}
                      {@const conf = (row.match_confidence as { party: number })
                        .party}
                      {#if conf < 1}
                        <Badge variant="outline" class="text-[9px]">
                          {Math.round(conf * 100)}%
                        </Badge>
                      {/if}
                    {/if}
                  </div>
                {:else if row.new_party_name}
                  <div class="flex items-center gap-1">
                    <Badge variant="secondary" class="text-[10px]">New</Badge>
                    <span class="text-sm">{row.new_party_name}</span>
                  </div>
                {:else}
                  <span class="text-sm text-muted-foreground">—</span>
                {/if}
              </Table.Cell>

              <Table.Cell>
                {#if overrides[row.id]?.vehicle_id}
                  {@const veh = vehicles_query.current?.find(
                    (v) => v.id === overrides[row.id].vehicle_id
                  )}
                  <div class="flex items-center gap-1">
                    <Badge variant="outline" class="text-[9px]">Edited</Badge>
                    <span class="font-mono text-sm">
                      {veh?.number_plate ?? '—'}
                    </span>
                  </div>
                {:else if overrides[row.id]?.new_vehicle_number}
                  <div class="flex items-center gap-1">
                    <Badge variant="secondary" class="text-[10px]">New</Badge>
                    <span class="font-mono text-sm">
                      {overrides[row.id].new_vehicle_number}
                    </span>
                  </div>
                {:else if row.matched_vehicle_id}
                  {@const veh = vehicles_query.current?.find(
                    (v) => v.id === row.matched_vehicle_id
                  )}
                  <div class="flex items-center gap-1">
                    <span class="font-mono text-sm">
                      {veh?.number_plate ?? '—'}
                    </span>
                    {#if row.match_confidence}
                      {@const conf = (
                        row.match_confidence as { vehicle: number }
                      ).vehicle}
                      {#if conf < 1}
                        <Badge variant="outline" class="text-[9px]">
                          {Math.round(conf * 100)}%
                        </Badge>
                      {/if}
                    {/if}
                  </div>
                {:else if row.new_vehicle_number}
                  <div class="flex items-center gap-1">
                    <Badge variant="secondary" class="text-[10px]">New</Badge>
                    <span class="font-mono text-sm">
                      {row.new_vehicle_number}
                    </span>
                  </div>
                {:else}
                  <span class="text-sm text-muted-foreground">—</span>
                {/if}
              </Table.Cell>

              <Table.Cell>
                {#if overrides[row.id]?.product_id}
                  {@const prod = products_query.current?.find(
                    (p) => p.id === overrides[row.id].product_id
                  )}
                  <div class="flex items-center gap-1">
                    <Badge variant="outline" class="text-[9px]">Edited</Badge>
                    <span class="text-sm">{prod?.name ?? '—'}</span>
                  </div>
                {:else if overrides[row.id]?.new_product_name}
                  <div class="flex items-center gap-1">
                    <Badge variant="secondary" class="text-[10px]">New</Badge>
                    <span class="text-sm">
                      {overrides[row.id].new_product_name}
                    </span>
                  </div>
                {:else if row.matched_product_id}
                  {@const prod = products_query.current?.find(
                    (p) => p.id === row.matched_product_id
                  )}
                  <div class="flex items-center gap-1">
                    <span class="text-sm">{prod?.name ?? '—'}</span>
                    {#if row.match_confidence}
                      {@const conf = (
                        row.match_confidence as { product: number }
                      ).product}
                      {#if conf < 1}
                        <Badge variant="outline" class="text-[9px]">
                          {Math.round(conf * 100)}%
                        </Badge>
                      {/if}
                    {/if}
                  </div>
                {:else if row.new_product_name}
                  <div class="flex items-center gap-1">
                    <Badge variant="secondary" class="text-[10px]">New</Badge>
                    <span class="text-sm">{row.new_product_name}</span>
                  </div>
                {:else}
                  <span class="text-sm text-muted-foreground">—</span>
                {/if}
              </Table.Cell>

              <Table.Cell class="font-mono text-sm">
                {get_mapped_value(row, 'product_quantity')}
              </Table.Cell>

              <Table.Cell class="text-sm">
                {@const rn = get_mapped_value(row, 'royalty_number')}
                {@const rq = get_mapped_value(row, 'royalty_quantity')}
                {#if rn}
                  <span class="font-mono">{rn}</span>
                  {#if rq}
                    <span class="text-muted-foreground">/ {rq}</span>
                  {/if}
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </Table.Cell>

              <Table.Cell>
                <div class="flex items-center gap-1">
                  {#if is_dup}
                    <Badge variant="destructive" class="text-[10px]">
                      <CopyIcon class="mr-1 size-3" />
                      Dup
                    </Badge>
                  {/if}
                  {#if has_issue}
                    <Badge
                      variant="outline"
                      class="border-amber-500/50 text-[10px] text-amber-600"
                      title={issues.map((i) => i.message).join(', ')}
                    >
                      <AlertTriangleIcon class="mr-1 size-3" />
                      {issues.length}
                    </Badge>
                  {/if}
                </div>
              </Table.Cell>

              <Table.Cell>
                {#if is_actionable}
                  <div class="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 px-2 text-xs"
                      onclick={() => open_review(row)}
                    >
                      <PencilIcon class="size-3" />
                      Review
                    </Button>
                    <button
                      class="rounded p-1 transition-colors hover:bg-green-500/20 {action ===
                      'approve'
                        ? 'bg-green-500/20 text-green-600'
                        : 'text-muted-foreground'}"
                      onclick={() =>
                        set_action(
                          row.id,
                          action === 'approve' ? null : 'approve'
                        )}
                      title="Approve"
                    >
                      <CheckIcon class="size-4" />
                    </button>
                    <button
                      class="rounded p-1 transition-colors hover:bg-red-500/20 {action ===
                      'skip'
                        ? 'bg-red-500/20 text-red-600'
                        : 'text-muted-foreground'}"
                      onclick={() =>
                        set_action(row.id, action === 'skip' ? null : 'skip')}
                      title="Skip"
                    >
                      <XIcon class="size-4" />
                    </button>
                  </div>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    <!-- Pagination -->
    {#if total_pages > 1}
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">
          Page {ctx.batch_page + 1} of {total_pages}
          ({ctx.batch_total} rows)
        </span>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={ctx.batch_page === 0 || ctx.loading}
            onclick={() => ctx.load_batch(ctx.batch_page - 1, 'pending')}
          >
            <ChevronLeftIcon class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            disabled={ctx.batch_page >= total_pages - 1 || ctx.loading}
            onclick={() => ctx.load_batch(ctx.batch_page + 1, 'pending')}
          >
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
