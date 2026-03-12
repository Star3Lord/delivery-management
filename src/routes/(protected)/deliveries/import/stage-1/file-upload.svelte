<script lang="ts">
  import UploadIcon from '@lucide/svelte/icons/upload';
  import FilePlusIcon from '@lucide/svelte/icons/file-plus';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { Button } from '$lib/components/ui/button/index.js';
  import type { ImportState } from '../import-state.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  let file_input: HTMLInputElement | undefined = $state();

  function handle_file_change(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      ctx.upload_file(file);
    }
  }

  function trigger_file_select() {
    file_input?.click();
  }

  async function handle_new_file() {
    await ctx.reset();
  }
</script>

<input
  bind:this={file_input}
  type="file"
  accept=".xlsx,.xls,.csv"
  class="hidden"
  onchange={handle_file_change}
/>

{#if ctx.session}
  <div
    class="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
  >
    <div class="flex items-center gap-2 text-sm">
      <span class="text-muted-foreground">File:</span>
      <span class="font-medium">{ctx.session.file_name}</span>
    </div>
    <Button
      variant="outline"
      size="sm"
      onclick={handle_new_file}
      disabled={ctx.loading}
    >
      <FilePlusIcon class="size-4" />
      New File
    </Button>
  </div>
{:else}
  <button
    type="button"
    class="flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
    onclick={trigger_file_select}
    disabled={ctx.loading}
  >
    {#if ctx.loading}
      <LoaderCircleIcon class="size-8 animate-spin text-muted-foreground" />
      <span class="text-sm text-muted-foreground">Parsing file…</span>
    {:else}
      <UploadIcon class="size-8 text-muted-foreground" />
      <div class="text-center">
        <p class="text-sm font-medium">Click to upload Excel or CSV file</p>
        <p class="text-xs text-muted-foreground">.xlsx, .xls, .csv supported</p>
      </div>
    {/if}
  </button>
{/if}
