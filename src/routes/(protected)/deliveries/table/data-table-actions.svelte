<script lang="ts">
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import ClipboardIcon from '@lucide/svelte/icons/clipboard';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { toast } from 'svelte-sonner';
  import { resolve } from '$app/paths';
  import {
    delete_delivery_slip,
    discard_delivery_slip_form,
    type DeliverySlip,
  } from '$lib/api/delivery-slips.remote';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

  type Props = {
    id: DeliverySlip['id'];
    royalty_number?: DeliverySlip['royalty_number'] | null;
    party_id?: DeliverySlip['party_id'];
    bill_id?: string;
  };

  let { id, royalty_number, party_id, bill_id }: Props = $props();

  let delete_dialog_open = $state(false);
  let submitting = $state(false);
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="relative size-8 p-0"
      >
        <span class="sr-only">Open menu</span>
        <Ellipsis />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    {#if royalty_number}
      <DropdownMenu.Group>
        <DropdownMenu.GroupHeading>Actions</DropdownMenu.GroupHeading>
        <DropdownMenu.Item
          class="cursor-pointer pr-3 text-sm"
          onclick={() => navigator.clipboard.writeText(royalty_number)}
        >
          <ClipboardIcon class="size-3.5" />
          Copy Royalty
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      <DropdownMenu.Separator />
    {/if}
    {#if party_id}
      <DropdownMenu.Item class="cursor-pointer pr-3">
        {#snippet child({ props })}
          <a href={resolve(`/parties/${party_id}`)} {...props}>
            <ArrowUpRightIcon class="size-3.5" />
            View party
          </a>
        {/snippet}
      </DropdownMenu.Item>
    {/if}
    <!-- {#if bill_id}
    <DropdownMenu.Item class="cursor-pointer pr-3">
      {#snippet child({ props })}
        <a href={resolve(`/bills/${bill_id}`)} {...props}>
          <ArrowUpRightIcon class="size-3.5" />
          View billing
        </a>
      {/snippet}
    </DropdownMenu.Item>
    {/if} -->
    <DropdownMenu.Separator />
    <DropdownMenu.Item
      variant="destructive"
      class="cursor-pointer pr-3"
      onclick={() => (delete_dialog_open = true)}
    >
      <Trash2Icon class="size-3.5" />
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

{#if delete_dialog_open}
  <AlertDialog.Root bind:open={delete_dialog_open}>
    <AlertDialog.Content>
      {@const discard_delivery = discard_delivery_slip_form.for(id)}
      <form
        {...discard_delivery.enhance(async ({ data, form, submit }) => {
          submitting = true;
          try {
            await submit();
            toast.success('Delivery record deleted');
            delete_dialog_open = false;
          } catch (error) {
            console.error(error);
          } finally {
            submitting = false;
          }
        })}
      >
        <input {...discard_delivery.fields.id.as('hidden', id)} />
        <AlertDialog.Header>
          <AlertDialog.Title>Delete Delivery Record</AlertDialog.Title>
          <AlertDialog.Description>
            This will mark the delivery record as discarded and it will no
            longer be visible.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel type="button" disabled={submitting}>
            Cancel
          </AlertDialog.Cancel>
          <AlertDialog.Action
            type="submit"
            class={buttonVariants({
              variant: 'destructive',
              class: 'relative inline-flex items-center gap-2',
            })}
            disabled={submitting}
          >
            {#if submitting}
              <div class="absolute inset-0 flex items-center justify-center">
                <Loader2Icon class="size-4 animate-spin" />
              </div>
            {/if}
            <span class={{ capitalize: true, invisible: submitting }}>
              discard
            </span>
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </form>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
