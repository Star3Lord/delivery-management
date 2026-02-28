<script lang="ts">
  import { formatDateTime } from '$lib/utils/format.js';

  let {
    value,
    locales = 'en-IN',
  }: {
    value: Date;
    locales?: Intl.LocalesArgument;
  } = $props();

  // let date = $derived.by(() => new Date(value * 1000));
  let date = $derived.by(() => value);

  let formattedDate = $derived.by(() => {
    const formattedDate = formatDateTime(
      date,
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
      locales
    );
    return formattedDate;
  });
</script>

<div
  class="flex w-fit justify-start rounded-lg border border-border bg-black/30 px-1.5 py-0.5 text-[0.775rem] font-medium text-muted-foreground"
>
  <relative-time datetime={date.toISOString()} title={formattedDate}>
    {formattedDate}
  </relative-time>
</div>
