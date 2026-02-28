<script lang="ts">
  import { list_delivery_slips } from '$lib/api/delivery-slips.remote';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

  import DataContainer from './data-container.svelte';
</script>

<div class="relative flex h-full min-h-0 flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Page>Deliveries</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    {/snippet}
  </PageHeader>

  <div class="flex min-h-0 flex-1 flex-col">
    <svelte:boundary>
      {@const result = await list_delivery_slips({
        limit: 50,
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
  </div>
</div>
