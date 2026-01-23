import { EventStatusBadge } from './EventStatusBadge';

interface StatusHistoryItem {
  id: number;
  oldStatus: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up' | null;
  newStatus: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
  changedAt: Date;
  changedBy: string | null;
  notes: string | null;
}

interface EventStatusTimelineProps {
  history: StatusHistoryItem[];
}

export function EventStatusTimeline({ history }: EventStatusTimelineProps) {
  if (history.length === 0) {
    return <p className="text-gray-500 text-sm">No status changes yet</p>;
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => {
        const isLast = index === history.length - 1;
        const formattedDate = new Date(item.changedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const formattedTime = new Date(item.changedAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div key={item.id} className="relative">
            {/* Timeline connector */}
            {!isLast && (
              <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200"></div>
            )}

            <div className="flex items-start">
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-4 h-4 mt-1.5 rounded-full bg-blue-600 border-2 border-white"></div>

              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {item.oldStatus && (
                      <>
                        <EventStatusBadge status={item.oldStatus} />
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                    <EventStatusBadge status={item.newStatus} />
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <span>{formattedDate}</span>
                  <span className="mx-1">•</span>
                  <span>{formattedTime}</span>
                  {item.changedBy && (
                    <>
                      <span className="mx-1">•</span>
                      <span>by {item.changedBy}</span>
                    </>
                  )}
                </div>

                {item.notes && (
                  <p className="text-sm text-gray-600 mt-1 italic">&quot;{item.notes}&quot;</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
