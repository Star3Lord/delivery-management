<script lang="ts">
  import { list_delivery_slips } from '$lib/api/delivery-slips.remote';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

  import DataContainer from './data-container.svelte';
</script>

<PageHeader>
  {#snippet titleSection()}
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Page>Dashboard</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  {/snippet}
</PageHeader>

<svelte:boundary>
  {@const result = await list_delivery_slips({
    limit: 100,
    starting_after: undefined,
  })}
  <DataContainer items={result.items} />
  {#snippet pending()}
    <div class="flex flex-col gap-2 px-6 py-4">
      <p class="text-sm text-muted-foreground">Loading deliveries...</p>
    </div>
  {/snippet}
  <!-- {#snippet failed(e)}
    <div class="flex flex-col gap-2 px-6 py-4">
      <p class="text-sm text-red-500">
        {(e as any)?.message ?? 'Failed to load deliveries'}
      </p>
    </div>
  {/snippet} -->
</svelte:boundary>
