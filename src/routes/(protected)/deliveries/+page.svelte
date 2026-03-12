<script lang="ts">
  import ImportIcon from '@lucide/svelte/icons/file-up';
  import { resolve } from '$app/paths';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import Chart from './chart.svelte';
  import Container from './table/container.svelte';
</script>

<div class="relative flex h-full min-h-0 flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <div class="flex flex-1 items-center justify-between">
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Page>Deliveries</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>

        <Button
          variant="outline"
          size="sm"
          href={resolve('/deliveries/import')}
        >
          <ImportIcon class="size-4" />
          Import
        </Button>
      </div>
    {/snippet}
  </PageHeader>

  <div class="w-full p-6">
    <!-- <Chart /> -->
  </div>

  <div class="flex min-h-[calc(100%-var(--header-height))] flex-col">
    <Container />
  </div>
</div>
