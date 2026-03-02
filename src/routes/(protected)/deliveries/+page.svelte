<script lang="ts">
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

  import Container from './table/container.svelte';
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
    <Container mode="pagination" limit={20} />
  </div>
</div>
