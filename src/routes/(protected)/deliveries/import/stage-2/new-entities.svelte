<script lang="ts">
  import LinkIcon from '@lucide/svelte/icons/link';
  import MergeIcon from '@lucide/svelte/icons/git-merge';
  import PlusCircleIcon from '@lucide/svelte/icons/plus-circle';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import UsersIcon from '@lucide/svelte/icons/users';
  import TruckIcon from '@lucide/svelte/icons/truck';
  import PackageIcon from '@lucide/svelte/icons/package';
  import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
  import XIcon from '@lucide/svelte/icons/x';
  import CheckIcon from '@lucide/svelte/icons/check';
  import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import SelectParty from '$lib/components/data/select-party.svelte';
  import SelectVehicle from '$lib/components/data/select-vehicle.svelte';
  import SelectProduct from '$lib/components/data/select-product.svelte';
  import {
    list_new_entities,
    resolve_new_entity,
    merge_new_entities,
  } from '$lib/api/import.remote';
  import { SvelteSet } from 'svelte/reactivity';
  import { untrack } from 'svelte';
  import type { ImportState } from '../import-state.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  type SuggestedLink = { id: string; label: string; score: number };

  type EntityWithSuggestion = {
    name?: string;
    number_plate?: string;
    row_count: number;
    similar_to?: string[];
    suggested_link?: SuggestedLink;
  };

  type NewEntities = {
    parties: EntityWithSuggestion[];
    vehicles: EntityWithSuggestion[];
    products: EntityWithSuggestion[];
  };

  let entities = $state<NewEntities | null>(null);
  let loading = $state(false);
  let entity_tab = $state('party');

  // Link dialog state
  let link_open = $state(false);
  let linking = $state<{
    type: 'party' | 'vehicle' | 'product';
    value: string;
    suggested?: SuggestedLink;
  } | null>(null);
  let link_id = $state<string | undefined>();

  // Merge state
  let merge_selected = $state<Record<string, SvelteSet<string>>>({
    party: new SvelteSet(),
    vehicle: new SvelteSet(),
    product: new SvelteSet(),
  });
  let merge_target_name = $state<Record<string, string>>({
    party: '',
    vehicle: '',
    product: '',
  });
  let merge_open = $state(false);

  // Edit sheet state
  let editing = $state<{
    type: 'party' | 'vehicle' | 'product';
    value: string;
    name: string;
    extra: Record<string, string>;
  } | null>(null);
  let edit_open = $state(false);

  async function load() {
    if (!ctx.session_id) return;
    loading = true;
    try {
      entities = (await list_new_entities({
        session_id: ctx.session_id,
      })) as NewEntities;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void ctx.version;
    const should_load = ctx.session_id && ctx.step === 2;
    if (should_load) untrack(() => load());
  });

  let party_count = $derived(entities?.parties.length ?? 0);
  let vehicle_count = $derived(entities?.vehicles.length ?? 0);
  let product_count = $derived(entities?.products.length ?? 0);
  let total_new = $derived(party_count + vehicle_count + product_count);

  let active_items = $derived.by(() => {
    if (!entities) return [];
    if (entity_tab === 'party') return entities.parties;
    if (entity_tab === 'vehicle') return entities.vehicles;
    return entities.products;
  });

  let active_type = $derived(entity_tab as 'party' | 'vehicle' | 'product');

  function get_value(item: EntityWithSuggestion): string {
    return item.name ?? item.number_plate ?? '';
  }

  // ── Link ─────────────────────────────────────────────────

  function start_link(
    type: 'party' | 'vehicle' | 'product',
    value: string,
    suggested?: SuggestedLink
  ) {
    linking = { type, value, suggested };
    link_id = suggested?.id;
    link_open = true;
  }

  async function confirm_link() {
    if (!linking || !link_id || !ctx.session_id) return;
    loading = true;
    try {
      await resolve_new_entity({
        session_id: ctx.session_id,
        entity_type: linking.type,
        new_value: linking.value,
        existing_id: link_id,
      });
      link_open = false;
      linking = null;
      link_id = undefined;
      await load();
      ctx.version++;
    } finally {
      loading = false;
    }
  }

  // ── Merge ────────────────────────────────────────────────

  function toggle_merge(type: string, value: string) {
    const next = new SvelteSet(merge_selected[type]);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    merge_selected = { ...merge_selected, [type]: next };
    if (next.size > 0 && !merge_target_name[type]) {
      merge_target_name = {
        ...merge_target_name,
        [type]: [...next].sort((a, b) => b.length - a.length)[0],
      };
    }
  }

  function select_suggestion_group(
    type: string,
    value: string,
    similar: string[]
  ) {
    const next = new SvelteSet<string>([value, ...similar]);
    merge_selected = { ...merge_selected, [type]: next };
    merge_target_name = {
      ...merge_target_name,
      [type]: [...next].sort((a, b) => b.length - a.length)[0],
    };
    merge_open = true;
  }

  function clear_merge(type: string) {
    merge_selected = { ...merge_selected, [type]: new SvelteSet() };
    merge_target_name = { ...merge_target_name, [type]: '' };
    merge_open = false;
  }

  let sel_count = $derived(merge_selected[active_type]?.size ?? 0);

  function open_merge_dialog() {
    const type = active_type;
    const selected = merge_selected[type];
    if (!selected || selected.size < 2) return;
    if (!merge_target_name[type]) {
      merge_target_name = {
        ...merge_target_name,
        [type]: [...selected].sort((a, b) => b.length - a.length)[0],
      };
    }
    merge_open = true;
  }

  async function confirm_merge() {
    const type = active_type;
    const selected = merge_selected[type];
    const target = merge_target_name[type];
    if (!selected || selected.size < 2 || !target || !ctx.session_id) return;
    loading = true;
    try {
      await merge_new_entities({
        session_id: ctx.session_id,
        entity_type: type,
        source_values: [...selected],
        target_name: target,
      });
      clear_merge(type);
      await load();
      ctx.version++;
    } finally {
      loading = false;
    }
  }

  // ── Edit ─────────────────────────────────────────────────

  function start_edit(type: 'party' | 'vehicle' | 'product', value: string) {
    editing = { type, value, name: value, extra: {} };
    edit_open = true;
  }

  async function save_edit() {
    if (!editing || !ctx.session_id) return;
    if (editing.name !== editing.value) {
      loading = true;
      try {
        await merge_new_entities({
          session_id: ctx.session_id,
          entity_type: editing.type,
          source_values: [editing.value],
          target_name: editing.name,
        });
        await load();
        ctx.version++;
      } finally {
        loading = false;
      }
    }
    edit_open = false;
    editing = null;
  }
</script>

<!-- Link dialog -->
<Dialog.Root bind:open={link_open}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Link to existing {linking?.type ?? ''}</Dialog.Title>
      <Dialog.Description>
        {#if linking}
          Map <span class="font-medium">{linking.value}</span>
          to an existing record. All rows using this name will be updated.
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if linking}
      <div class="flex flex-col gap-4 py-2">
        {#if linking.suggested}
          <div
            class="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2.5"
          >
            <ArrowRightIcon class="size-4 text-green-600" />
            <div class="flex-1 text-sm">
              <span class="text-muted-foreground">Suggested:</span>
              <span class="ml-1 font-medium">{linking.suggested.label}</span>
              <Badge variant="outline" class="ml-2 text-[10px]">
                {Math.round(linking.suggested.score * 100)}% match
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              class="h-7 border-green-500/30 text-xs text-green-600"
              onclick={() => {
                link_id = linking?.suggested?.id;
              }}
            >
              Use
            </Button>
          </div>
        {/if}

        <div class="flex flex-col gap-1.5">
          <Label class="text-xs text-muted-foreground">
            Select {linking.type}
          </Label>
          {#if linking.type === 'party'}
            <svelte:boundary>
              <SelectParty bind:selected_id={link_id} />
            </svelte:boundary>
          {:else if linking.type === 'vehicle'}
            <svelte:boundary>
              <SelectVehicle bind:selected_id={link_id} />
            </svelte:boundary>
          {:else}
            <svelte:boundary>
              <SelectProduct bind:selected_id={link_id} />
            </svelte:boundary>
          {/if}
        </div>
      </div>

      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            link_open = false;
          }}
        >
          Cancel
        </Button>
        <Button disabled={!link_id || loading} onclick={confirm_link}>
          <LinkIcon class="size-4" />
          Link
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- Edit sheet -->
<Sheet.Root bind:open={edit_open}>
  <Sheet.Content class="gap-0 overflow-y-auto sm:max-w-md">
    <Sheet.Header class="border-b px-6 py-4">
      <Sheet.Title>
        {#if editing}
          Edit {editing.type === 'party'
            ? 'Party'
            : editing.type === 'vehicle'
              ? 'Vehicle'
              : 'Product'}
        {/if}
      </Sheet.Title>
      <Sheet.Description class="sr-only">
        Edit entity details.
      </Sheet.Description>
    </Sheet.Header>
    {#if editing}
      <div class="flex flex-col gap-3 px-6 py-4">
        <p class="text-xs text-muted-foreground">
          Original: <span class="font-medium text-foreground">
            {editing.value}
          </span>
        </p>
        <div class="flex flex-col gap-1">
          <Label class="text-xs text-muted-foreground">
            {editing.type === 'vehicle' ? 'Number Plate' : 'Name'}
          </Label>
          <Input class="h-8 text-sm" bind:value={editing.name} />
        </div>
        {#if editing.type === 'party'}
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">Address</Label>
            <Input
              class="h-8 text-sm"
              placeholder="Optional"
              bind:value={
                () => editing?.extra.address ?? '',
                (v) => {
                  if (editing) editing.extra = { ...editing.extra, address: v };
                }
              }
            />
          </div>
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">Phone</Label>
            <Input
              class="h-8 text-sm"
              placeholder="Optional"
              bind:value={
                () => editing?.extra.phone ?? '',
                (v) => {
                  if (editing) editing.extra = { ...editing.extra, phone: v };
                }
              }
            />
          </div>
        {:else if editing.type === 'vehicle'}
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">Vehicle Type</Label>
            <Input
              class="h-8 text-sm"
              placeholder="e.g. Truck, Trailer"
              bind:value={
                () => editing?.extra.vehicle_type ?? '',
                (v) => {
                  if (editing)
                    editing.extra = { ...editing.extra, vehicle_type: v };
                }
              }
            />
          </div>
        {/if}
      </div>
      <Sheet.Footer class="flex-row gap-2 border-t px-6 py-3">
        <Button
          variant="outline"
          class="flex-1"
          onclick={() => {
            edit_open = false;
            editing = null;
          }}
        >
          Cancel
        </Button>
        <Button class="flex-1" onclick={save_edit}>
          <CheckIcon class="size-4" />
          Save
        </Button>
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>

<!-- Merge dialog -->
<Dialog.Root bind:open={merge_open}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        Merge {sel_count}
        {active_type === 'party'
          ? 'Parties'
          : active_type === 'vehicle'
            ? 'Vehicles'
            : 'Products'}
      </Dialog.Title>
      <Dialog.Description>
        These entries will be combined into a single {active_type}. All rows
        referencing them will be updated.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4 py-2">
      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">
          Entries being merged
        </Label>
        <div class="flex flex-wrap gap-1.5">
          {#each [...(merge_selected[active_type] ?? [])] as value (value)}
            <Badge variant="secondary" class="text-xs">
              {value}
            </Badge>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">
          Merged {active_type === 'vehicle' ? 'number plate' : 'name'}
        </Label>
        <Input
          class="h-9 text-sm"
          placeholder="Enter the final name for the merged entity"
          bind:value={
            () => merge_target_name[active_type] ?? '',
            (v) => {
              merge_target_name = { ...merge_target_name, [active_type]: v };
            }
          }
        />
        <p class="text-[11px] text-muted-foreground">
          All {sel_count} entries will resolve to this value.
        </p>
      </div>
    </div>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          merge_open = false;
        }}
      >
        Cancel
      </Button>
      <Button
        disabled={!merge_target_name[active_type] || loading}
        onclick={confirm_merge}
      >
        <MergeIcon class="size-4" />
        Confirm Merge
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<div class="flex flex-col gap-4 pt-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <p class="text-sm text-muted-foreground">
      {#if total_new === 0}
        All rows reference existing records.
      {:else}
        <span class="font-medium text-foreground">{total_new}</span>
        new
        {total_new === 1 ? 'entity' : 'entities'} to create.
      {/if}
    </p>
    <Button
      variant="ghost"
      size="sm"
      class="h-7"
      onclick={load}
      disabled={loading}
    >
      <RefreshCcwIcon class="size-3.5" />
    </Button>
  </div>

  {#if total_new === 0}
    <div class="py-8 text-center text-sm text-muted-foreground">
      <PlusCircleIcon class="mx-auto mb-2 size-8 text-muted-foreground/50" />
      All entities are linked to existing records.
    </div>
  {:else}
    <!-- Entity type tabs -->
    <Tabs.Root bind:value={entity_tab}>
      <Tabs.List>
        <Tabs.Trigger value="party" disabled={party_count === 0}>
          <UsersIcon class="mr-1.5 size-3.5" />
          Parties
          {#if party_count > 0}
            <Badge variant="secondary" class="ml-1.5 text-[10px]">
              {party_count}
            </Badge>
          {/if}
        </Tabs.Trigger>
        <Tabs.Trigger value="vehicle" disabled={vehicle_count === 0}>
          <TruckIcon class="mr-1.5 size-3.5" />
          Vehicles
          {#if vehicle_count > 0}
            <Badge variant="secondary" class="ml-1.5 text-[10px]">
              {vehicle_count}
            </Badge>
          {/if}
        </Tabs.Trigger>
        <Tabs.Trigger value="product" disabled={product_count === 0}>
          <PackageIcon class="mr-1.5 size-3.5" />
          Products
          {#if product_count > 0}
            <Badge variant="secondary" class="ml-1.5 text-[10px]">
              {product_count}
            </Badge>
          {/if}
        </Tabs.Trigger>
      </Tabs.List>

      {#each ['party', 'vehicle', 'product'] as tab_type (tab_type)}
        <Tabs.Content value={tab_type}>
          {@const items =
            tab_type === 'party'
              ? (entities?.parties ?? [])
              : tab_type === 'vehicle'
                ? (entities?.vehicles ?? [])
                : (entities?.products ?? [])}
          {@const type = tab_type as 'party' | 'vehicle' | 'product'}
          {@const selected = merge_selected[type]}
          {@const count = selected?.size ?? 0}

          <div class={{ 'mt-3 flex items-center justify-between gap-2': true }}>
            <span class="text-xs text-muted-foreground">
              <span class="font-medium text-foreground">{count}</span>
              selected for merge
            </span>
            <div class="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="default"
                class="h-7 text-xs"
                onclick={open_merge_dialog}
                disabled={count < 2}
              >
                <MergeIcon class="size-3.5" />
                Merge {count}
                {type === 'party'
                  ? 'Parties'
                  : type === 'vehicle'
                    ? 'Vehicles'
                    : 'Products'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="h-7 px-1.5 text-xs text-muted-foreground"
                onclick={() => clear_merge(type)}
                disabled={count < 2}
              >
                Clear
              </Button>
            </div>
          </div>

          <!-- Table -->
          <div class="mt-3 overflow-x-auto rounded-lg border">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="w-10"></Table.Head>
                  <Table.Head>
                    {type === 'vehicle' ? 'Number Plate' : 'Name'}
                  </Table.Head>
                  <Table.Head class="w-20 text-center">Rows</Table.Head>
                  <Table.Head class="w-16"></Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each items as item (get_value(item))}
                  {@const value = get_value(item)}
                  {@const has_similar =
                    !!item.similar_to && item.similar_to.length > 0}
                  {@const has_link_suggestion = !!item.suggested_link}
                  {@const is_checked = selected?.has(value) ?? false}
                  <Table.Row>
                    <Table.Cell class="text-center">
                      <Checkbox
                        checked={is_checked}
                        onCheckedChange={() => toggle_merge(type, value)}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <div class="flex flex-col gap-1">
                        <span
                          class="text-sm font-medium {type === 'vehicle'
                            ? 'font-mono'
                            : ''}"
                        >
                          {value}
                        </span>
                        <div class="flex flex-wrap gap-1">
                          {#if has_link_suggestion}
                            <button
                              class="inline-flex w-fit items-center gap-1 rounded-md border border-green-500/30 bg-green-500/5 px-2 py-0.5 text-[11px] text-green-600 transition-colors hover:bg-green-500/10"
                              onclick={() =>
                                start_link(type, value, item.suggested_link)}
                            >
                              <LinkIcon class="size-3" />
                              Link to: {item.suggested_link?.label}
                              <span class="text-green-600/60">
                                {Math.round(
                                  (item.suggested_link?.score ?? 0) * 100
                                )}%
                              </span>
                            </button>
                          {/if}
                          {#if has_similar}
                            <button
                              class="inline-flex w-fit items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-[11px] text-amber-600 transition-colors hover:bg-amber-500/10"
                              onclick={() =>
                                select_suggestion_group(
                                  type,
                                  value,
                                  item.similar_to ?? []
                                )}
                            >
                              <MergeIcon class="size-3" />
                              Merge with: {item.similar_to?.join(', ')}
                            </button>
                          {/if}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell
                      class="text-center text-sm text-muted-foreground"
                    >
                      {item.row_count}
                    </Table.Cell>
                    <Table.Cell>
                      <div class="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          class="size-7"
                          onclick={() => start_edit(type, value)}
                          title="Edit"
                        >
                          <PencilIcon class="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="size-7"
                          onclick={() =>
                            start_link(type, value, item.suggested_link)}
                          title="Link to existing"
                        >
                          <LinkIcon class="size-3.5" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  {/if}
</div>
