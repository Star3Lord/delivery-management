<script lang="ts">
  import { Separator } from '$lib/components/ui/separator/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import type { Snippet } from 'svelte';

  let {
    titleSection,
    backSection,
  }: {
    titleSection?: Snippet;
    backSection?: Snippet;
  } = $props();
</script>

<header
  class="flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
  <div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
    <Sidebar.Trigger class="-ml-1" />
    <Separator
      orientation="vertical"
      class="mr-2 data-[orientation=vertical]:h-4"
    />
    {#if titleSection}
      {@render titleSection()}
    {/if}
    {#if backSection}
      {@render backSection()}
    {/if}
  </div>
</header>
