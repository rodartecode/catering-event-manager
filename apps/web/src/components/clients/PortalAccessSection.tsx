'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface PortalAccessSectionProps {
  clientId: number;
  clientEmail: string;
  portalEnabled: boolean;
  portalEnabledAt?: Date | null;
  onUpdate: () => void;
}

export function PortalAccessSection({
  clientId,
  clientEmail,
  portalEnabled,
  portalEnabledAt,
  onUpdate,
}: PortalAccessSectionProps) {
  const [email, setEmail] = useState(clientEmail);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);
  const [error, setError] = useState('');

  const { data: portalUser, isLoading: portalUserLoading } = trpc.clients.getPortalUser.useQuery(
    { clientId },
    { enabled: portalEnabled }
  );

  const utils = trpc.useUtils();

  const enableMutation = trpc.clients.enablePortalAccess.useMutation({
    onSuccess: () => {
      utils.clients.getById.invalidate({ id: clientId });
      utils.clients.getPortalUser.invalidate({ clientId });
      onUpdate();
      setError('');
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const disableMutation = trpc.clients.disablePortalAccess.useMutation({
    onSuccess: () => {
      utils.clients.getById.invalidate({ id: clientId });
      utils.clients.getPortalUser.invalidate({ clientId });
      onUpdate();
      setShowConfirmDisable(false);
      setError('');
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    enableMutation.mutate({
      clientId,
      contactEmail: email,
      sendWelcome,
    });
  };

  const handleDisable = () => {
    disableMutation.mutate({ clientId });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Portal Access</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {portalEnabled ? (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-900">Portal Access Enabled</p>
              <p className="text-sm text-green-700 mt-1">
                This client can access the portal to view their events and communications.
              </p>
              {portalEnabledAt && (
                <p className="text-xs text-green-600 mt-2">
                  Enabled on{' '}
                  {new Date(portalEnabledAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Portal User Info */}
          {portalUserLoading ? (
            <div className="animate-pulse h-12 bg-gray-100 rounded" />
          ) : portalUser ? (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Portal Account</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium text-gray-900">{portalUser.email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    {portalUser.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {/* Disable Button */}
          {showConfirmDisable ? (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-3">
                Are you sure you want to disable portal access? The client will no longer be able to
                view their events online.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={disableMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                >
                  {disableMutation.isPending ? 'Disabling...' : 'Yes, Disable Access'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDisable(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDisable(true)}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Disable Portal Access
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleEnable} className="space-y-4">
          <p className="text-gray-600 text-sm">
            Enable portal access to allow this client to view their events, task progress, and
            communication history online.
          </p>

          <div>
            <label htmlFor="portal-email" className="block text-sm font-medium text-gray-700 mb-2">
              Client&apos;s Email Address
            </label>
            <input
              id="portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="client@company.com"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              This email will be used for magic link authentication
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="send-welcome"
              type="checkbox"
              checked={sendWelcome}
              onChange={(e) => setSendWelcome(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="send-welcome" className="text-sm text-gray-700">
              Send welcome email with portal instructions
            </label>
          </div>

          <button
            type="submit"
            disabled={enableMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            {enableMutation.isPending ? 'Enabling...' : 'Enable Portal Access'}
          </button>
        </form>
      )}
    </div>
  );
}
