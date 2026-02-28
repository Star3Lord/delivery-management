<script lang="ts">
  import type { Customer } from '$lib/types';

  let {
    value,
  }: {
    value?: Customer;
  } = $props();
</script>

{#if value}
  <div
    class="line-clamp-1 flex w-fit max-w-full cursor-pointer justify-start truncate rounded-md px-1.5 py-px text-sm font-medium text-[rgb(64,127,242)]/90 ring-1 transition-colors duration-200 ease-in-out hover:bg-[rgb(229,238,255)] dark:text-[rgb(83,139,243)]/90 dark:hover:bg-[rgb(41,60,96)]"
  >
    {value.name}
  </div>
{:else}
  <span class="text-sm text-muted-foreground">—</span>
{/if}
