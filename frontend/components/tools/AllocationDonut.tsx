import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartOptions } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AllocationDonut({ labels, values }: { labels: string[]; values: number[] }) {
  const palette = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#a855f7', '#f43f5e'];
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, color: 'rgba(140,150,165,0.95)', font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (c: any) => {
            const total = c.dataset.data.reduce((s: number, v: number) => s + v, 0) || 1;
            return ` ${c.label}: ${((c.parsed / total) * 100).toFixed(1)}%`;
          },
        },
      },
    },
  };
  return (
    <div className="h-56">
      <Doughnut
        data={{
          labels,
          datasets: [{ data: values, backgroundColor: labels.map((_, i) => palette[i % palette.length]), borderWidth: 0 }],
        }}
        options={options}
      />
    </div>
  );
}
