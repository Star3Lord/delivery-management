<script lang="ts">
  import * as HoverCard from '$lib/components/ui/hover-card';
  import { get_customer } from '$lib/api/customers.remote';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Phone from '@lucide/svelte/icons/phone';
  import Mail from '@lucide/svelte/icons/mail';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import { resolve } from '$app/paths';

  type Customer = Awaited<ReturnType<typeof get_customer>>;

  const PALETTES = [
    {
      bg: 'bg-blue-500/12',
      text: 'text-blue-400',
      border: 'border-blue-500/10',
      accent: 'bg-blue-500/8',
    },
    {
      bg: 'bg-violet-500/12',
      text: 'text-violet-400',
      border: 'border-violet-500/10',
      accent: 'bg-violet-500/8',
    },
    {
      bg: 'bg-emerald-500/12',
      text: 'text-emerald-400',
      border: 'border-emerald-500/10',
      accent: 'bg-emerald-500/8',
    },
    {
      bg: 'bg-amber-500/12',
      text: 'text-amber-400',
      border: 'border-amber-500/10',
      accent: 'bg-amber-500/8',
    },
    {
      bg: 'bg-rose-500/12',
      text: 'text-rose-400',
      border: 'border-rose-500/10',
      accent: 'bg-rose-500/8',
    },
    {
      bg: 'bg-cyan-500/12',
      text: 'text-cyan-400',
      border: 'border-cyan-500/10',
      accent: 'bg-cyan-500/8',
    },
    {
      bg: 'bg-fuchsia-500/12',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-500/10',
      accent: 'bg-fuchsia-500/8',
    },
    {
      bg: 'bg-teal-500/12',
      text: 'text-teal-400',
      border: 'border-teal-500/10',
      accent: 'bg-teal-500/8',
    },
  ] as const;

  type Palette = (typeof PALETTES)[number];

  function hashName(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % PALETTES.length;
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  let {
    value,
  }: {
    value?: Partial<Omit<Omit<Customer, 'id'>, 'name'>> & {
      id: string;
      name: string;
    };
  } = $props();

  const initials = $derived(value ? getInitials(value.name) : '');
  const palette = $derived(PALETTES[hashName(value?.name ?? '')]);
  let open = $state(false);
</script>

{#snippet detail_row(Icon: typeof Phone, text: string, multiline?: boolean)}
  <div
    class="flex {multiline ? 'items-start' : 'items-center'} gap-2.5 text-xs"
  >
    <Icon
      class="{multiline
        ? 'mt-px'
        : ''} size-3.5 shrink-0 text-muted-foreground/50"
    />
    <span class="{multiline ? 'line-clamp-2' : 'truncate'} text-foreground/70">
      {text}
    </span>
  </div>
{/snippet}

{#snippet contact_details(customer?: Customer)}
  {#if customer && (customer.phone || customer.email || customer.address)}
    <div class="space-y-2 px-4 py-3">
      {#if customer.phone}
        {@render detail_row(Phone, customer.phone)}
      {/if}
      {#if customer.email}
        {@render detail_row(Mail, customer.email)}
      {/if}
      {#if customer.address}
        {@render detail_row(MapPin, customer.address, true)}
      {/if}
    </div>
  {:else}
    <div class="px-4 py-3">
      <p class="text-xs text-muted-foreground/50">
        No contact details available
      </p>
    </div>
  {/if}
{/snippet}

{#if value}
  <HoverCard.Root bind:open openDelay={300} closeDelay={100}>
    <HoverCard.Trigger
      href={resolve(`/customers/${value.id}`)}
      class="group relative inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 no-underline transition-colors duration-150 hover:bg-muted"
    >
      <span
        class="{palette.bg} {palette.text} inline-flex size-[1.15rem] shrink-0 items-center justify-center rounded-[5px] text-[9px] font-semibold"
      >
        {initials}
      </span>
      <span
        class="block min-w-0 truncate text-sm text-foreground/75 transition-colors duration-150 group-hover:text-foreground/95"
      >
        {value.name}
      </span>
      <span
        class="absolute top-1/2 right-0.5 inline-flex size-4.5 -translate-y-1/2 items-center justify-center rounded-[inherit] opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100"
      >
        <ArrowUpRight
          class="size-3 -translate-x-0.5 translate-y-0.5 scale-75 text-foreground transition-all delay-100 duration-200 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:scale-100"
        />
      </span>
    </HoverCard.Trigger>

    <HoverCard.Content
      class="w-fit max-w-md min-w-52 overflow-hidden p-0"
      side="bottom"
      align="start"
      sideOffset={8}
    >
      <div class="{palette.accent} px-4 pt-4 pb-3">
        <div class="flex items-center gap-3">
          <span
            class="{palette.bg} {palette.text} inline-flex size-9 shrink-0 items-center justify-center rounded-lg border {palette.border} text-sm font-semibold"
          >
            {initials}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground/90">
              {value.name}
            </p>
            <p class="text-[11px] text-muted-foreground/70">Customer</p>
          </div>
        </div>
      </div>

      {#if open}
        <svelte:boundary>
          {@render contact_details(await get_customer({ id: value.id }))}

          {#snippet pending()}
            <div class="flex items-center justify-center gap-2 px-4 py-4">
              <LoaderCircle
                class="size-3.5 animate-spin text-muted-foreground/50"
              />
              <span class="text-xs text-muted-foreground/50">
                Loading details...
              </span>
            </div>
          {/snippet}
          {#snippet failed(error, reset)}
            <button
              onclick={reset}
              class="flex w-full items-center justify-center gap-1.5 px-4 py-3 transition-colors hover:bg-muted/30"
            >
              <p class="text-xs text-rose-400/70">Failed to load details</p>
              <span class="text-[10px] text-muted-foreground/40">
                — click to retry
              </span>
            </button>
          {/snippet}
        </svelte:boundary>
      {/if}
    </HoverCard.Content>
  </HoverCard.Root>
{:else}
  <span class="text-sm text-muted-foreground">—</span>
{/if}
