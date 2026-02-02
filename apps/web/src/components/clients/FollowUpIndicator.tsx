interface FollowUpIndicatorProps {
  followUpDate: Date | null;
  followUpCompleted: boolean;
}

export function FollowUpIndicator({ followUpDate, followUpCompleted }: FollowUpIndicatorProps) {
  if (!followUpDate) {
    return null;
  }

  if (followUpCompleted) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <svg
          className="w-3 h-3 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Completed
      </span>
    );
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const followUp = new Date(followUpDate);
  followUp.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((now.getTime() - followUp.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <svg
          className="w-3 h-3 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {diffDays} day{diffDays !== 1 ? 's' : ''} overdue
      </span>
    );
  }

  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
        <svg
          className="w-3 h-3 mr-1"
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
        Due today
      </span>
    );
  }

  const formattedDate = followUp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <svg
        className="w-3 h-3 mr-1"
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
      {formattedDate}
    </span>
  );
}
