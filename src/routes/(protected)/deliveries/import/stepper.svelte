<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { Button } from '$lib/components/ui/button/index.js';
  import { REQUIRED_FIELDS, is_delivery_field } from '$lib/utils/import/types';
  import type { ColumnMapping } from '$lib/utils/import/types';
  import type { ImportState } from './import-state.svelte';

  type Props = {
    ctx: ImportState;
    mapping: ColumnMapping;
  };

  let { ctx, mapping }: Props = $props();

  const steps = [
    { number: 1, label: 'Upload & Map Columns' },
    { number: 2, label: 'Review & Save' },
  ] as const;

  let can_proceed = $derived.by(() => {
    if (!ctx.session) return false;
    const delivery_values = Object.values(mapping).filter(is_delivery_field);
    return REQUIRED_FIELDS.every((f) => delivery_values.includes(f));
  });
</script>

<div class="flex items-center gap-4">
  <div class="flex flex-1 items-center gap-3">
    {#each steps as step (step.number)}
      {@const is_active = ctx.step === step.number}
      {@const is_done = ctx.step > step.number}
      <div class="flex items-center gap-2">
        <div
          class="flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors
						{is_done
            ? 'bg-primary text-primary-foreground'
            : is_active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'}"
        >
          {#if is_done}
            <CheckIcon class="size-4" />
          {:else}
            {step.number}
          {/if}
        </div>
        <span
          class="text-sm font-medium {is_active || is_done
            ? 'text-foreground'
            : 'text-muted-foreground'}"
        >
          {step.label}
        </span>
      </div>
      {#if step.number < steps.length}
        <div class="h-px flex-1 {is_done ? 'bg-primary' : 'bg-border'}"></div>
      {/if}
    {/each}
  </div>

  <div class="flex items-center gap-2">
    {#if ctx.step === 1 && ctx.session}
      <Button
        size="sm"
        disabled={ctx.loading || !can_proceed}
        onclick={() => ctx.confirm_mapping(mapping)}
      >
        {#if ctx.loading && ctx.is_processing}
          <LoaderCircleIcon class="size-4 animate-spin" />
          Processing…
        {:else}
          Next: Review Rows
        {/if}
      </Button>
    {/if}
  </div>
</div>
