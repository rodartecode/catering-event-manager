'use client';

import Link from 'next/link';
import { useState } from 'react';
import { EventCard } from '@/components/events/EventCard';
import { EventListSkeleton } from '@/components/events/EventListSkeleton';
import { BatchStatusDialog, BulkActionBar, ExportButton, ImportDialog } from '@/components/shared';
import { useMultiSelect } from '@/hooks/use-multi-select';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

type EventStatus =
  | 'inquiry'
  | 'planning'
  | 'preparation'
  | 'in_progress'
  | 'completed'
  | 'follow_up'
  | 'all';

const eventStatusOptions = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'planning', label: 'Planning' },
  { value: 'preparation', label: 'Preparation' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'follow_up', label: 'Follow Up' },
];

export default function EventsPage() {
  const { isAdmin } = useIsAdmin();
  const [status, setStatus] = useState<EventStatus>('all');
  const [clientId, setClientId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectMode, setSelectMode] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.event.list.useInfiniteQuery(
      {
        status,
        clientId,
        dateFrom,
        dateTo,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const events = data?.pages.flatMap((page) => page.items) ?? [];
  const { selectedIds, toggle, toggleAll, clear, isAllSelected, isSelected, count } =
    useMultiSelect(events);

  const utils = trpc.useUtils();
  const exportMutation = trpc.event.exportCsv.useMutation();
  const importMutation = trpc.event.importCsv.useMutation();
  const batchUpdateMutation = trpc.event.batchUpdateStatus.useMutation();

  const handleExport = async () => {
    return exportMutation.mutateAsync({
      status: status !== 'all' ? (status as Exclude<EventStatus, 'all'>) : undefined,
      dateFrom,
      dateTo,
    });
  };

  const handleImport = async (csvData: string) => {
    return importMutation.mutateAsync({ csvData });
  };

  const handleBatchUpdate = async (newStatus: string, notes?: string) => {
    await batchUpdateMutation.mutateAsync({
      ids: [...selectedIds],
      newStatus: newStatus as Exclude<EventStatus, 'all'>,
      notes,
    });
    clear();
    setSelectMode(false);
    utils.event.list.invalidate();
  };

  const handleExitSelectMode = () => {
    setSelectMode(false);
    clear();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <ExportButton onExport={handleExport} />
            <button
              type="button"
              onClick={() => setShowImportDialog(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={selectMode ? handleExitSelectMode : () => setSelectMode(true)}
              className={`px-4 py-2 border rounded-lg transition text-sm ${
                selectMode
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {selectMode ? 'Exit Select' : 'Select'}
            </button>
            <Link
              href="/events/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Event
            </Link>
          </div>
        )}
      </div>

      {/* Select All toggle */}
      {selectMode && events.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleAll}
            aria-label="Select all events"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Select all</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="inquiry">Inquiry</option>
              <option value="planning">Planning</option>
              <option value="preparation">Preparation</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="follow_up">Follow Up</option>
            </select>
          </div>

          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              id="dateFrom"
              type="date"
              onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              id="dateTo"
              type="date"
              onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setStatus('all');
                setClientId(undefined);
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Event List */}
      {isLoading ? (
        <EventListSkeleton />
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No events found</p>
          <Link href="/events/new" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
            Create your first event
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                selectable={selectMode}
                selected={isSelected(event.id)}
                onToggleSelect={() => toggle(event.id)}
              />
            ))}
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={count}
        entityLabel="event"
        onUpdateStatus={() => setShowBatchDialog(true)}
        onClear={clear}
      />

      {/* Batch Status Dialog */}
      {showBatchDialog && (
        <BatchStatusDialog
          count={count}
          entityLabel="event"
          statusOptions={eventStatusOptions}
          onSubmit={handleBatchUpdate}
          onClose={() => setShowBatchDialog(false)}
        />
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportDialog
          entityLabel="event"
          onImport={handleImport}
          onClose={() => setShowImportDialog(false)}
          onSuccess={() => utils.event.list.invalidate()}
        />
      )}
    </div>
  );
}
