<script lang="ts">
  import ClockIcon from '@lucide/svelte/icons/clock';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CheckCheckIcon from '@lucide/svelte/icons/check-check';
  import SaveIcon from '@lucide/svelte/icons/save';
  import SkipForwardIcon from '@lucide/svelte/icons/skip-forward';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import type { ImportState } from '../import-state.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  let stats = $derived(ctx.stats);
</script>

<div class="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-amber-500/10 p-2">
      <ClockIcon class="size-5 text-amber-500" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.pending_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Pending</p>
    </div>
  </div>

  <div
    class="flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4"
  >
    <div class="rounded-md bg-green-500/10 p-2">
      <CheckCheckIcon class="size-5 text-green-600" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.approved_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Approved (unsaved)</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-primary/10 p-2">
      <SaveIcon class="size-5 text-primary" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.saved_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Saved</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-muted p-2">
      <SkipForwardIcon class="size-5 text-muted-foreground" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.skipped_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Skipped</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-green-500/10 p-2">
      <CircleCheckIcon class="size-5 text-green-600" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.valid_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Valid Total</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-blue-500/10 p-2">
      <CopyIcon class="size-5 text-blue-500" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.duplicate_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Duplicates</p>
    </div>
  </div>
</div>

{#if ctx.is_completed}
  <div
    class="mt-4 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700"
  >
    Import complete. All rows have been processed.
  </div>
{/if}
