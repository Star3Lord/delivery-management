<script lang="ts">
  import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import { scaleBand, scaleTime } from 'd3-scale';
  import { timeDay, timeMonth, timeYear } from 'd3-time';
  import {
    Axis,
    BarChart,
    Highlight,
    Layer,
    type ChartContextValue,
  } from 'layerchart';
  import { untrack } from 'svelte';
  import { cubicInOut } from 'svelte/easing';
  import { get_delivery_count_by_products } from '$lib/api/delivery-slips.remote';
  import { Spinner } from '$lib/components/ui/spinner';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Chart from '$lib/components/ui/chart/index.js';
  import LoadingState from '$lib/components/ui/loading/data.svelte';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    CalendarDate,
    today,
    getLocalTimeZone,
    type DateValue,
  } from '@internationalized/date';
  import type { DateRange } from 'bits-ui';
  import {
    day_ordinal_formatter,
    full_month_formatter,
    year_formatter,
    full_date_formatter,
    short_month_day_formatter,
    short_date_formatter,
  } from './utils';

  type Props = {
    initial_start_date?: string;
    initial_end_date?: string;
  };

  const tz = getLocalTimeZone();
  const today_date = today(tz);

  const {
    // initial_start_date = today_date.subtract({ months: 1 }).toString(),
    // initial_end_date = today_date.toString(),
    initial_start_date = '2025-06-01',
    initial_end_date = '2025-08-31',
  }: Props = $props();

  const parse_date = (s: string): CalendarDate => {
    const [y, m, d] = s.split('-').map(Number);
    return new CalendarDate(y, m, d);
  };

  const PRESETS = [
    {
      label: 'Last 7 days',
      start: today_date.subtract({ days: 6 }),
      end: today_date,
    },
    {
      label: 'Last 30 days',
      start: today_date.subtract({ days: 29 }),
      end: today_date,
    },
    {
      label: 'Last 2 months',
      start: today_date.subtract({ months: 2 }),
      end: today_date,
    },
    {
      label: 'Last 3 months',
      start: today_date.subtract({ months: 3 }),
      end: today_date,
    },
  ];

  let selected_range = $state<DateRange>({
    start: untrack(() => parse_date(initial_start_date)),
    end: untrack(() => parse_date(initial_end_date)),
  });

  let popover_open = $state(false);

  const to_date_string = (d: DateValue) =>
    `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

  const start_date = $derived(
    selected_range.start
      ? to_date_string(selected_range.start)
      : initial_start_date
  );
  const end_date = $derived(
    selected_range.end ? to_date_string(selected_range.end) : initial_end_date
  );

  const format_trigger_label = $derived.by(() => {
    const { start, end } = selected_range;
    if (!start) return 'Select date range';
    const fmt = (d: DateValue) =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(d.year, d.month - 1, d.day));
    return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
  });

  function handle_range_change(range: DateRange | undefined) {
    if (range?.start && range?.end) {
      popover_open = false;
    }
  }

  function apply_preset(preset: (typeof PRESETS)[number]) {
    selected_range = { start: preset.start, end: preset.end };
    popover_open = false;
  }

  let context = $state<ChartContextValue>();

  const data_query = $derived(
    get_delivery_count_by_products({
      start_date,
      end_date,
    })
  );

  const product_names = $derived.by(() => {
    if (!data_query.current) return [];
    return [
      ...new Set(data_query.current.map((row) => row.product.name)),
    ].sort();
  });

  const chart_config = $derived.by(() => {
    const config: Chart.ChartConfig = {};
    for (const [i, name] of product_names.entries()) {
      config[name] = {
        label: name,
        color: `var(--chart-${(i % 5) + 1})`,
      };
    }
    return config;
  });

  const series = $derived.by(() => {
    let _series = product_names.map((name, index) => {
      return {
        key: name,
        label: chart_config[name]?.label ?? name,
        color: chart_config[name]?.color,
        props: {
          rounded:
            index === 0
              ? ('bottom' as const)
              : index === product_names.length - 1
                ? ('top' as const)
                : ('none' as const),
        },
      };
    });
    return _series;
  });

  // Pivot long-format rows into wide-format: one object per date with each product as a key
  const chart_data = $derived.by(() => {
    if (!data_query.current) return [];
    const by_date = new Map<string, Record<string, unknown>>();
    for (const row of data_query.current) {
      let entry = by_date.get(row.date);
      if (!entry) {
        entry = { date: row.date };
        by_date.set(row.date, entry);
      }
      entry[row.product.name] = row.count;
    }
    return [
      ...by_date.values().map((entry) => ({
        ...entry,
        date: new Date(entry.date + 'T00:00:00'),
      })),
    ];
  });

  const format_tooltip_date_label = (date: Date) => {
    return full_date_formatter.format(date);
  };

  const format_x_axis_ticks = (date: Date) => {
    return short_month_day_formatter.format(date);
  };

  const starting_date = $derived.by(() => {
    let first_date = chart_data?.[0]?.date;
    if (!first_date) return '';
    return `${day_ordinal_formatter(first_date.getDate())} ${full_month_formatter.format(first_date)} ${year_formatter.format(first_date)}`;
  });
  const last_date = $derived.by(() => {
    let last_date = chart_data?.[chart_data?.length - 1]?.date;
    if (!last_date) return '';
    return `${day_ordinal_formatter(last_date.getDate())} ${full_month_formatter.format(last_date)} ${year_formatter.format(last_date)}`;
  });
</script>

<Card.Root class="col-span-3 w-full">
  <Card.Header class="flex flex-row items-start justify-between gap-4">
    <div class="flex flex-col gap-1.5">
      <Card.Title>
        Deliveries
        <span class="text-xs font-normal text-muted-foreground">
          by Products
        </span>
      </Card.Title>
      <Card.Description>
        <span class="font-normal text-foreground/70">
          {starting_date}
        </span>
        &mdash;
        <span class="font-normal text-foreground/70">
          {last_date}
        </span>
      </Card.Description>
    </div>

    <Popover.Root bind:open={popover_open}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            size="sm"
            class="h-8 gap-1.5 text-xs font-normal"
          >
            <CalendarIcon class="size-3.5 shrink-0" />
            {format_trigger_label}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="w-auto p-0" align="end">
          <div class="flex">
            <div class="flex flex-col gap-1 border-r p-3">
              {#each PRESETS as preset (preset.label)}
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 justify-start text-xs"
                  onclick={() => apply_preset(preset)}
                >
                  {preset.label}
                </Button>
              {/each}
            </div>
            <RangeCalendar
              bind:value={selected_range}
              onValueChange={handle_range_change}
              numberOfMonths={2}
              minDays={7}
              maxDays={92}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  </Card.Header>
  <Card.Content class="h-72 w-full">
    {#if data_query.loading}
      <LoadingState />
    {:else if data_query.error}
      <div class="flex w-full items-center justify-center">
        <p class="text-sm text-muted-foreground">Failed to load data</p>
      </div>
    {:else}
      <Chart.Container config={chart_config} class="aspect-auto h-full">
        <BarChart
          bind:context
          data={chart_data}
          // xScale={scaleBand().padding(0.1)}
          xScale={scaleTime()}
          x="date"
          axis="x"
          rule={false}
          {series}
          seriesLayout="stack"
          xInterval={timeDay}
          props={{
            bars: {
              initialY: context?.height,
              initialHeight: 0,
              motion: {
                y: { type: 'tween', duration: 500, easing: cubicInOut },
                height: { type: 'tween', duration: 500, easing: cubicInOut },
              },
              rounded: 'all',
            },
            highlight: { area: false },
            xAxis: {
              format: format_x_axis_ticks,
              // ticks(scale) {
              //   return scaleTime(scale.domain(), scale.range()).ticks(7);
              // },
              rule: true,
              tickMultiline: true,
            },
          }}
          legend
        >
          {#snippet belowMarks()}
            <Highlight area={{ class: 'fill-muted' }} />
          {/snippet}

          {#snippet tooltip()}
            <Chart.Tooltip labelFormatter={format_tooltip_date_label} />
          {/snippet}
          {#snippet aboveContext({ context })}
            <Layer type="svg">
              <Axis
                placement="bottom"
                tickMultiline
                ticks={{
                  interval: timeMonth.every(3),
                }}
                tickLabelProps={{
                  offset: 50,
                }}
                format={(d) =>
                  'Q' +
                  (d.getMonth() / 3 + 1) +
                  (d.getMonth() === 0 ? '\n' + d.getFullYear() : '')}
                rule={false}
              />
            </Layer>
          {/snippet}
        </BarChart>
      </Chart.Container>
    {/if}
  </Card.Content>
  <Card.Footer>
    <div class="flex w-full items-start gap-2 text-sm">
      <div class="grid gap-2">
        <div class="flex items-center gap-2 leading-none font-medium">
          Deliveries by product <TrendingUpIcon class="size-4" />
        </div>
        <div class="flex items-center gap-2 leading-none text-muted-foreground">
          Showing delivery counts for selected date range
        </div>
      </div>
    </div>
  </Card.Footer>
</Card.Root>
