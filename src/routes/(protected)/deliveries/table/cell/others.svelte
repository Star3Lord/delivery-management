<script module lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleDashedIcon from '@lucide/svelte/icons/circle-dashed';
  import LockIcon from '@lucide/svelte/icons/lock';
  import ShieldQuestionMarkIcon from '@lucide/svelte/icons/shield-question-mark';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { toast } from 'svelte-sonner';
  import {
    update_delivery_slip_metadata,
    type DeliverySlip,
  } from '$lib/api/delivery-slips.remote';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Input } from '$lib/components/ui/input/index.js';

  const handleInputChange = (e: Event) => {
    if (e.target instanceof HTMLInputElement) {
      const nearestForm = e.target.closest('form');
      if (nearestForm instanceof HTMLFormElement) {
        nearestForm.submit();
      }
    }
  };

  export {
    deliveryState,
    deliveryRemarks,
    deliveryRoyaltyNumber,
    deliveryQuantity,
    deliveryBilled,
  };
</script>

{#snippet deliveryBilled({ state }: { state: DeliverySlip['state'] })}
  <div>
    {#if state === 'billed'}
      <LockIcon class="size-4 text-sky-500" />
    {/if}
  </div>
{/snippet}

{#snippet deliveryState({ state }: { state: DeliverySlip['state'] })}
  <Badge variant="outline" class="gap-1 px-1.5 text-muted-foreground">
    {#if state === 'billed'}
      <LockIcon class="size-3 text-sky-500" />
      <!-- <CircleCheckIcon class="size-3 text-green-500 dark:text-green-400" /> -->
    {:else if state === 'discarded'}
      <TrashIcon class="size-3 text-red-500" />
    {:else if state === 'pending'}
      <CircleDashedIcon class="size-3 text-amber-500 dark:text-amber-400" />
    {:else}
      <ShieldQuestionMarkIcon
        class="size-3 text-yellow-500 dark:text-yellow-400"
      />
    {/if}
    <span class="text-xs capitalize">{state}</span>
  </Badge>
{/snippet}

{#snippet deliveryRemarks({
  remarks,
  delivery_id,
}: {
  remarks?: DeliverySlip['metadata']['remarks'];
  delivery_id: DeliverySlip['id'];
})}
  <!-- {#if remarks && delivery_id}
        {@const update_metadata = update_delivery_slip_metadata.for(delivery_id)}
        <form
            class="w-full"
            {...update_metadata.enhance(async ({ data, form, submit }) => {
                await submit();
                if (update_metadata.result) {
                    toast.success('Remarks updated successfully');
                }
            })}
        >
            <input type="hidden" name="id" value={delivery_id} />
            <Input
                class="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 w-full border-transparent bg-transparent text-end shadow-none focus-visible:border dark:bg-transparent"
                value={remarks}
                id="{delivery_id}-remarks-input"
                name="metadata.remarks"
                type="text"
                onchange={handleInputChange}
            />
        </form>
    {:else if remarks}
        <span class="text-xs text-muted-foreground">{remarks}</span> -->
  {#if remarks}
    <span class="text-xs text-muted-foreground">{remarks}</span>
  {:else}
    <span class="text-xs text-muted-foreground/50">—</span>
  {/if}
{/snippet}

{#snippet deliveryRoyaltyNumber({
  number,
}: {
  number?: DeliverySlip['royalty_number'];
})}
  {#if number}
    <span class="text-xs text-muted-foreground">{number}</span>
  {:else}
    <span class="text-xs text-muted-foreground/50">—</span>
  {/if}
{/snippet}

{#snippet deliveryQuantity(quantity: {
  value?: string | number | null;
  unit?: string | null;
})}
  {#if quantity.value}
    <div class="flex items-center gap-1">
      <span class="font-mono text-xs text-muted-foreground">
        {quantity.value}
      </span>
      <span class="text-xs text-muted-foreground/50">{quantity.unit}</span>
    </div>
  {:else}
    <span class="text-xs text-muted-foreground/50">—</span>
  {/if}
{/snippet}
