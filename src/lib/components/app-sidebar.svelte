<script lang="ts" module>
  import BanknoteIcon from '@lucide/svelte/icons/banknote';
  import ChartPieIcon from '@lucide/svelte/icons/chart-pie';
  import HandshakeIcon from '@lucide/svelte/icons/handshake';
  import HomeIcon from '@lucide/svelte/icons/home';
  import PackageIcon from '@lucide/svelte/icons/package';
  import TruckIcon from '@lucide/svelte/icons/truck';
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
        icon: HomeIcon,
        url: resolve('/dashboard'),
      },
      {
        title: 'Deliveries',
        icon: TruckIcon,
        url: resolve('/deliveries'),
      },
      {
        title: 'Products',
        icon: PackageIcon,
        url: resolve('/products'),
      },
      {
        title: 'Vehicles',
        icon: TruckIcon,
        url: resolve('/vehicles'),
      },
      {
        title: 'Parties',
        icon: HandshakeIcon,
        url: resolve('/parties'),
      },
      {
        title: 'Ledger',
        icon: BanknoteIcon,
        url: resolve('/ledger'),
      },
      {
        title: 'Reports',
        icon: ChartPieIcon,
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
