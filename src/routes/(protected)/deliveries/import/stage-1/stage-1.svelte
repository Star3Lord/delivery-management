<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import type { ColumnMapping } from '$lib/utils/import/types';
  import type { ImportState } from '../import-state.svelte';
  import FileUpload from './file-upload.svelte';
  import ColumnMapper from './column-mapper.svelte';
  import ImportDetails from './import-details.svelte';
  import SampleRows from './sample-rows.svelte';

  let {
    ctx,
    mapping = $bindable<ColumnMapping>({}),
  }: {
    ctx: ImportState;
    mapping: ColumnMapping;
  } = $props();

  let active_tab = $state('columns');

  $effect(() => {
    if (ctx.session?.suggested_mapping && Object.keys(mapping).length === 0) {
      mapping = { ...(ctx.session.suggested_mapping as ColumnMapping) };
    }
  });
</script>

{#if !ctx.session}
  <FileUpload {ctx} />
{:else}
  <div class="flex flex-col gap-4">
    <FileUpload {ctx} />

    <Tabs.Root bind:value={active_tab}>
      <Tabs.List>
        <Tabs.Trigger value="columns">Column Mapping</Tabs.Trigger>
        <Tabs.Trigger value="details">Import Details</Tabs.Trigger>
        <Tabs.Trigger value="sample">Sample Rows</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="columns">
        <ColumnMapper {ctx} bind:mapping />
      </Tabs.Content>

      <Tabs.Content value="details">
        <ImportDetails {ctx} />
      </Tabs.Content>

      <Tabs.Content value="sample">
        <SampleRows {ctx} />
      </Tabs.Content>
    </Tabs.Root>
  </div>
{/if}
