<script lang="ts" generics="T extends { label: string; value: string }">
  import * as Select from '$lib/components/ui/select/index.js';

  type Option = { label: string; value: string };

  let {
    value = $bindable<string | undefined>(),
    items: options,
    placeholder = 'Select…',
    disabled = false,
  }: {
    value?: string;
    items: T[];
    placeholder?: string;
    disabled?: boolean;
  } = $props();

  let selected_label = $derived(options.find((i) => i.value === value)?.label);
</script>

<Select.Root
  type="single"
  {disabled}
  value={value ?? ''}
  onValueChange={(v) => {
    value = v || undefined;
  }}
>
  <Select.Trigger class="w-full">
    {#if value && selected_label}
      <span class="truncate">{selected_label ?? value}</span>
    {:else}
      <span class="text-muted-foreground">{placeholder}</span>
    {/if}
  </Select.Trigger>
  <Select.Content class="max-h-72">
    <Select.Item value="" label="None" class="text-muted-foreground" />
    {#each options as option (option.value)}
      <Select.Item value={option.value} label={option.label} />
    {/each}
    {#if options.length === 0}
      <div class="px-2 py-4 text-center text-sm text-muted-foreground">
        No options available
      </div>
    {/if}
  </Select.Content>
</Select.Root>
