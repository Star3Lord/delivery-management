<script lang="ts">
  import * as HoverCard from '$lib/components/ui/hover-card';
  import { get_customer } from '$lib/api/customers.remote';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Phone from '@lucide/svelte/icons/phone';
  import Mail from '@lucide/svelte/icons/mail';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';

  type Palette = (typeof AVATAR_PALETTES)[number];
  type Customer = Awaited<ReturnType<typeof get_customer>>;

  const AVATAR_PALETTES = [
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

  function hashName(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % AVATAR_PALETTES.length;
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
  const palette = $derived(AVATAR_PALETTES[hashName(value?.name ?? '')]);

  let open = $state(false);
</script>

{#snippet avatar_sm(p: Palette, letters: string)}
  <span
    class="{p.bg} {p.text} inline-flex size-[1.15rem] shrink-0 items-center justify-center rounded-[5px] text-[9px] font-semibold"
  >
    {letters}
  </span>
{/snippet}

{#snippet avatar_lg(p: Palette, letters: string)}
  <span
    class="{p.bg} {p.text} inline-flex size-9 shrink-0 items-center justify-center rounded-lg border {p.border} text-sm font-semibold"
  >
    {letters}
  </span>
{/snippet}

{#snippet contact_details(customer?: Customer)}
  {#snippet detail_row(Icon: typeof Phone, text: string, multiline?: boolean)}
    <div
      class="flex {multiline ? 'items-start' : 'items-center'} gap-2.5 text-xs"
    >
      <Icon
        class="{multiline
          ? 'mt-px'
          : ''} size-3.5 shrink-0 text-muted-foreground/50"
      />
      <span
        class="{multiline ? 'line-clamp-2' : 'truncate'} text-foreground/70"
      >
        {text}
      </span>
    </div>
  {/snippet}

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
    {@render empty_state('No contact details available')}
  {/if}
{/snippet}

<!-- Empty state -->
{#snippet empty_state(message: string)}
  <div class="px-4 py-3">
    <p class="text-xs text-muted-foreground/50">{message}</p>
  </div>
{/snippet}

{#snippet card_header(p: Palette, letters: string, name: string)}
  <div class="{p.accent} px-4 pt-4 pb-3">
    <div class="flex items-center gap-3">
      {@render avatar_lg(p, letters)}
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-foreground/90">{name}</p>
        <p class="text-[11px] text-muted-foreground/70">Customer</p>
      </div>
    </div>
  </div>
{/snippet}

<!-- Main render -->
{#if value}
  <HoverCard.Root bind:open openDelay={300} closeDelay={100}>
    <HoverCard.Trigger class="flex w-full min-w-0">
      <div
        class="group flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors duration-150 hover:bg-muted/50"
      >
        {@render avatar_sm(palette, initials)}
        <span
          class="block min-w-0 flex-1 truncate text-sm text-foreground/75 transition-colors duration-150 group-hover:text-foreground/95"
        >
          {value.name}
        </span>
      </div>
    </HoverCard.Trigger>

    <HoverCard.Content
      class="w-72 overflow-hidden p-0"
      side="bottom"
      align="start"
      sideOffset={8}
    >
      {@render card_header(palette, initials, value.name)}

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
