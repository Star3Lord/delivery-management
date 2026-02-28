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
  style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 16);"
>
  <AppSidebar variant="floating" collapsible="icon" />
  <Sidebar.Inset class="w-full max-w-full overflow-hidden">
    {@render children?.()}
  </Sidebar.Inset>
</Sidebar.Provider>
