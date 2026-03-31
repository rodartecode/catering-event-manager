'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface NotificationDropdownProps {
  onClose: () => void;
}

function getEntityUrl(entityType: string | null, entityId: number | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'event':
      return `/events/${entityId}`;
    case 'task':
      return `/events`; // Tasks are viewed on event pages
    case 'communication':
      return `/clients`;
    default:
      return null;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'task_assigned':
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </span>
      );
    case 'status_changed':
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </span>
      );
    case 'overdue':
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
      );
    case 'follow_up_due':
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </span>
      );
    default:
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </span>
      );
  }
}

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notification.list.useQuery(
    { limit: 20, unreadOnly: false },
    { staleTime: 0 }
  );

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  const handleItemClick = (notif: {
    id: number;
    readAt: Date | null;
    entityType: string | null;
    entityId: number | null;
  }) => {
    if (!notif.readAt) {
      markRead.mutate({ id: notif.id });
    }
    const url = getEntityUrl(notif.entityType, notif.entityId);
    if (url) {
      window.location.href = url;
    }
    onClose();
  };

  const items = data?.items ?? [];

  return (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-xl z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[360px] overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No notifications</div>
        ) : (
          <ul role="list">
            {items.map((notif) => (
              <li key={notif.id}>
                <button
                  type="button"
                  onClick={() =>
                    handleItemClick({
                      id: notif.id,
                      readAt: notif.readAt,
                      entityType: notif.entityType,
                      entityId: notif.entityId,
                    })
                  }
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
                    !notif.readAt ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {getTypeIcon(notif.type)}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${!notif.readAt ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                    >
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate">{notif.body}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {!notif.readAt && (
                    <span
                      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
                      aria-label="Unread"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2">
        <a
          href="/notifications/preferences"
          className="block text-center text-xs text-gray-500 hover:text-gray-700 transition"
        >
          Notification settings
        </a>
      </div>
    </div>
  );
}
