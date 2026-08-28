import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export default function GasChart({ points }: { points: Array<{ t: number; gwei: number }> }) {
  const data = useMemo(
    () => ({
      labels: points.map((p) => new Date(p.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
      datasets: [
        {
          label: 'Standard gas (gwei)',
          data: points.map((p) => p.gwei),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    }),
    [points]
  );

  return (
    <div className="h-64">
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(120,130,145,0.9)', maxTicksLimit: 8, font: { size: 10 } } },
            y: { grid: { color: 'rgba(120,130,145,0.12)' }, ticks: { color: 'rgba(120,130,145,0.9)', font: { size: 10 }, callback: (v) => `${v} gwei` } },
          },
        }}
      />
    </div>
  );
}
