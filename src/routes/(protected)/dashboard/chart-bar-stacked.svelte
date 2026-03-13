<script lang="ts">
  import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
  import { cubicInOut } from 'svelte/easing';
  import { scaleBand, scaleTime } from 'd3-scale';
  // import { timeDay } from 'd3-time';
  import { BarChart, Highlight, type ChartContextValue } from 'layerchart';
  import { get_delivery_count_by_products } from '$lib/api/delivery-slips.remote';
  import { Spinner } from '$lib/components/ui/spinner';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Chart from '$lib/components/ui/chart/index.js';
  import {
    day_ordinal_formatter,
    full_month_formatter,
    year_formatter,
    full_date_formatter,
    short_date_formatter,
  } from './utils';

  let context = $state<ChartContextValue>();

  const data_query = $derived(
    get_delivery_count_by_products({
      start_date: '2026-01-01',
      end_date: '2026-06-30',
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
    return [...by_date.values()];
  });

  const format_tooltip_date_label = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return full_date_formatter.format(d);
  };

  const format_x_axis_ticks = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return short_date_formatter.format(d);
  };

  const starting_date = $derived.by(() => {
    let first_date = chart_data?.[0]?.date;
    if (!first_date) return '';
    try {
      const date = new Date(first_date + 'T00:00:00');
      return `${day_ordinal_formatter(date.getDate())} ${full_month_formatter.format(date)} ${year_formatter.format(date)}`;
    } catch (error) {
      return '';
    }
  });
  const last_date = $derived.by(() => {
    let last_date = chart_data?.[chart_data?.length - 1]?.date;
    if (!last_date) return '';
    try {
      const date = new Date(last_date + 'T00:00:00');
      return `${day_ordinal_formatter(date.getDate())} ${full_month_formatter.format(date)} ${year_formatter.format(date)}`;
    } catch (error) {
      return '';
    }
  });
</script>

<Card.Root class="col-span-3 w-full">
  <Card.Header>
    <Card.Title>
      Deliveries
      <span class="text-xs font-normal text-muted-foreground">by Products</span>
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
  </Card.Header>
  <Card.Content class="w-full">
    {#if data_query.loading}
      <div
        class="flex h-full w-full flex-col items-center justify-center gap-2"
      >
        <Spinner class="size-4 animate-spin" />
        Loading data...
      </div>
    {:else if data_query.error}
      <div class="flex w-full items-center justify-center">
        <p class="text-sm text-muted-foreground">Failed to load data</p>
      </div>
    {:else}
      <Chart.Container config={chart_config} class="aspect-auto h-72">
        <BarChart
          bind:context
          data={chart_data}
          xScale={scaleBand().padding(0.1)}
          x="date"
          axis="x"
          brush
          rule={false}
          {series}
          seriesLayout="stack"
          props={{
            bars: {
              initialY: context?.height,
              initialHeight: 0,
              motion: {
                y: { type: 'tween', duration: 500, easing: cubicInOut },
                height: { type: 'tween', duration: 500, easing: cubicInOut },
              },
            },
            highlight: { area: false },
            xAxis: {
              format: format_x_axis_ticks,
              ticks: (scale) =>
                scaleTime(scale.domain(), scale.range()).ticks(),
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
          Showing delivery counts for last 6 months
        </div>
      </div>
    </div>
  </Card.Footer>
</Card.Root>
