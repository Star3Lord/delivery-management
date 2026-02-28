<script lang="ts">
  import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import CreditCardIcon from '@lucide/svelte/icons/credit-card';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import MoonIcon from '@lucide/svelte/icons/moon';
  import SunIcon from '@lucide/svelte/icons/sun';
  import MonitorIcon from '@lucide/svelte/icons/monitor';
  import SunMoonIcon from '@lucide/svelte/icons/sun-moon';
  import CircleArrowRightIcon from '@lucide/svelte/icons/circle-arrow-right';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import { userPrefersMode } from 'mode-watcher';
  import { resolve } from '$app/paths';
  import { getUser, logout } from '$lib/api/auth.remote';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import { useSidebar } from '$lib/components/ui/sidebar/index.js';
  import { cn } from '$lib/utils';

  type SnippetChildProps = {
    props: Record<string, unknown>;
  };

  const sidebar = useSidebar();

  const userInitials = (user?: Record<string, unknown> | null) => {
    return (
      ((user?.first_name as string)?.charAt(0)?.toUpperCase() ?? '') +
      ((user?.last_name as string)?.charAt(0)?.toUpperCase() ?? '')
    );
  };
</script>

{#snippet user_info()}
  <svelte:boundary>
    {@const user = await getUser()}
    {#snippet pending()}
      <LoaderCircle class="size-4 animate-spin" />
    {/snippet}
    <Avatar.Root class="size-8 rounded-lg">
      <Avatar.Image src={user?.picture} alt={user?.name} />
      <Avatar.Fallback class="rounded-lg">
        {userInitials(user)}
      </Avatar.Fallback>
    </Avatar.Root>
    <div class="grid flex-1 text-left text-sm leading-tight">
      <span class="truncate font-medium">{user?.name}</span>
      <span class="truncate text-xs">{user?.email}</span>
    </div>
  </svelte:boundary>
{/snippet}

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props }: SnippetChildProps)}
          <Sidebar.MenuButton
            {...props}
            size="lg"
            class={cn(
              'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
              props?.class as string | undefined
            )}
          >
            {@render user_info()}
            <ChevronsUpDownIcon class="ml-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-[calc(var(--bits-dropdown-menu-anchor-width)+2rem)] min-w-56 rounded-lg"
        side={sidebar.isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            {@render user_info()}
          </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item
            class="cursor-not-allowed justify-between data-disabled:opacity-100"
            disabled
          >
            <div class="inline-flex items-center gap-2 opacity-50">
              <SparklesIcon />
              Upgrade to Pro
            </div>
            <Badge
              variant="outline"
              class="bg-muted pr-1.5 pl-1 text-[0.7rem] leading-3.5 font-normal "
            >
              <CircleArrowRightIcon class="size-3 text-muted-foreground" />
              Coming soon
            </Badge>
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item>
            <BadgeCheckIcon />
            Account
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <CreditCardIcon />
            Billing
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            {#snippet child({ props }: SnippetChildProps)}
              <a href={resolve('/settings')} {...props}>
                <SettingsIcon />
                Settings
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <SunMoonIcon class="h-4 w-4" />
              Theme
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-44 rounded-md" sideOffset={0}>
              <DropdownMenu.RadioGroup bind:value={userPrefersMode.current}>
                <DropdownMenu.RadioItem value="light" class="group/radio-item">
                  <SunIcon
                    class="h-4 w-4 transition-transform duration-300 group-hover/radio-item:rotate-90"
                  />
                  Light
                </DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="dark" class="group/radio-item">
                  <MoonIcon
                    class="h-4 w-4 transition-transform duration-300 group-hover/radio-item:rotate-90"
                  />
                  Dark
                </DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="system" class="group/radio-item">
                  <MonitorIcon
                    class="h-4 w-4 transition-transform duration-200 group-hover/radio-item:animate-spin group-hover/radio-item:repeat-1"
                  />
                  System
                </DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onclick={async () => await logout()}>
          <LogOutIcon />
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
