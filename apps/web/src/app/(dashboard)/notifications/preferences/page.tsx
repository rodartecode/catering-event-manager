'use client';

import { trpc } from '@/lib/trpc';

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  task_assigned: 'Task Assigned',
  status_changed: 'Status Changed',
  overdue: 'Overdue Tasks',
  follow_up_due: 'Follow-up Due',
};

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const utils = trpc.useUtils();
  const { data: preferences, isLoading } = trpc.notification.getPreferences.useQuery();

  const updatePreference = trpc.notification.updatePreference.useMutation({
    onMutate: async (newPref) => {
      await utils.notification.getPreferences.cancel();
      const previous = utils.notification.getPreferences.getData();

      utils.notification.getPreferences.setData(undefined, (old) =>
        old?.map((p) =>
          p.notificationType === newPref.notificationType ? { ...p, ...newPref } : p
        )
      );

      return { previous };
    },
    onError: (_err, _newPref, context) => {
      if (context?.previous) {
        utils.notification.getPreferences.setData(undefined, context.previous);
      }
    },
    onSettled: () => {
      utils.notification.getPreferences.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose how you want to be notified for each event type.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Notification Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                In-App
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Email
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {preferences?.map((pref) => (
              <tr key={pref.notificationType}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {NOTIFICATION_TYPE_LABELS[pref.notificationType] ?? pref.notificationType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <ToggleSwitch
                    checked={pref.inAppEnabled}
                    onChange={(value) =>
                      updatePreference.mutate({
                        notificationType: pref.notificationType as
                          | 'task_assigned'
                          | 'status_changed'
                          | 'overdue'
                          | 'follow_up_due',
                        inAppEnabled: value,
                      })
                    }
                    label={`${NOTIFICATION_TYPE_LABELS[pref.notificationType]} in-app notifications`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <ToggleSwitch
                    checked={pref.emailEnabled}
                    onChange={(value) =>
                      updatePreference.mutate({
                        notificationType: pref.notificationType as
                          | 'task_assigned'
                          | 'status_changed'
                          | 'overdue'
                          | 'follow_up_due',
                        emailEnabled: value,
                      })
                    }
                    label={`${NOTIFICATION_TYPE_LABELS[pref.notificationType]} email notifications`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
