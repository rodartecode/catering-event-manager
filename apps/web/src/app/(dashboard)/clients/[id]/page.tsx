'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { CommunicationForm } from '@/components/clients/CommunicationForm';
import { CommunicationList } from '@/components/clients/CommunicationList';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';

type Tab = 'info' | 'events' | 'communications';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = Number(params.id);
  const [activeTab, setActiveTab] = useState<Tab>('communications');

  const { data: client, isLoading: clientLoading } = trpc.clients.getById.useQuery({
    id: clientId,
  });

  const { data: clientEvents } = trpc.clients.getClientEvents.useQuery({
    clientId,
  });

  const {
    data: communicationsData,
    isLoading: communicationsLoading,
    refetch: refetchCommunications,
  } = trpc.clients.listCommunications.useQuery({
    clientId,
  });

  if (clientLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">Client not found</p>
          <Link href="/clients" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'events', label: `Events (${clientEvents?.length ?? 0})` },
    { id: 'communications', label: `Communications (${communicationsData?.total ?? 0})` },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-blue-600 hover:text-blue-700 flex items-center text-sm mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Clients
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.companyName}</h1>
            <p className="text-gray-600 mt-1">{client.contactName}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Company Name</dt>
              <dd className="mt-1 text-gray-900">{client.companyName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
              <dd className="mt-1 text-gray-900">{client.contactName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-gray-900">
                <a href={`mailto:${client.email}`} className="text-blue-600 hover:text-blue-700">
                  {client.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-gray-900">
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="text-blue-600 hover:text-blue-700">
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )}
              </dd>
            </div>
            {client.address && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-gray-900 whitespace-pre-line">{client.address}</dd>
              </div>
            )}
            {client.notes && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-gray-900 whitespace-pre-line">{client.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === 'events' && (
        <div>
          {clientEvents?.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No events for this client</p>
              <Link
                href="/events/new"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700"
              >
                Create an event
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientEvents?.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {event.eventName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(event.eventDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <EventStatusBadge status={event.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {event.location || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'communications' && (
        <div>
          {clientEvents && clientEvents.length > 0 && (
            <CommunicationForm
              clientId={clientId}
              events={clientEvents}
              onSuccess={() => refetchCommunications()}
            />
          )}

          {clientEvents?.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-yellow-700">
                To record communications, you need at least one event for this client.{' '}
                <Link href="/events/new" className="font-medium underline">
                  Create an event
                </Link>
              </p>
            </div>
          )}

          {communicationsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <CommunicationList
              communications={communicationsData?.communications ?? []}
              onComplete={() => refetchCommunications()}
            />
          )}
        </div>
      )}
    </div>
  );
}
