'use client';

import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export function FollowUpBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { data } = trpc.clients.getDueFollowUps.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isDismissed || !data || data.count === 0) {
    return null;
  }

  const overdueCount = data.followUps.filter((f) => f.daysOverdue > 0).length;
  const dueTodayCount = data.count - overdueCount;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-yellow-400 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              You have {data.count} follow-up{data.count !== 1 ? 's' : ''} due
              {overdueCount > 0 && (
                <span className="text-red-600 font-semibold"> ({overdueCount} overdue)</span>
              )}
            </p>
            <p className="text-sm text-yellow-700">
              {dueTodayCount > 0 && `${dueTodayCount} due today`}
              {dueTodayCount > 0 && overdueCount > 0 && ' • '}
              {overdueCount > 0 && `${overdueCount} overdue`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/clients?followups=due"
            className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
          >
            View All
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-yellow-600 hover:text-yellow-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
