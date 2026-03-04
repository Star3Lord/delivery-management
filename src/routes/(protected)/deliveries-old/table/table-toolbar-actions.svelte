<script lang="ts">
  import ListIcon from '@lucide/svelte/icons/list';
  import InfinityIcon from '@lucide/svelte/icons/infinity';
  import MousePointerClickIcon from '@lucide/svelte/icons/mouse-pointer-click';
  import ScanEyeIcon from '@lucide/svelte/icons/scan-eye';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { useTableConfig } from '$lib/components/ui/data-grid/index.js';

  interface Props {
    is_refreshing?: boolean;
    onrefresh?: () => void;
  }

  let { is_refreshing = false, onrefresh }: Props = $props();

  const config = useTableConfig();

  const LIMIT_OPTIONS = [10, 20, 50, 100];
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" class="h-8 gap-1.5">
        <SettingsIcon class="size-3.5" />
        <span class="text-xs font-semibold">Table Settings</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content align="end" class="w-64 p-0">
    <div class="px-4 pt-3 pb-1.5">
      <h4 class="text-xs font-medium tracking-wide text-muted-foreground">
        Table Settings
      </h4>
    </div>

    <div class="flex flex-col gap-3 px-4 pb-4">
      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">Data mode</Label>
        <ToggleGroup.Root
          type="single"
          variant="outline"
          size="sm"
          class="w-full"
          value={config.mode}
          onValueChange={(v) => {
            if (v === 'pagination' || v === 'infinite') config.mode = v;
          }}
        >
          <ToggleGroup.Item
            value="pagination"
            class="h-8 flex-1 gap-1.5 text-xs"
          >
            <ListIcon class="size-3.5" />
            Pages
          </ToggleGroup.Item>
          <ToggleGroup.Item value="infinite" class="h-8 flex-1 gap-1.5 text-xs">
            <InfinityIcon class="size-3.5" />
            Infinite
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>

      {#if config.mode === 'infinite'}
        <div class="flex flex-col gap-1.5">
          <Label class="text-xs text-muted-foreground">Load trigger</Label>
          <ToggleGroup.Root
            type="single"
            variant="outline"
            size="sm"
            class="w-full"
            value={config.infinite_trigger}
            onValueChange={(v) => {
              if (v === 'observer' || v === 'button')
                config.infinite_trigger = v;
            }}
          >
            <ToggleGroup.Item value="button" class="h-8 flex-1 gap-1.5 text-xs">
              <MousePointerClickIcon class="size-3.5" />
              Manual
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="observer"
              class="h-8 flex-1 gap-1.5 text-xs"
            >
              <ScanEyeIcon class="size-3.5" />
              Auto-scroll
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      {/if}

      <div class="flex items-center justify-between gap-2">
        <Label class="text-xs text-muted-foreground">Rows per page</Label>
        <Select.Root
          type="single"
          value={String(config.limit)}
          onValueChange={(v) => {
            if (v) config.limit = Number(v);
          }}
        >
          <Select.Trigger size="sm" class="h-7 w-16 gap-1 text-xs">
            {config.limit}
          </Select.Trigger>
          <Select.Content align="end" class="min-w-20">
            {#each LIMIT_OPTIONS as opt (opt)}
              <Select.Item value={String(opt)} class="text-xs">
                {opt}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
  </Popover.Content>
</Popover.Root>

{#if onrefresh}
  <Button
    variant="outline"
    size="icon"
    class="size-8"
    onclick={onrefresh}
    disabled={is_refreshing}
  >
    <RefreshCwIcon class="size-3.5 {is_refreshing ? 'animate-spin' : ''}" />
    <span class="sr-only">Refresh</span>
  </Button>
{/if}
