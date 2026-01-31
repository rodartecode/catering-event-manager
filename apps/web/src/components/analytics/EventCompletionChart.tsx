'use client';

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface StatusCount {
  status: string;
  count: number;
}

interface EventCompletionChartProps {
  byStatus: StatusCount[];
  completionRate: number;
  averageDaysToComplete: number;
  onExport?: () => void;
}

const statusColors: Record<string, string> = {
  inquiry: 'rgba(147, 51, 234, 0.8)', // purple
  planning: 'rgba(59, 130, 246, 0.8)', // blue
  preparation: 'rgba(234, 179, 8, 0.8)', // yellow
  in_progress: 'rgba(249, 115, 22, 0.8)', // orange
  completed: 'rgba(34, 197, 94, 0.8)', // green
  follow_up: 'rgba(20, 184, 166, 0.8)', // teal
};

const statusLabels: Record<string, string> = {
  inquiry: 'Inquiry',
  planning: 'Planning',
  preparation: 'Preparation',
  in_progress: 'In Progress',
  completed: 'Completed',
  follow_up: 'Follow-up',
};

export function EventCompletionChart({
  byStatus,
  completionRate,
  averageDaysToComplete,
  onExport,
}: EventCompletionChartProps) {
  const data = {
    labels: byStatus.map((s) => statusLabels[s.status] || s.status),
    datasets: [
      {
        label: 'Events',
        data: byStatus.map((s) => s.count),
        backgroundColor: byStatus.map((s) => statusColors[s.status] || 'rgba(156, 163, 175, 0.8)'),
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: unknown) => {
            const ctx = context as { parsed: { y: number } };
            return `${ctx.parsed.y} events`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div data-testid="event-completion-chart" className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Events by Status</h3>
          <p className="text-sm text-gray-500">
            {completionRate.toFixed(1)}% completion rate | Avg {averageDaysToComplete.toFixed(1)}{' '}
            days to complete
          </p>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
        )}
      </div>
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
