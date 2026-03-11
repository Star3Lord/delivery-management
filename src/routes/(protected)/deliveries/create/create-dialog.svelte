<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import CreateForm from './create-form.svelte';
  import { create_delivery_slip } from '$lib/api/delivery-slips.remote';

  let {
    open = $bindable(false),
    onSuccess,
  }: {
    open?: boolean;
    onSuccess?: () => void;
  } = $props();

  function handle_success() {
    open = false;
    onSuccess?.();
  }

  const handle_open_change = (_open: boolean) => {
    if (!_open) {
      // create_delivery_slip.
    }
  };
</script>

<Dialog.Root bind:open onOpenChange={handle_open_change}>
  <Dialog.Content class="gap-0 p-0 sm:max-w-2xl">
    <div class="px-6 pt-6 pb-4">
      <Dialog.Header>
        <Dialog.Title>New Delivery Slip</Dialog.Title>
        <Dialog.Description>
          Fill in the details to create a new delivery slip.
        </Dialog.Description>
      </Dialog.Header>
    </div>

    <div class="max-h-[calc(80vh-8rem)] overflow-y-auto px-6 pb-6">
      {#if open}
        <CreateForm
          onSuccess={handle_success}
          onCancel={() => (open = false)}
        />
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
