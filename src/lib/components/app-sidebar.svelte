<script lang="ts" module>
  import Banknote from '@lucide/svelte/icons/banknote';
  import ChartPie from '@lucide/svelte/icons/chart-pie';
  import Home from '@lucide/svelte/icons/home';
  import Truck from '@lucide/svelte/icons/truck';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';

  // This is sample data.
  const data = {
    user: {
      name: 'John Doe',
      email: 'im@example.com',
      image: `https://picsum.photos/seed/${Math.random()}/200/200`,
    },
    nav: [
      {
        title: 'Dashboard',
        icon: Home,
        url: resolve('/dashboard'),
      },
      {
        title: 'Deliveries',
        icon: Truck,
        url: resolve('/deliveries'),
      },
      {
        title: 'Ledger',
        icon: Banknote,
        url: resolve('/ledger'),
      },
      {
        title: 'Reports',
        icon: ChartPie,
        url: resolve('/reports'),
      },
    ],
  };

  const navMainWithActive = $derived(
    data.nav.map((item) => ({
      ...item,
      isActive:
        page.url.pathname === item.url ||
        page.url.pathname.startsWith(item.url + '/'),
    }))
  );
</script>

<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import NavMain from './nav-main.svelte';
  import NavProjects from './nav-projects.svelte';
  import NavUser from './nav-user.svelte';
  import TeamSwitcher from './team-switcher.svelte';

  let {
    ref = $bindable(null),
    collapsible = 'icon',
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root {collapsible} {...restProps}>
  <Sidebar.Header>
    <!-- <TeamSwitcher teams={data.teams} /> -->
  </Sidebar.Header>
  <Sidebar.Content>
    <NavMain items={data.nav} />
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser />
  </Sidebar.Footer>
  <Sidebar.Rail class="hover:after:bg-transparent" />
</Sidebar.Root>
