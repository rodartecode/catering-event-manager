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

interface TaskPerformance {
  category: 'pre_event' | 'during_event' | 'post_event';
  totalTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  overdueCount: number;
}

interface TaskPerformanceChartProps {
  data: TaskPerformance[];
  onExport?: () => void;
}

const categoryLabels: Record<string, string> = {
  pre_event: 'Pre-Event',
  during_event: 'During Event',
  post_event: 'Post-Event',
};

export function TaskPerformanceChart({ data, onExport }: TaskPerformanceChartProps) {
  const chart = {
    labels: data.map((d) => categoryLabels[d.category] || d.category),
    datasets: [
      {
        label: 'Completed',
        data: data.map((d) => d.completedTasks),
        backgroundColor: 'rgba(34, 197, 94, 0.8)', // green
        borderRadius: 4,
      },
      {
        label: 'Overdue',
        data: data.map((d) => d.overdueCount),
        backgroundColor: 'rgba(239, 68, 68, 0.8)', // red
        borderRadius: 4,
      },
      {
        label: 'Pending',
        data: data.map((d) => d.totalTasks - d.completedTasks - d.overdueCount),
        backgroundColor: 'rgba(156, 163, 175, 0.8)', // gray
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          afterBody: (tooltipItems: { dataIndex: number }[]) => {
            const idx = tooltipItems[0].dataIndex;
            const item = data[idx];
            return `\nAvg completion: ${item.averageCompletionTime.toFixed(1)} hours`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Calculate summary stats
  const totalTasks = data.reduce((acc, d) => acc + d.totalTasks, 0);
  const totalCompleted = data.reduce((acc, d) => acc + d.completedTasks, 0);
  const totalOverdue = data.reduce((acc, d) => acc + d.overdueCount, 0);
  const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  return (
    <div data-testid="task-performance" className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Task Performance by Category</h3>
          <p className="text-sm text-gray-500">
            {completionRate.toFixed(1)}% completion rate
            {totalOverdue > 0 && (
              <span className="text-red-600 ml-2">| {totalOverdue} overdue</span>
            )}
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
      {data.length === 0 || totalTasks === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No task data available
        </div>
      ) : (
        <div className="h-64">
          <Bar data={chart} options={options} />
        </div>
      )}

      {/* Average completion time per category */}
      {totalTasks > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          {data.map((d) => (
            <div key={d.category} className="text-center p-2 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">{categoryLabels[d.category]}</p>
              <p className="text-lg font-semibold text-gray-900">
                {d.averageCompletionTime.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-400">avg completion time</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
