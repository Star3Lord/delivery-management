<script lang="ts">
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import { Calendar } from '$lib/components/ui/calendar/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import {
    CalendarDate,
    getLocalTimeZone,
    today,
    type DateValue,
  } from '@internationalized/date';
  import { untrack } from 'svelte';
  let {
    id,
    name,
    'aria-invalid': ariaInvalid,
    disabled = false,
  }: {
    id: string;
    name: string;
    'aria-invalid'?: boolean | 'true' | 'false';
    disabled?: boolean;
  } = $props();

  // ── helpers ──────────────────────────────────────────────────────────────

  function format_date(date: DateValue | undefined): string {
    if (!date) return '';
    return date.toDate(getLocalTimeZone()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function format_iso(date: DateValue | undefined): string {
    if (!date) return '';
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }

  /** Try to parse common typed formats into a CalendarDate. Returns undefined on failure. */
  function parse_input(raw: string): DateValue | undefined {
    // YYYY-MM-DD
    let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      try {
        return new CalendarDate(+m[1], +m[2], +m[3]);
      } catch {
        /* skip */
      }
    }
    // DD/MM/YYYY or DD-MM-YYYY
    m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      try {
        return new CalendarDate(+m[3], +m[2], +m[1]);
      } catch {
        /* skip */
      }
    }
    return undefined;
  }

  // ── state ─────────────────────────────────────────────────────────────────

  const today_date = today(getLocalTimeZone());

  let open = $state(false);
  let cal_value = $state<DateValue | undefined>(today_date);
  // input_text is the single source of displayed text; it leads, cal_value follows
  let input_value = $state(format_date(today_date));

  // Hidden form value always tracks cal_value
  let form_value = $derived(format_iso(cal_value));
</script>

<!-- Carries the YYYY-MM-DD value used by the remote form handler -->
<input
  type="hidden"
  id="{id}-date-input"
  {name}
  value={form_value}
  aria-invalid={ariaInvalid}
/>

<div class="relative flex gap-2">
  <Input
    bind:value={
      () => input_value,
      (v) => {
        input_value = v;
        const parsed = parse_input(v);
        if (parsed) cal_value = parsed;
      }
    }
    placeholder={format_date(today_date)}
    disabled
    class="bg-background pe-10"
    onkeydown={(e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open = true;
      }
    }}
  />

  <!-- <Popover.Root bind:open>
    <Popover.Trigger class="absolute inset-e-2 top-1/2 -translate-y-1/2">
      {#snippet child({ props })}
        <Button
          {...props}
          type="button"
          variant="ghost"
          size="icon"
          {disabled}
          class="size-6"
          aria-label="Pick a date"
        >
          <CalendarIcon class="size-3.5" />
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="w-auto overflow-hidden p-0"
      align="end"
      avoidCollisions={true}
      collisionPadding={16}
    >
      <Calendar
        type="single"
        captionLayout="dropdown"
        bind:value={cal_value}
        onValueChange={(v) => {
          input_value = format_date(v);
          open = false;
        }}
      />
    </Popover.Content>
  </Popover.Root> -->
  <Popover.Root bind:open>
    <Popover.Trigger id="{id}-date-picker">
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          class="absolute inset-e-1 top-1/2 size-7 -translate-y-1/2"
        >
          <CalendarIcon class="size-3.5" />
          <span class="sr-only">Select date</span>
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto overflow-hidden p-0" align="end">
      <Calendar
        type="single"
        bind:value={cal_value}
        captionLayout="dropdown"
        onValueChange={(v) => {
          input_value = format_date(v);
          open = false;
        }}
      />
    </Popover.Content>
  </Popover.Root>
</div>
