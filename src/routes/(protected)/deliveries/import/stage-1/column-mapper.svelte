<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import CheckCircleIcon from '@lucide/svelte/icons/circle-check';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import DatabaseIcon from '@lucide/svelte/icons/database';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import {
    DELIVERY_FIELDS,
    DELIVERY_FIELD_LABELS,
    REQUIRED_FIELDS,
    is_delivery_field,
    is_metadata_field,
    get_metadata_key,
  } from '$lib/utils/import/types';
  import type {
    DeliveryField,
    ColumnMapping,
    MappingTarget,
  } from '$lib/utils/import/types';
  import type { ImportState } from '../import-state.svelte';

  let {
    ctx,
    mapping = $bindable<ColumnMapping>({}),
  }: {
    ctx: ImportState;
    mapping: ColumnMapping;
  } = $props();

  let assigned_delivery_fields = $derived(
    new Set(
      Object.values(mapping).filter((v): v is DeliveryField =>
        is_delivery_field(v)
      )
    )
  );

  let required_met = $derived(
    REQUIRED_FIELDS.every((f) => assigned_delivery_fields.has(f))
  );

  let duplicate_fields = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const v of Object.values(mapping)) {
      if (v && is_delivery_field(v)) {
        counts[v] = (counts[v] ?? 0) + 1;
      }
    }
    return new Set(
      Object.entries(counts)
        .filter(([_, c]) => c > 1)
        .map(([k]) => k)
    );
  });

  function get_display_label(target: MappingTarget, header: string): string {
    if (target === null) return 'Skip column';
    if (is_delivery_field(target)) return DELIVERY_FIELD_LABELS[target];
    if (is_metadata_field(target))
      return `Metadata: ${get_metadata_key(target)}`;
    return header;
  }

  function update_mapping(header: string, value: string) {
    let target: MappingTarget;
    if (value === '__skip__') {
      target = null;
    } else if (value === '__metadata__') {
      target = `metadata:${header}`;
    } else {
      target = value as DeliveryField;
    }
    mapping = { ...mapping, [header]: target };
  }

  function get_select_value(target: MappingTarget, header: string): string {
    if (target === null) return '__skip__';
    if (is_metadata_field(target)) return '__metadata__';
    return target;
  }
</script>

<div class="flex flex-col gap-4 pt-4">
  <div class="flex items-center gap-2 text-sm">
    {#if required_met}
      <CheckCircleIcon class="size-4 text-green-600" />
      <span class="text-green-600">All required fields mapped</span>
    {:else}
      <CircleXIcon class="size-4 text-amber-500" />
      <span class="text-amber-500">
        Map required fields: {REQUIRED_FIELDS.filter(
          (f) => !assigned_delivery_fields.has(f)
        )
          .map((f) => DELIVERY_FIELD_LABELS[f])
          .join(', ')}
      </span>
    {/if}
  </div>

  {#if duplicate_fields.size > 0}
    <div class="flex items-center gap-2 text-sm text-amber-500">
      <CircleXIcon class="size-4" />
      <span>
        Duplicate mappings: {[...duplicate_fields]
          .map((f) => DELIVERY_FIELD_LABELS[f as DeliveryField])
          .join(', ')}
        — each delivery field should only be mapped once
      </span>
    </div>
  {/if}

  <div class="rounded-lg border">
    <div
      class="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground"
    >
      <span>File Column</span>
      <span></span>
      <span>Maps To</span>
    </div>

    {#each ctx.raw_headers as header (header)}
      {@const target = mapping[header] ?? null}
      {@const select_value = get_select_value(target, header)}
      {@const is_required =
        is_delivery_field(target) && REQUIRED_FIELDS.includes(target)}
      {@const is_metadata = is_metadata_field(target)}
      {@const is_duplicate =
        is_delivery_field(target) && duplicate_fields.has(target)}
      <div
        class="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 border-b px-4 py-2 last:border-b-0"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">{header}</span>
        </div>

        <ArrowRightIcon class="size-4 text-muted-foreground" />

        <Select.Root
          type="single"
          value={select_value}
          onValueChange={(v) => update_mapping(header, v)}
        >
          <Select.Trigger
            class="w-full {is_duplicate ? 'border-amber-500/50' : ''}"
          >
            {#if target === null}
              <span class="text-sm text-muted-foreground">Skip column</span>
            {:else if is_metadata}
              <div class="flex items-center gap-2">
                <DatabaseIcon class="size-3.5 text-muted-foreground" />
                <span class="text-sm">Metadata</span>
                <Badge variant="outline" class="text-[10px]">
                  {get_metadata_key(target)}
                </Badge>
              </div>
            {:else}
              <div class="flex items-center gap-2">
                <span class="text-sm">{get_display_label(target, header)}</span>
                {#if is_required}
                  <Badge variant="outline" class="text-[10px]">Required</Badge>
                {/if}
                {#if is_duplicate}
                  <Badge variant="destructive" class="text-[10px]">
                    Duplicate
                  </Badge>
                {/if}
              </div>
            {/if}
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.GroupHeading>Actions</Select.GroupHeading>
              <Select.Item value="__skip__">
                <span class="text-muted-foreground">Skip column</span>
              </Select.Item>
              <Select.Item value="__metadata__">
                <div class="flex items-center gap-2">
                  <DatabaseIcon class="size-3.5 text-muted-foreground" />
                  <span>Save to metadata</span>
                  <Badge variant="outline" class="text-[10px]">{header}</Badge>
                </div>
              </Select.Item>
            </Select.Group>

            <Select.Group>
              <Select.GroupHeading>Delivery Fields</Select.GroupHeading>
              {#each DELIVERY_FIELDS as field (field)}
                <Select.Item value={field}>
                  <div class="flex items-center gap-2">
                    <span>{DELIVERY_FIELD_LABELS[field]}</span>
                    {#if REQUIRED_FIELDS.includes(field)}
                      <Badge variant="outline" class="text-[10px]">
                        Required
                      </Badge>
                    {/if}
                  </div>
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
    {/each}
  </div>
</div>
