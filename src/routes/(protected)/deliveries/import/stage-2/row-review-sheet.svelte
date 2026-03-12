<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import * as Collapsible from '$lib/components/ui/collapsible/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import SelectParty from '$lib/components/data/select-party.svelte';
  import SelectVehicle from '$lib/components/data/select-vehicle.svelte';
  import SelectProduct from '$lib/components/data/select-product.svelte';
  import { DELIVERY_FIELD_LABELS } from '$lib/utils/import/types';
  import type { DeliveryField } from '$lib/utils/import/types';
  import type { list_import_rows } from '$lib/api/import.remote';

  type ImportRow = Awaited<ReturnType<typeof list_import_rows>>['rows'][number];

  let {
    row,
    open = $bindable(false),
    onApprove,
    onSkip,
  }: {
    row: ImportRow | null;
    open: boolean;
    onApprove: (edits: RowEdits) => void;
    onSkip: () => void;
  } = $props();

  export interface RowEdits {
    party_id?: string | null;
    vehicle_id?: string | null;
    product_id?: string | null;
    new_party_name?: string | null;
    new_vehicle_number?: string | null;
    new_product_name?: string | null;
    field_overrides?: Record<string, unknown>;
  }

  // Local editable state, reset when row changes
  let party_mode = $state<'existing' | 'new'>('existing');
  let vehicle_mode = $state<'existing' | 'new'>('existing');
  let product_mode = $state<'existing' | 'new'>('existing');

  let selected_party_id = $state<string | undefined>();
  let selected_vehicle_id = $state<string | undefined>();
  let selected_product_id = $state<string | undefined>();

  let new_party_name = $state('');
  let new_vehicle_number = $state('');
  let new_product_name = $state('');

  let field_edits = $state<Record<string, string>>({});

  $effect(() => {
    if (!row) return;

    selected_party_id = row.matched_party_id ?? undefined;
    selected_vehicle_id = row.matched_vehicle_id ?? undefined;
    selected_product_id = row.matched_product_id ?? undefined;

    new_party_name = row.new_party_name ?? '';
    new_vehicle_number = row.new_vehicle_number ?? '';
    new_product_name = row.new_product_name ?? '';

    party_mode = row.matched_party_id
      ? 'existing'
      : row.new_party_name
        ? 'new'
        : 'existing';
    vehicle_mode = row.matched_vehicle_id
      ? 'existing'
      : row.new_vehicle_number
        ? 'new'
        : 'existing';
    product_mode = row.matched_product_id
      ? 'existing'
      : row.new_product_name
        ? 'new'
        : 'existing';

    field_edits = {};
  });

  let raw_data = $derived(
    (row?.raw_data as Record<string, unknown> | null) ?? {}
  );

  let raw_data_entries = $derived(
    Object.entries(raw_data).filter(([_, v]) => v != null && v !== '')
  );

  let show_raw = $state(false);

  let mapped = $derived(
    (row?.mapped_data as Record<string, unknown> | null) ?? {}
  );

  let issues = $derived(
    (row?.issues as {
      field: string;
      type: string;
      message: string;
      original_value?: unknown;
    }[]) ?? []
  );

  let is_duplicate = $derived(row?.status === 'duplicate');

  let confidence = $derived(
    row?.match_confidence as {
      party: number;
      vehicle: number;
      product: number;
    } | null
  );

  const DATA_FIELDS: { key: DeliveryField; editable: boolean }[] = [
    { key: 'date', editable: true },
    { key: 'product_quantity', editable: true },
    { key: 'royalty_number', editable: true },
    { key: 'royalty_quantity', editable: true },
  ];

  function get_field_value(key: string): string {
    if (key in field_edits) return field_edits[key];
    const val = mapped[key];
    return val != null ? String(val) : '';
  }

  function set_field_value(key: string, value: string) {
    field_edits = { ...field_edits, [key]: value };
  }

  function format_confidence(score: number | undefined): string {
    if (score == null || score === 0) return '';
    if (score >= 1) return 'Exact match';
    return `${Math.round(score * 100)}% match`;
  }

  function handle_approve() {
    const edits: RowEdits = { field_overrides: { ...field_edits } };

    if (party_mode === 'existing') {
      edits.party_id = selected_party_id ?? null;
      edits.new_party_name = null;
    } else {
      edits.party_id = null;
      edits.new_party_name = new_party_name || null;
    }

    if (vehicle_mode === 'existing') {
      edits.vehicle_id = selected_vehicle_id ?? null;
      edits.new_vehicle_number = null;
    } else {
      edits.vehicle_id = null;
      edits.new_vehicle_number = new_vehicle_number || null;
    }

    if (product_mode === 'existing') {
      edits.product_id = selected_product_id ?? null;
      edits.new_product_name = null;
    } else {
      edits.product_id = null;
      edits.new_product_name = new_product_name || null;
    }

    onApprove(edits);
    open = false;
  }

  function handle_skip() {
    onSkip();
    open = false;
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content class="gap-0 overflow-y-auto sm:max-w-xl">
    <Sheet.Header class="border-b px-6 py-4">
      <Sheet.Title>Row #{row?.row_index ?? ''}</Sheet.Title>
      <Sheet.Description class="sr-only">
        Review row before approving or skipping.
      </Sheet.Description>
    </Sheet.Header>

    {#if row}
      <div class="flex flex-col divide-y overflow-y-auto">
        <!-- Flags -->
        {#if is_duplicate || issues.length > 0}
          <div class="flex flex-wrap gap-1.5 bg-muted/30 px-6 py-3">
            {#if is_duplicate}
              <Badge variant="destructive" class="text-[11px]">
                <CopyIcon class="mr-1 size-3" />
                Possible duplicate
              </Badge>
            {/if}
            {#each issues as issue (issue.field + issue.type)}
              <Badge
                variant="outline"
                class="border-amber-500/50 text-[11px] text-amber-600"
              >
                <AlertTriangleIcon class="mr-1 size-3" />
                {issue.message}
              </Badge>
            {/each}
          </div>
        {/if}

        <!-- Original file data (collapsible) -->
        {#if raw_data_entries.length > 0}
          <Collapsible.Root bind:open={show_raw}>
            <div class="border-b">
              <Collapsible.Trigger
                class="flex w-full items-center gap-2 px-6 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <FileSpreadsheetIcon class="size-3.5 text-muted-foreground" />
                <span class="text-xs font-medium text-muted-foreground">
                  Original File Data
                </span>
                <Badge variant="secondary" class="ml-1 text-[10px]">
                  {raw_data_entries.length} columns
                </Badge>
                <div class="flex-1"></div>
                <ChevronDownIcon
                  class="size-3.5 text-muted-foreground transition-transform {show_raw
                    ? 'rotate-180'
                    : ''}"
                />
              </Collapsible.Trigger>
              <Collapsible.Content>
                <div
                  class="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-muted/20 px-6 pb-3"
                >
                  {#each raw_data_entries as [key, value] (key)}
                    <div class="flex flex-col gap-0.5">
                      <span class="text-[11px] text-muted-foreground">
                        {key}
                      </span>
                      <span class="text-sm wrap-break-word">{value}</span>
                    </div>
                  {/each}
                </div>
              </Collapsible.Content>
            </div>
          </Collapsible.Root>
        {/if}

        <!-- Data fields -->
        <div class="grid grid-cols-2 gap-x-4 gap-y-3 px-6 py-4">
          {#each DATA_FIELDS as { key, editable } (key)}
            <div class="flex flex-col gap-1">
              <Label class="text-xs text-muted-foreground">
                {DELIVERY_FIELD_LABELS[key]}
              </Label>
              {#if editable}
                <Input
                  class="h-8 text-sm"
                  value={get_field_value(key)}
                  oninput={(e) =>
                    set_field_value(key, (e.target as HTMLInputElement).value)}
                />
              {:else}
                <div
                  class="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm"
                >
                  {get_field_value(key) || '—'}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Entity: Party -->
        <div class="flex flex-col gap-2 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Label class="text-xs font-medium">Party</Label>
              {#if mapped.party_name}
                <span class="text-[11px] text-muted-foreground">
                  file: <span class="font-medium text-foreground/70">
                    {mapped.party_name}
                  </span>
                  {#if confidence?.party}
                    <span class="text-muted-foreground/60">
                      · {format_confidence(confidence.party)}
                    </span>
                  {/if}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-0.5">
              <Button
                variant={party_mode === 'existing' ? 'secondary' : 'ghost'}
                size="sm"
                class="h-6 px-2 text-[11px]"
                onclick={() => (party_mode = 'existing')}
              >
                Existing
              </Button>
              <Button
                variant={party_mode === 'new' ? 'secondary' : 'ghost'}
                size="sm"
                class="h-6 px-2 text-[11px]"
                onclick={() => (party_mode = 'new')}
              >
                <PlusIcon class="size-3" />
                New
              </Button>
            </div>
          </div>
          {#if party_mode === 'existing'}
            <svelte:boundary>
              <SelectParty bind:selected_id={selected_party_id} />
            </svelte:boundary>
          {:else}
            <Input
              class="h-8 text-sm"
              placeholder="New party name"
              bind:value={new_party_name}
            />
          {/if}
        </div>

        <!-- Entity: Vehicle -->
        <div class="flex flex-col gap-2 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Label class="text-xs font-medium">Vehicle</Label>
              {#if mapped.vehicle_number}
                <span class="text-[11px] text-muted-foreground">
                  file: <span class="font-mono font-medium text-foreground/70">
                    {mapped.vehicle_number}
                  </span>
                  {#if confidence?.vehicle}
                    <span class="text-muted-foreground/60">
                      · {format_confidence(confidence.vehicle)}
                    </span>
                  {/if}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-0.5">
              <Button
                variant={vehicle_mode === 'existing' ? 'secondary' : 'ghost'}
                size="sm"
                class="h-6 px-2 text-[11px]"
                onclick={() => (vehicle_mode = 'existing')}
              >
                Existing
              </Button>
              <Button
                variant={vehicle_mode === 'new' ? 'secondary' : 'ghost'}
                size="sm"
                class="h-6 px-2 text-[11px]"
                onclick={() => (vehicle_mode = 'new')}
              >
                <PlusIcon class="size-3" />
                New
              </Button>
            </div>
          </div>
          {#if vehicle_mode === 'existing'}
            <svelte:boundary>
              <SelectVehicle bind:selected_id={selected_vehicle_id} />
            </svelte:boundary>
          {:else}
            <Input
              class="h-8 font-mono text-sm"
              placeholder="New vehicle number"
              bind:value={new_vehicle_number}
            />
          {/if}
        </div>

        <!-- Entity: Product -->
        <div class="flex flex-col gap-2 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Label class="text-xs font-medium">Product</Label>
              {#if mapped.product_name}
                <span class="text-[11px] text-muted-foreground">
                  file: <span class="font-medium text-foreground/70">
                    {mapped.product_name}
                  </span>
                  {#if confidence?.product}
                    <span class="text-muted-foreground/60">
                      · {format_confidence(confidence.product)}
                    </span>
                  {/if}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-0.5">
              <Button
                variant={product_mode === 'existing' ? 'secondary' : 'ghost'}
                size="sm"
                class="h-6 px-2 text-[11px]"
                onclick={() => (product_mode = 'existing')}
              >
                Existing
              </Button>
              <Button
                variant={product_mode === 'new' ? 'secondary' : 'ghost'}
                size="sm"
                class="h-6 px-2 text-[11px]"
                onclick={() => (product_mode = 'new')}
              >
                <PlusIcon class="size-3" />
                New
              </Button>
            </div>
          </div>
          {#if product_mode === 'existing'}
            <svelte:boundary>
              <SelectProduct bind:selected_id={selected_product_id} />
            </svelte:boundary>
          {:else}
            <Input
              class="h-8 text-sm"
              placeholder="New product name"
              bind:value={new_product_name}
            />
          {/if}
        </div>

        <!-- Metadata -->
        {#if mapped._metadata && Object.keys(mapped._metadata as Record<string, unknown>).length > 0}
          <div class="px-6 py-4">
            <Label class="mb-2 text-xs font-medium text-muted-foreground">
              Metadata
            </Label>
            <div class="grid grid-cols-3 gap-x-4 gap-y-1.5">
              {#each Object.entries(mapped._metadata as Record<string, unknown>) as [key, value] (key)}
                <div class="flex flex-col">
                  <span class="text-[11px] text-muted-foreground">{key}</span>
                  <span class="text-sm">{value ?? '—'}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <Sheet.Footer class="flex-row gap-2 border-t px-6 py-3">
        <Button variant="outline" class="flex-1" onclick={handle_skip}>
          <XIcon class="size-4" />
          Skip
        </Button>
        <Button class="flex-1" onclick={handle_approve}>
          <CheckIcon class="size-4" />
          Approve
        </Button>
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
