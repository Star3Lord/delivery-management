<script lang="ts">
  import { ModeWatcher } from 'mode-watcher';
  import AppSidebar from '$lib/components/app-sidebar.svelte';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import { Toaster } from '$lib/components/ui/sonner/index.js';

  let { children } = $props();
</script>

<ModeWatcher />
<Toaster />

<Sidebar.Provider
  class="h-svh overflow-hidden"
  style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 16);"
>
  <AppSidebar variant="floating" collapsible="icon" />
  <Sidebar.Inset
    class="flex min-h-0 w-full max-w-full flex-col overflow-x-hidden overflow-y-auto"
  >
    {@render children?.()}
  </Sidebar.Inset>
</Sidebar.Provider>
