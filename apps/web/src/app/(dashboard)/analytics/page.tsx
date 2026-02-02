'use client';

import { useState } from 'react';
import {
  AnalyticsCard,
  AnalyticsPageSkeleton,
  DateRangePicker,
  EventCompletionChart,
  ResourceUtilizationChart,
  TaskPerformanceChart,
} from '@/components/analytics';
import {
  exportEventCompletionReport,
  exportResourceUtilizationReport,
  exportTaskPerformanceReport,
} from '@/lib/export-utils';
import { trpc } from '@/lib/trpc';

export default function AnalyticsPage() {
  // Default to last 30 days
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  });

  // Queries
  const eventCompletion = trpc.analytics.eventCompletion.useQuery(
    { dateFrom, dateTo },
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );

  const resourceUtilization = trpc.analytics.resourceUtilization.useQuery(
    { dateFrom, dateTo, resourceType: 'all' },
    { staleTime: 5 * 60 * 1000 }
  );

  const taskPerformance = trpc.analytics.taskPerformance.useQuery(
    { dateFrom, dateTo, category: 'all' },
    { staleTime: 5 * 60 * 1000 }
  );

  const handleDateChange = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  // Loading state
  const isLoading =
    eventCompletion.isLoading || resourceUtilization.isLoading || taskPerformance.isLoading;

  // Error state
  const error = eventCompletion.error || resourceUtilization.error || taskPerformance.error;

  if (isLoading && !eventCompletion.data && !resourceUtilization.data && !taskPerformance.data) {
    return (
      <div className="p-6">
        <AnalyticsPageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading analytics: {error.message}</p>
        </div>
      </div>
    );
  }

  const eventData = eventCompletion.data;
  const resourceData = resourceUtilization.data || [];
  const taskData = taskPerformance.data || [];

  // Calculate summary metrics
  const avgUtilization =
    resourceData.length > 0
      ? resourceData.reduce(
          (acc: number, r: { utilizationPercentage: number }) => acc + r.utilizationPercentage,
          0
        ) / resourceData.length
      : 0;

  const totalTasks = taskData.reduce(
    (acc: number, d: { totalTasks: number }) => acc + d.totalTasks,
    0
  );
  const totalOverdue = taskData.reduce(
    (acc: number, d: { overdueCount: number }) => acc + d.overdueCount,
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Track event completion, resource utilization, and task performance
        </p>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateChange} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total Events"
          value={eventData?.totalEvents || 0}
          description={`${eventData?.completedEvents || 0} completed`}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <AnalyticsCard
          title="Completion Rate"
          value={`${(eventData?.completionRate || 0).toFixed(1)}%`}
          description={`Avg ${(eventData?.averageDaysToComplete || 0).toFixed(1)} days to complete`}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <AnalyticsCard
          title="Resource Utilization"
          value={`${avgUtilization.toFixed(1)}%`}
          description={`${resourceData.length} resources tracked`}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />

        <AnalyticsCard
          title="Total Tasks"
          value={totalTasks}
          description={totalOverdue > 0 ? `${totalOverdue} overdue` : 'No overdue tasks'}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {eventData && (
          <EventCompletionChart
            byStatus={eventData.byStatus}
            completionRate={eventData.completionRate}
            averageDaysToComplete={eventData.averageDaysToComplete}
            onExport={() =>
              exportEventCompletionReport(eventData.byStatus, {
                totalEvents: eventData.totalEvents,
                completedEvents: eventData.completedEvents,
                completionRate: eventData.completionRate,
                averageDaysToComplete: eventData.averageDaysToComplete,
              })
            }
          />
        )}

        <ResourceUtilizationChart
          data={resourceData}
          onExport={() => exportResourceUtilizationReport(resourceData)}
        />
      </div>

      {/* Charts Row 2 */}
      <TaskPerformanceChart
        data={taskData}
        onExport={() => exportTaskPerformanceReport(taskData)}
      />
    </div>
  );
}
