import { ChartCountItem } from '../models/dashboard/dashboard-statistics.models';

const CHART_COLORS = ['#5c67f7', '#60b158', '#f5b849', '#e6533c', '#49b6f5', '#9c27b0'];

export function chartHasData(items: ChartCountItem[] | undefined): boolean {
  return (items ?? []).some(i => i.count > 0);
}

export function buildDonutChartOptions(
  title: string,
  items: ChartCountItem[]
): Record<string, unknown> | null {
  const data = (items ?? []).filter(i => i.count > 0);
  if (!data.length) return null;

  return {
    series: data.map(i => i.count),
    labels: data.map(i => i.label),
    chart: {
      type: 'donut',
      height: 280,
      fontFamily: 'inherit',
    },
    colors: CHART_COLORS,
    legend: {
      position: 'bottom',
      fontSize: '12px',
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: title,
              formatter: () => String(data.reduce((s, i) => s + i.count, 0)),
            },
          },
        },
      },
    },
    stroke: { width: 0 },
    title: {
      text: title,
      align: 'left',
      style: { fontSize: '13px', fontWeight: 600 },
    },
  };
}

export function buildBarChartOptions(
  title: string,
  items: ChartCountItem[],
  horizontal = false
): Record<string, unknown> | null {
  const data = items ?? [];
  if (!data.length) return null;

  return {
    series: [{ name: 'Count', data: data.map(i => i.count) }],
    chart: {
      type: 'bar',
      height: 280,
      fontFamily: 'inherit',
      toolbar: { show: false },
    },
    colors: [CHART_COLORS[0]],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal,
        columnWidth: horizontal ? undefined : '48%',
        barHeight: horizontal ? '58%' : undefined,
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: 'rgba(0,0,0,0.06)',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: data.map(i => i.label),
      labels: {
        style: { fontSize: '11px' },
        rotate: horizontal ? 0 : -25,
      },
    },
    yaxis: {
      labels: { style: { fontSize: '11px' } },
      min: 0,
      forceNiceScale: true,
    },
    title: {
      text: title,
      align: 'left',
      style: { fontSize: '13px', fontWeight: 600 },
    },
  };
}
