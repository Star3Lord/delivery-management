<script lang="ts">
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Search from '@lucide/svelte/icons/search';
  import Check from '@lucide/svelte/icons/check';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Calendar } from '$lib/components/ui/calendar/index.js';
  import { cn } from '$lib/utils';
  import { parseDate, type DateValue } from '@internationalized/date';
  import type { FilterDataType, RelationLoaderMap } from './context.svelte';

  let {
    type,
    value,
    options,
    loaderKey,
    relationLoaders,
    onchange,
    inline = false,
    class: className,
  }: {
    type: FilterDataType;
    value: string;
    options?: { label: string; value: string }[];
    loaderKey?: string;
    relationLoaders?: RelationLoaderMap;
    onchange: (value: string) => void;
    inline?: boolean;
    class?: string;
  } = $props();

  let enumOpen = $state(false);
  let dateOpen = $state(false);
  let enumSearch = $state('');
  let relationOpen = $state(false);
  let relationSearch = $state('');

  const filteredOptions = $derived(
    options?.filter((o) =>
      o.label.toLowerCase().includes(enumSearch.toLowerCase())
    ) ?? []
  );

  const relationLoader = $derived(
    type === 'relation' && loaderKey && relationLoaders
      ? relationLoaders[loaderKey]
      : undefined
  );

  const relationPromise = $derived(
    relationLoader ? relationLoader() : undefined
  );

  function parseDateValue(val: string): DateValue | undefined {
    if (!val) return undefined;
    try {
      return parseDate(val);
    } catch {
      return undefined;
    }
  }

  function formatDateDisplay(val: string): string {
    if (!val) return '';
    try {
      const d = parseDate(val);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(d.year, d.month - 1, d.day));
    } catch {
      return val;
    }
  }

  function getEnumLabel(val: string): string {
    return options?.find((o) => o.value === val)?.label ?? val;
  }

  const inlineBase =
    'flex h-7 items-center rounded-md border border-input bg-transparent text-[11px] shadow-xs transition-colors hover:bg-accent/50 dark:bg-input/30 dark:hover:bg-input/50';
  const standaloneBase =
    'flex h-7 items-center rounded-md border border-input bg-background text-[11px] shadow-xs transition-colors hover:bg-accent';
</script>

{#if type === 'relation'}
  <Popover.Root
    bind:open={relationOpen}
    onOpenChange={(o) => {
      if (!o) relationSearch = '';
    }}
  >
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class={cn(
            inline ? inlineBase : standaloneBase,
            'gap-1 px-2.5',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {#if value}
            <svelte:boundary>
              {#await relationPromise}
                <span class="truncate text-muted-foreground">
                  {value.slice(0, 8)}...
                </span>
              {:then loadedOptions}
                {@const label = loadedOptions?.find(
                  (o) => o.value === value
                )?.label}
                <Badge
                  variant="secondary"
                  class="h-[18px] rounded px-1.5 text-[10px]"
                >
                  {label ?? value.slice(0, 8)}
                </Badge>
              {:catch}
                <span class="truncate">{value.slice(0, 8)}...</span>
              {/await}
              {#snippet failed()}
                <span class="truncate">{value.slice(0, 8)}...</span>
              {/snippet}
            </svelte:boundary>
          {:else}
            <span class="truncate">Select...</span>
          {/if}
          <ChevronsUpDown class="ml-0.5 size-2.5 shrink-0 opacity-40" />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-56 p-0" align="start" sideOffset={4}>
      <svelte:boundary>
        {#await relationPromise}
          <div class="flex items-center justify-center gap-2 px-4 py-6">
            <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
            <span class="text-[11px] text-muted-foreground">Loading...</span>
          </div>
        {:then loadedOptions}
          {@const filtered =
            loadedOptions?.filter((o) =>
              o.label.toLowerCase().includes(relationSearch.toLowerCase())
            ) ?? []}
          <div class="flex flex-col">
            <div class="flex items-center gap-2 border-b px-2.5 py-1.5">
              <Search class="size-3 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                bind:value={relationSearch}
                class="h-5 flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div class="max-h-44 overflow-y-auto p-0.5">
              {#if filtered.length === 0}
                <p
                  class="px-2 py-3 text-center text-[11px] text-muted-foreground"
                >
                  No options found.
                </p>
              {:else}
                {#each filtered as option (option.value)}
                  <button
                    type="button"
                    class={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-accent',
                      value === option.value && 'bg-accent'
                    )}
                    onclick={() => {
                      onchange(option.value);
                      relationOpen = false;
                      relationSearch = '';
                    }}
                  >
                    <Check
                      class={cn(
                        'size-3 shrink-0',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span class="truncate">{option.label}</span>
                  </button>
                {/each}
              {/if}
            </div>
          </div>
        {:catch error}
          <div class="flex flex-col items-center gap-1.5 px-4 py-6">
            <TriangleAlert class="size-4 text-destructive" />
            <p class="text-[11px] text-muted-foreground">
              Failed to load options
            </p>
          </div>
        {/await}
        {#snippet failed(error, reset)}
          <div class="flex flex-col items-center gap-1.5 px-4 py-6">
            <TriangleAlert class="size-4 text-destructive" />
            <p class="text-[11px] text-muted-foreground">
              Failed to load options
            </p>
          </div>
        {/snippet}
      </svelte:boundary>
    </Popover.Content>
  </Popover.Root>
{:else if type === 'date'}
  <Popover.Root bind:open={dateOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class={cn(
            inline ? inlineBase : standaloneBase,
            'gap-1.5 px-2.5',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays class="size-3 shrink-0 text-muted-foreground" />
          <span class="truncate">
            {value ? formatDateDisplay(value) : 'Pick date'}
          </span>
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0" align="start" sideOffset={4}>
      <Calendar
        type="single"
        value={parseDateValue(value)}
        onValueChange={(d) => {
          if (d) {
            onchange(
              `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
            );
            dateOpen = false;
          }
        }}
        class="rounded-md border"
      />
    </Popover.Content>
  </Popover.Root>
{:else if type === 'enum'}
  <Popover.Root
    bind:open={enumOpen}
    onOpenChange={(o) => {
      if (!o) enumSearch = '';
    }}
  >
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class={cn(
            inline ? inlineBase : standaloneBase,
            'gap-1 px-2.5',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {#if value}
            <Badge
              variant="secondary"
              class="h-[18px] rounded px-1.5 text-[10px]"
            >
              {getEnumLabel(value)}
            </Badge>
          {:else}
            <span class="truncate">Select option</span>
          {/if}
          <ChevronsUpDown class="ml-0.5 size-2.5 shrink-0 opacity-40" />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-48 p-0" align="start" sideOffset={4}>
      <div class="flex flex-col">
        <div class="flex items-center gap-2 border-b px-2.5 py-1.5">
          <Search class="size-3 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            bind:value={enumSearch}
            class="h-5 flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div class="max-h-44 overflow-y-auto p-0.5">
          {#if filteredOptions.length === 0}
            <p class="px-2 py-3 text-center text-[11px] text-muted-foreground">
              No options found.
            </p>
          {:else}
            {#each filteredOptions as option (option.value)}
              <button
                type="button"
                class={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-accent',
                  value === option.value && 'bg-accent'
                )}
                onclick={() => {
                  onchange(option.value);
                  enumOpen = false;
                  enumSearch = '';
                }}
              >
                <Check
                  class={cn(
                    'size-3 shrink-0',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Badge
                  variant="secondary"
                  class="h-[18px] rounded px-1.5 text-[10px]"
                >
                  {option.label}
                </Badge>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
{:else if type === 'boolean'}
  <div class={cn(inline ? inlineBase : standaloneBase, 'p-0.5', className)}>
    <button
      type="button"
      class={cn(
        'h-[22px] rounded-[4px] px-2 text-[11px] font-medium transition-colors',
        value === 'true'
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
      onclick={() => onchange('true')}
    >
      True
    </button>
    <button
      type="button"
      class={cn(
        'h-[22px] rounded-[4px] px-2 text-[11px] font-medium transition-colors',
        value === 'false'
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
      onclick={() => onchange('false')}
    >
      False
    </button>
  </div>
{:else if type === 'number'}
  <input
    type="number"
    {value}
    oninput={(e) => onchange(e.currentTarget.value)}
    placeholder="Value"
    class={cn(
      inline
        ? 'flex h-7 w-24 min-w-0 rounded-md border border-input bg-transparent px-2.5 text-[11px] shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:relative focus-visible:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
        : 'flex h-7 w-24 min-w-0 rounded-md border border-input bg-background px-2.5 text-[11px] shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      className
    )}
  />
{:else}
  <input
    type="text"
    {value}
    oninput={(e) => onchange(e.currentTarget.value)}
    placeholder="Enter value..."
    class={cn(
      inline
        ? 'flex h-7 w-28 min-w-0 rounded-md border border-input bg-transparent px-2.5 text-[11px] shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:relative focus-visible:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
        : 'flex h-7 w-28 min-w-0 rounded-md border border-input bg-background px-2.5 text-[11px] shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      className
    )}
  />
{/if}
