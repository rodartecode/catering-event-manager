/**
 * CSV Export utilities for analytics reports
 */

import { logger } from './logger';

type ExportableValue = string | number | boolean | null | undefined;

export function exportToCSV(data: Record<string, ExportableValue>[], filename: string): void {
  if (data.length === 0) {
    logger.warn('No data to export', { context: 'exportToCSV', filename });
    return;
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Build CSV content
  const csvContent = [
    // Header row
    headers.map(escapeCSVValue).join(','),
    // Data rows
    ...data.map((row) => headers.map((header) => escapeCSVValue(row[header])).join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${formatDateForFilename(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSVValue(value: ExportableValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Specific export functions for each report type

interface EventStatusCount {
  status: string;
  count: number;
}

export function exportEventCompletionReport(
  byStatus: EventStatusCount[],
  totals: {
    totalEvents: number;
    completedEvents: number;
    completionRate: number;
    averageDaysToComplete: number;
  }
): void {
  const data = [
    // Summary row
    {
      Category: 'Summary',
      Status: 'Total Events',
      Count: totals.totalEvents,
      Rate: '',
      AverageDays: '',
    },
    {
      Category: 'Summary',
      Status: 'Completed Events',
      Count: totals.completedEvents,
      Rate: `${totals.completionRate.toFixed(1)}%`,
      AverageDays: totals.averageDaysToComplete.toFixed(1),
    },
    // Spacer
    { Category: '', Status: '', Count: '', Rate: '', AverageDays: '' },
    // Status breakdown
    ...byStatus.map((s) => ({
      Category: 'By Status',
      Status: s.status,
      Count: s.count,
      Rate: '',
      AverageDays: '',
    })),
  ];

  exportToCSV(data, 'event-completion-report');
}

interface ResourceUtilization {
  resourceId: number;
  resourceName: string;
  resourceType: string;
  assignedTasks: number;
  totalHoursAllocated: number;
  utilizationPercentage: number;
}

export function exportResourceUtilizationReport(data: ResourceUtilization[]): void {
  const exportData = data.map((r) => ({
    'Resource ID': r.resourceId,
    'Resource Name': r.resourceName,
    Type: r.resourceType,
    'Assigned Tasks': r.assignedTasks,
    'Hours Allocated': r.totalHoursAllocated.toFixed(2),
    'Utilization %': r.utilizationPercentage.toFixed(1),
  }));

  exportToCSV(exportData, 'resource-utilization-report');
}

interface TaskPerformance {
  category: string;
  totalTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  overdueCount: number;
}

export function exportTaskPerformanceReport(data: TaskPerformance[]): void {
  const exportData = data.map((d) => ({
    Category: d.category,
    'Total Tasks': d.totalTasks,
    'Completed Tasks': d.completedTasks,
    'Completion Rate':
      d.totalTasks > 0 ? `${((d.completedTasks / d.totalTasks) * 100).toFixed(1)}%` : '0%',
    'Avg Completion (hours)': d.averageCompletionTime.toFixed(1),
    'Overdue Count': d.overdueCount,
  }));

  exportToCSV(exportData, 'task-performance-report');
}
