<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import SelectParty from '$lib/components/data/select-party.svelte';
  import SelectVehicle from '$lib/components/data/select-vehicle.svelte';
  import SelectProduct from '$lib/components/data/select-product.svelte';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { WEIGHT_UNITS } from '$lib/utils/validation/units';
  import { create_delivery_slip } from '$lib/api/delivery-slips.remote';
  import FormField from './form-field.svelte';
  import DatePickerInput from './date-picker-input.svelte';

  let {
    onSuccess,
    onCancel,
  }: {
    onSuccess?: () => void;
    onCancel?: () => void;
  } = $props();

  const fields = $derived(create_delivery_slip.fields);
  let submitting = $state(false);

  let selected = $state<{
    party_id?: string;
    vehicle_id?: string;
    product_id?: string;
    product_quantity_unit: (typeof WEIGHT_UNITS)[number];
    royalty_quantity_unit: (typeof WEIGHT_UNITS)[number];
  }>({
    party_id: undefined,
    vehicle_id: undefined,
    product_id: undefined,
    product_quantity_unit: WEIGHT_UNITS[0],
    royalty_quantity_unit: WEIGHT_UNITS[0],
  });

  function reset_selects() {
    selected = {
      party_id: undefined,
      vehicle_id: undefined,
      product_id: undefined,
      product_quantity_unit: untrack(() => selected.product_quantity_unit),
      royalty_quantity_unit: untrack(() => selected.royalty_quantity_unit),
    };
  }
</script>

<form
  {...create_delivery_slip.enhance(async ({ data, form, submit }) => {
    submitting = true;
    try {
      await submit();

      console.log({ data });

      if (
        create_delivery_slip.result &&
        create_delivery_slip.result.length > 0
      ) {
        form.reset();
        reset_selects();
        toast.success('Delivery slip created successfully');
        onSuccess?.();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create delivery slip'
      );
    } finally {
      submitting = false;
    }
  })}
  class="space-y-5"
>
  <input type="hidden" name="party_id" value={selected.party_id} />
  <input type="hidden" name="vehicle_id" value={selected.vehicle_id} />
  <input type="hidden" name="product_id" value={selected.product_id} />

  <div class="grid grid-cols-2 gap-4">
    <FormField label="Date" issues={fields.date.issues()}>
      <DatePickerInput
        id="new-{fields.date.as('text').name}"
        {...fields.date.as('text')}
        disabled={submitting}
      />
    </FormField>
    <FormField label="Party" issues={fields.party_id.issues()}>
      <svelte:boundary>
        <SelectParty
          bind:selected_id={selected.party_id}
          disabled={submitting}
        />
      </svelte:boundary>
    </FormField>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <FormField label="Vehicle" issues={fields.vehicle_id.issues()}>
      <svelte:boundary>
        <SelectVehicle
          bind:selected_id={selected.vehicle_id}
          disabled={submitting}
        />
      </svelte:boundary>
    </FormField>
  </div>

  <Separator />

  <div class="grid grid-cols-6 gap-4">
    <FormField
      label="Product"
      class="col-span-3"
      issues={fields.product_id.issues()}
    >
      <svelte:boundary>
        <SelectProduct
          bind:selected_id={selected.product_id}
          disabled={submitting}
        />
      </svelte:boundary>
    </FormField>
    <FormField
      label="Product Qty"
      class="col-span-3"
      issues={[
        ...(fields.product_quantity.issues() ?? []),
        ...(fields.product_quantity_unit.issues() ?? []),
      ]}
    >
      <ButtonGroup.Root class="w-full">
        <Input {...fields.product_quantity.as('text')} disabled={submitting} />
        <Select.Root
          type="single"
          name={fields.product_quantity_unit.as('select').name}
          bind:value={selected.product_quantity_unit}
        >
          <Select.Trigger class="rounded-r-md! font-mono">
            {selected.product_quantity_unit}
          </Select.Trigger>
          <Select.Content class="w-">
            {#each WEIGHT_UNITS as unit (unit)}
              <Select.Item value={unit}>
                {unit}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <!-- <select {...fields.product_quantity_unit.as('select')}>
          {#each WEIGHT_UNITS as unit (unit)}
            <option>{unit}</option>
          {/each}
        </select> -->
      </ButtonGroup.Root>
    </FormField>
  </div>

  <div class="grid grid-cols-6 gap-4">
    <FormField
      label="Royalty No."
      class="col-span-3"
      issues={fields.royalty.number.issues()}
    >
      <Input
        {...fields.royalty.number.as('text')}
        placeholder="e.g. RN-001"
        disabled={submitting}
      />
    </FormField>
    <FormField
      label="Royalty Qty"
      class="col-span-3"
      issues={[...(fields.royalty.quantity.issues() ?? [])]}
    >
      <ButtonGroup.Root class="w-full">
        <Input
          {...fields.royalty.quantity.value.as('text')}
          disabled={submitting}
        />
        <Select.Root
          type="single"
          name={fields.royalty.quantity.unit.as('select').name}
          bind:value={selected.royalty_quantity_unit}
        >
          <Select.Trigger class="rounded-r-md! font-mono">
            {selected.royalty_quantity_unit}
          </Select.Trigger>
          <Select.Content class="w-">
            {#each WEIGHT_UNITS as unit (unit)}
              <Select.Item value={unit}>
                {unit}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <!-- <select {...fields.product_quantity_unit.as('select')}>
          {#each WEIGHT_UNITS as unit (unit)}
            <option>{unit}</option>
          {/each}
        </select> -->
      </ButtonGroup.Root>
    </FormField>
  </div>

  {#each fields.allIssues() as issue, i (i)}
    {#if issue.path.length === 0}
      <p class="text-sm text-destructive">{issue.message}</p>
    {/if}
  {/each}

  <div class="flex justify-end gap-2 pt-2">
    <Button
      type="button"
      variant="outline"
      disabled={submitting}
      onclick={onCancel}
    >
      Cancel
    </Button>
    <Button type="submit" disabled={submitting}>
      {#if submitting}
        <LoaderCircleIcon class="size-4 animate-spin" />
        Creating…
      {:else}
        Create
      {/if}
    </Button>
  </div>
</form>
