<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import { cn } from '$lib/utils.js';

  let {
    class: className,
    checked = false,
    onCheckedChange = (v) => (checked = v),
    ...restProps
  }: ComponentProps<typeof Checkbox> = $props();

  $inspect(checked);
</script>

<Checkbox
  class={cn('ml-2 size-4 border-input', className)}
  bind:checked={() => checked, onCheckedChange}
  {...restProps}
/>
