import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, type ChartOptions,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export default function PriceChart({ points, label }: { points: Array<{ t: number; p: number }>; label: string }) {
  const { chartData, options } = useMemo(() => {
    const up = points.length > 1 && points[points.length - 1].p >= points[0].p;
    const color = up ? '#10b981' : '#ef4444';
    const fmt = (v: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: v < 1 ? 6 : 2 }).format(v);

    return {
      chartData: {
        labels: points.map((p) => new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [
          {
            label,
            data: points.map((p) => p.p),
            borderColor: color,
            backgroundColor: (ctx: any) => {
              const { chart } = ctx;
              const g = chart.ctx.createLinearGradient(0, 0, 0, chart.height);
              g.addColorStop(0, up ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)');
              g.addColorStop(1, 'rgba(0,0,0,0)');
              return g;
            },
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(12,18,24,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx: any) => `${label}: ${fmt(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(120,130,145,0.9)', maxTicksLimit: 10, font: { size: 10 } },
          },
          y: {
            position: 'right' as const,
            grid: { color: 'rgba(120,130,145,0.12)' },
            ticks: {
              color: 'rgba(120,130,145,0.9)',
              font: { size: 10 },
              callback: (v: any) => fmt(v),
            },
          },
        },
      } as ChartOptions<'line'>,
    };
  }, [points, label]);

  return (
    <div className="h-[340px]">
      <Line data={chartData as any} options={options} />
    </div>
  );
}
