<script lang="ts">
  import { resolve } from '$app/paths';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import ChartBarInteractive from './chart-bar-interactive.svelte';
  import ChartBarStacked from './chart-bar-stacked.svelte';

  //   let { data } = $props();
</script>

<div class="relative flex h-full min-h-0 w-full flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <div class="flex flex-1 items-center justify-between">
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Page>Dashboard</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    {/snippet}
  </PageHeader>

  <svelte:boundary>
    <div class="flex min-h-[calc(100%-var(--header-height))] w-full flex-col">
      <!-- <div class="w-full p-6">
      <ChartBarInteractive />
    </div> -->
      <div class="grid w-full grid-cols-3 gap-6 p-6">
        <ChartBarStacked />
        <!-- <ChartBarStacked />
      <ChartBarStacked /> -->
      </div>
    </div>
  </svelte:boundary>
</div>
