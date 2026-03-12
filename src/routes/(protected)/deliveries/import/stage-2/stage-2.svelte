<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import SaveIcon from '@lucide/svelte/icons/save';
  import CheckCheckIcon from '@lucide/svelte/icons/check-check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import type { ImportState } from '../import-state.svelte';
  import PendingReview from './pending-review.svelte';
  import NewEntities from './new-entities.svelte';
  import ReviewDetails from './review-details.svelte';
  import ReviewedRows from './reviewed-rows.svelte';
  import SkippedRows from './skipped-rows.svelte';
  import DuplicateRows from './duplicate-rows.svelte';

  let { ctx }: { ctx: ImportState } = $props();

  let active_tab = $state('pending');

  let has_approved = $derived((ctx.stats?.approved_rows ?? 0) > 0);
  let has_pending = $derived((ctx.stats?.pending_rows ?? 0) > 0);
  let has_skipped = $derived((ctx.stats?.skipped_rows ?? 0) > 0);
  let has_duplicates = $derived((ctx.stats?.duplicate_rows ?? 0) > 0);

  async function handle_save() {
    const result = await ctx.save_approved();
    if (result && result.remaining === 0) {
      active_tab = 'reviewed';
    }
  }
</script>

<div class="flex flex-col gap-4">
  {#if !ctx.is_completed}
    <div class="flex items-center justify-between">
      <!-- Global bulk actions -->
      <div class="flex items-center gap-2">
        {#if has_pending}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Button variant="outline" size="sm" {...props}>
                  <CheckCheckIcon class="size-3.5" />
                  Bulk Actions
                  <Badge variant="secondary" class="ml-1 text-[10px]">
                    {ctx.stats?.pending_rows ?? 0} pending
                  </Badge>
                  <ChevronDownIcon class="size-3.5" />
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
              <DropdownMenu.Group>
                <DropdownMenu.GroupHeading>
                  Approve (all pages)
                </DropdownMenu.GroupHeading>
                <DropdownMenu.Item
                  onclick={() => ctx.bulk_action('approve', 'all')}
                >
                  <CheckIcon class="size-3.5 text-green-600" />
                  Approve all pending ({ctx.stats?.pending_rows ?? 0})
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onclick={() => ctx.bulk_action('approve', 'clean')}
                >
                  <ShieldCheckIcon class="size-3.5 text-green-600" />
                  Approve clean rows only
                </DropdownMenu.Item>
              </DropdownMenu.Group>
              <DropdownMenu.Separator />
              <DropdownMenu.Group>
                <DropdownMenu.GroupHeading>
                  Skip (all pages)
                </DropdownMenu.GroupHeading>
                <DropdownMenu.Item
                  onclick={() => ctx.bulk_action('skip', 'all')}
                >
                  <XIcon class="size-3.5 text-red-500" />
                  Skip all pending
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onclick={() => ctx.bulk_action('skip', 'with_issues')}
                >
                  <AlertTriangleIcon class="size-3.5 text-amber-500" />
                  Skip rows with issues
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onclick={() => ctx.bulk_action('skip', 'duplicates')}
                >
                  <CopyIcon class="size-3.5 text-blue-500" />
                  Skip all duplicates
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {/if}
      </div>

      <!-- Save button -->
      <div class="flex items-center gap-2">
        {#if has_approved}
          <Badge variant="outline" class="border-green-500/30 text-green-600">
            {ctx.stats?.approved_rows ?? 0} approved
          </Badge>
        {/if}
        <Button
          size="sm"
          disabled={ctx.loading || !has_approved}
          onclick={handle_save}
        >
          {#if ctx.loading}
            <LoaderCircleIcon class="size-4 animate-spin" />
            Saving…
          {:else}
            <SaveIcon class="size-4" />
            Save Approved
          {/if}
        </Button>
      </div>
    </div>
  {/if}

  <Tabs.Root bind:value={active_tab}>
    <Tabs.List>
      <Tabs.Trigger value="pending">
        Pending
        {#if has_pending}
          <Badge variant="secondary" class="ml-1 text-[10px]">
            {ctx.stats?.pending_rows ?? 0}
          </Badge>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="entities">New Entities</Tabs.Trigger>
      <Tabs.Trigger value="duplicates">
        Duplicates
        {#if has_duplicates}
          <Badge variant="secondary" class="ml-1 text-[10px]">
            {ctx.stats?.duplicate_rows ?? 0}
          </Badge>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="skipped">
        Skipped
        {#if has_skipped}
          <Badge variant="secondary" class="ml-1 text-[10px]">
            {ctx.stats?.skipped_rows ?? 0}
          </Badge>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="details">Details</Tabs.Trigger>
      <Tabs.Trigger value="reviewed">
        Reviewed
        {#if (ctx.stats?.approved_rows ?? 0) + (ctx.stats?.saved_rows ?? 0) > 0}
          <Badge variant="secondary" class="ml-1 text-[10px]">
            {(ctx.stats?.approved_rows ?? 0) + (ctx.stats?.saved_rows ?? 0)}
          </Badge>
        {/if}
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="pending">
      <PendingReview {ctx} />
    </Tabs.Content>

    <Tabs.Content value="entities">
      <NewEntities {ctx} />
    </Tabs.Content>

    <Tabs.Content value="duplicates">
      <DuplicateRows {ctx} />
    </Tabs.Content>

    <Tabs.Content value="skipped">
      <SkippedRows {ctx} />
    </Tabs.Content>

    <Tabs.Content value="details">
      <ReviewDetails {ctx} />
    </Tabs.Content>

    <Tabs.Content value="reviewed">
      <ReviewedRows {ctx} />
    </Tabs.Content>
  </Tabs.Root>
</div>
