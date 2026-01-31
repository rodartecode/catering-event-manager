'use client';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function AnalyticsCard({
  title,
  value,
  description,
  trend,
  icon,
  className = '',
}: AnalyticsCardProps) {
  return (
    <div data-testid="analytics-card" className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          {trend && (
            <div className="mt-2 flex items-center">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <svg
                className={`w-4 h-4 ml-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={trend.isPositive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
                />
              </svg>
              <span className="text-sm text-gray-500 ml-1">vs previous period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
        )}
      </div>
    </div>
  );
}
