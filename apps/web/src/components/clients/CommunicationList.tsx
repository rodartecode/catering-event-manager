'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CommunicationTypeBadge } from './CommunicationTypeBadge';
import { FollowUpIndicator } from './FollowUpIndicator';

interface Communication {
  communication: {
    id: number;
    type: 'email' | 'phone' | 'meeting' | 'other';
    subject: string | null;
    notes: string | null;
    contactedAt: Date;
    followUpDate: Date | null;
    followUpCompleted: boolean;
  };
  event: {
    id: number;
    eventName: string;
    eventDate: Date;
  } | null;
  contactedByUser: {
    id: number;
    name: string;
  } | null;
}

interface CommunicationListProps {
  communications: Communication[];
  onComplete?: () => void;
}

export function CommunicationList({ communications, onComplete }: CommunicationListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const completeFollowUp = trpc.clients.completeFollowUp.useMutation({
    onSuccess: () => {
      onComplete?.();
    },
  });

  if (communications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p>No communications recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {communications.map((item) => {
        const isExpanded = expandedId === item.communication.id;
        const formattedDate = new Date(item.communication.contactedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={item.communication.id}
            className="bg-white rounded-lg shadow p-4 border border-gray-200"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <CommunicationTypeBadge type={item.communication.type} />
                <FollowUpIndicator
                  followUpDate={item.communication.followUpDate}
                  followUpCompleted={item.communication.followUpCompleted}
                />
              </div>
              <span className="text-sm text-gray-500">{formattedDate}</span>
            </div>

            <h4 className="font-medium text-gray-900 mb-1">
              {item.communication.subject || 'No subject'}
            </h4>

            <div className="text-sm text-gray-600 mb-2">
              {item.event && (
                <span className="mr-4">
                  <span className="font-medium">Event:</span> {item.event.eventName}
                </span>
              )}
              {item.contactedByUser && (
                <span>
                  <span className="font-medium">By:</span> {item.contactedByUser.name}
                </span>
              )}
            </div>

            {item.communication.notes && (
              <div className="mt-2">
                <p
                  className={`text-gray-700 text-sm ${
                    !isExpanded && item.communication.notes.length > 150 ? 'line-clamp-2' : ''
                  }`}
                >
                  {item.communication.notes}
                </p>
                {item.communication.notes.length > 150 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.communication.id)}
                    className="text-blue-600 text-sm mt-1 hover:text-blue-700"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}

            {item.communication.followUpDate && !item.communication.followUpCompleted && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() =>
                    completeFollowUp.mutate({ communicationId: item.communication.id })
                  }
                  disabled={completeFollowUp.isPending}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {completeFollowUp.isPending ? 'Completing...' : 'Mark Follow-Up Complete'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
