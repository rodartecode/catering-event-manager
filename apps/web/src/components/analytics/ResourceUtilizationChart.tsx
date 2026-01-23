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

interface ResourceUtilization {
  resourceId: number;
  resourceName: string;
  resourceType: 'staff' | 'equipment' | 'materials';
  assignedTasks: number;
  totalHoursAllocated: number;
  utilizationPercentage: number;
}

interface ResourceUtilizationChartProps {
  data: ResourceUtilization[];
  onExport?: () => void;
}

function getUtilizationColor(percentage: number): string {
  if (percentage > 100) return 'rgba(239, 68, 68, 0.8)'; // red - over-utilized
  if (percentage > 80) return 'rgba(234, 179, 8, 0.8)'; // yellow - high utilization
  if (percentage > 50) return 'rgba(59, 130, 246, 0.8)'; // blue - moderate
  return 'rgba(34, 197, 94, 0.8)'; // green - under-utilized
}

export function ResourceUtilizationChart({ data, onExport }: ResourceUtilizationChartProps) {
  // Take top 10 resources by utilization for chart readability
  const chartData = data.slice(0, 10);

  const chart = {
    labels: chartData.map((r) => r.resourceName),
    datasets: [
      {
        label: 'Utilization %',
        data: chartData.map((r) => r.utilizationPercentage),
        backgroundColor: chartData.map((r) => getUtilizationColor(r.utilizationPercentage)),
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
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
            const ctx = context as { dataIndex: number; parsed: { x: number } };
            const resource = chartData[ctx.dataIndex];
            return [
              `Utilization: ${ctx.parsed.x.toFixed(1)}%`,
              `Hours: ${resource.totalHoursAllocated.toFixed(1)}`,
              `Tasks: ${resource.assignedTasks}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: Math.max(100, ...chartData.map((r) => r.utilizationPercentage + 10)),
        ticks: {
          callback: (value: unknown) => `${value}%`,
        },
      },
    },
  };

  // Calculate summary stats
  const avgUtilization =
    data.length > 0 ? data.reduce((acc, r) => acc + r.utilizationPercentage, 0) / data.length : 0;
  const overUtilized = data.filter((r) => r.utilizationPercentage > 100).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Resource Utilization</h3>
          <p className="text-sm text-gray-500">
            Avg {avgUtilization.toFixed(1)}% utilization
            {overUtilized > 0 && (
              <span className="text-red-600 ml-2">| {overUtilized} over-allocated</span>
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
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No resource data available
        </div>
      ) : (
        <div className="h-64">
          <Bar data={chart} options={options} />
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }} />
          <span className="text-gray-600">&lt;50% (Available)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.8)' }} />
          <span className="text-gray-600">50-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(234, 179, 8, 0.8)' }} />
          <span className="text-gray-600">80-100%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
          <span className="text-gray-600">&gt;100% (Over-allocated)</span>
        </div>
      </div>
    </div>
  );
}
