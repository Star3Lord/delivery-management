<script lang="ts">
  import { page } from '$app/state';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import type { ColumnMapping } from '$lib/utils/import/types';
  import Stepper from './stepper.svelte';
  import Stage1 from './stage-1/stage-1.svelte';
  import Stage2 from './stage-2/stage-2.svelte';
  import { ImportState } from './import-state.svelte';

  const ctx = new ImportState();

  let mapping = $state<ColumnMapping>({});

  $effect(() => {
    const url_session = page.url?.searchParams.get('session');
    ctx.init(url_session);
  });
</script>

<div class="relative flex h-full min-h-0 flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/deliveries">Deliveries</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>Import</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    {/snippet}
  </PageHeader>

  <div class="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
    <Stepper {ctx} {mapping} />

    {#if ctx.error}
      <div
        class="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {ctx.error}
      </div>
    {/if}

    {#if ctx.step === 1}
      <Stage1 {ctx} bind:mapping />
    {:else}
      <Stage2 {ctx} />
    {/if}
  </div>
</div>
