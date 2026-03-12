<script lang="ts">
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import CheckCircleIcon from '@lucide/svelte/icons/circle-check';
  import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
  import SkipForwardIcon from '@lucide/svelte/icons/skip-forward';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import type { ImportState } from '../import-state.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  let stats = $derived(ctx.stats);
</script>

<div class="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-primary/10 p-2">
      <FileTextIcon class="size-5 text-primary" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.total_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Total Rows</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-green-500/10 p-2">
      <CheckCircleIcon class="size-5 text-green-600" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.valid_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Valid Rows</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-amber-500/10 p-2">
      <AlertTriangleIcon class="size-5 text-amber-500" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.issue_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Rows with Issues</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-muted p-2">
      <SkipForwardIcon class="size-5 text-muted-foreground" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.skipped_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Skipped Rows</p>
    </div>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <div class="rounded-md bg-blue-500/10 p-2">
      <CopyIcon class="size-5 text-blue-500" />
    </div>
    <div>
      <p class="text-2xl font-semibold">{stats?.duplicate_rows ?? 0}</p>
      <p class="text-sm text-muted-foreground">Duplicate Rows</p>
    </div>
  </div>
</div>
