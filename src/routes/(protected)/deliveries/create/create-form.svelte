<script lang="ts">
  import { toast } from 'svelte-sonner';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { create_delivery_slip } from '$lib/api/delivery-slips.remote';
  import { list_customers } from '$lib/api/customers.remote';
  import { list_vehicles } from '$lib/api/vehicles.remote';
  import { list_products } from '$lib/api/products.remote';
  import FormField from './form-field.svelte';
  import RelationSelect from './relation-select.svelte';
  import DatePickerInput from './date-picker-input.svelte';

  let {
    onSuccess,
    onCancel,
  }: {
    onSuccess?: () => void;
    onCancel?: () => void;
  } = $props();

  const f = create_delivery_slip;
  let submitting = $state(false);

  let selected = $state<{
    party_id?: string;
    vehicle_id?: string;
    product_id?: string;
  }>({
    party_id: undefined,
    vehicle_id: undefined,
    product_id: undefined,
  });

  function reset_selects() {
    selected = {
      party_id: undefined,
      vehicle_id: undefined,
      product_id: undefined,
    };
  }
</script>

<form
  {...f.enhance(async ({ form, submit }) => {
    submitting = true;
    try {
      await submit();
      form.reset();
      reset_selects();
      toast.success('Delivery slip created successfully');
      onSuccess?.();
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
  {#if selected.party_id}
    <input type="hidden" name="party_id" value={selected.party_id} />
  {/if}
  {#if selected.vehicle_id}
    <input type="hidden" name="vehicle_id" value={selected.vehicle_id} />
  {/if}
  {#if selected.product_id}
    <input type="hidden" name="product_id" value={selected.product_id} />
  {/if}

  <div class="grid grid-cols-2 gap-4">
    <FormField label="Slip No." issues={f.fields.external_id.issues()}>
      <Input
        {...f.fields.external_id.as('text')}
        placeholder="e.g. DS-001"
        disabled={submitting}
      />
    </FormField>
    <FormField label="Date" issues={f.fields.date.issues()}>
      <DatePickerInput
        id="new-{f.fields.date.as('text').name}"
        {...f.fields.date.as('text')}
        disabled={submitting}
      />
    </FormField>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <FormField label="Party" issues={f.fields.party_id.issues()}>
      <svelte:boundary>
        <RelationSelect
          bind:value={selected.party_id}
          items={(await list_customers({ limit: 500 })).items.map((c) => ({
            label: c.name,
            value: c.id,
          }))}
          placeholder="Select party…"
          disabled={submitting}
        />
        {#snippet pending()}
          <RelationSelect
            bind:value={selected.party_id}
            items={[]}
            placeholder="Select party…"
            disabled={true}
          />
        {/snippet}
        {#snippet failed(error, reset)}
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            Failed to load options
          </div>
        {/snippet}
      </svelte:boundary>
    </FormField>
    <FormField label="Vehicle" issues={f.fields.vehicle_id.issues()}>
      <svelte:boundary>
        <RelationSelect
          bind:value={selected.vehicle_id}
          items={(await list_vehicles({ limit: 500 })).items.map((v) => ({
            label: v.number_plate,
            value: v.id,
          }))}
          placeholder="Select vehicle…"
          disabled={submitting}
        />
        {#snippet pending()}
          <RelationSelect
            bind:value={selected.vehicle_id}
            items={[]}
            placeholder="Select vehicle…"
            disabled={true}
          />
        {/snippet}
        {#snippet failed(error, reset)}
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            Failed to load options
          </div>
        {/snippet}
      </svelte:boundary>
    </FormField>
  </div>

  <Separator />

  <div class="grid grid-cols-3 gap-4">
    <FormField label="Royalty No." issues={f.fields.royalty_number.issues()}>
      <Input
        {...f.fields.royalty_number.as('text')}
        placeholder="e.g. RN-001"
        disabled={submitting}
      />
    </FormField>
    <FormField label="Royalty Qty" issues={f.fields.royalty_quantity.issues()}>
      <Input
        {...f.fields.royalty_quantity.as('text')}
        placeholder="0.00"
        disabled={submitting}
      />
    </FormField>
    <FormField
      label="Royalty Unit"
      issues={f.fields.royalty_quantity_unit.issues()}
    >
      <Input
        {...f.fields.royalty_quantity_unit.as('text')}
        placeholder="ton"
        disabled={submitting}
      />
    </FormField>
  </div>

  <div class="grid grid-cols-3 gap-4">
    <FormField label="Product" issues={f.fields.product_id.issues()}>
      <svelte:boundary>
        <RelationSelect
          bind:value={selected.product_id}
          items={(await list_products({ limit: 500 })).items.map((p) => ({
            label: p.name,
            value: p.id,
          }))}
          placeholder="Select product…"
          disabled={submitting}
        />
        {#snippet pending()}
          <RelationSelect
            bind:value={selected.product_id}
            items={[]}
            placeholder="Select product…"
            disabled={true}
          />
        {/snippet}
        {#snippet failed(error, reset)}
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            Failed to load options
          </div>
        {/snippet}
      </svelte:boundary>
    </FormField>
    <FormField label="Product Qty" issues={f.fields.product_quantity.issues()}>
      <Input
        {...f.fields.product_quantity.as('text')}
        placeholder="0.00"
        disabled={submitting}
      />
    </FormField>
    <FormField
      label="Product Unit"
      issues={f.fields.product_quantity_unit.issues()}
    >
      <Input
        {...f.fields.product_quantity_unit.as('text')}
        placeholder="cft"
        disabled={submitting}
      />
    </FormField>
  </div>

  {#each f.fields.allIssues() as issue, i (i)}
    <p class="text-sm text-destructive">{issue.message}</p>
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
