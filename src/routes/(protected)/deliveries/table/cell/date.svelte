<script lang="ts">
  import { formatDateTime } from '$lib/utils/format.js';

  let {
    value,
    locales = 'en-IN',
  }: {
    value: string | Date;
    locales?: Intl.LocalesArgument;
  } = $props();

  let date = $derived.by(() =>
    value instanceof Date ? value : new Date(value)
  );

  let formattedDate = $derived.by(() => {
    return formatDateTime(
      date,
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
      locales
    );
  });
</script>

<div
  class="flex w-fit justify-start rounded-lg border border-border bg-accent
  px-1.5 py-0.5 text-sm font-medium text-foreground/60 transition-colors
  duration-200 ease-in-out hover:bg-background/70"
>
  <span title={formattedDate}>
    {formattedDate}
  </span>
</div>
