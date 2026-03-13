<script lang="ts">
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import Package from '@lucide/svelte/icons/package';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Clock from '@lucide/svelte/icons/clock';
  import RecentDeliveriesPlaceholder from './recent-deliveries-placeholder.svelte';

  let { data } = $props();

  const created = $derived(
    new Date(data.created_at).toLocaleDateString('en', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  const updated = $derived(
    new Date(data.updated_at).toLocaleDateString('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  );
</script>

<div class="flex h-full min-h-0 flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/products">Products</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{data.name}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    {/snippet}
  </PageHeader>

  <div class="flex-1 space-y-6 overflow-y-auto p-6">
    <div class="flex items-start gap-4">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary/70"
      >
        <Package class="size-5" />
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-xl font-semibold tracking-tight text-foreground">
          {data.name}
        </h1>
        <div
          class="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground/50"
        >
          <Badge variant="secondary" class="text-[11px] font-normal">
            Product
          </Badge>
          <!-- <span class="flex items-center gap-1">
            <Calendar class="size-3" />
            {created}
          </span> -->
          <span class="flex items-center gap-1">
            <Clock class="size-3" />
            {updated}
          </span>
        </div>
      </div>
    </div>

    <Separator />

    <RecentDeliveriesPlaceholder product_id={data.id} />
  </div>
</div>
