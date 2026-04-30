'use client';

import toast from 'react-hot-toast';
import { trpc } from '@/lib/trpc';
import {
  type VendorServiceType,
  vendorServiceTypeBadgeClasses,
  vendorServiceTypeLabels,
} from './service-types';

interface EventVendorListProps {
  eventId: number;
  canManage?: boolean;
}

function formatCost(cost: string | null): string {
  if (!cost) return '—';
  const num = parseFloat(cost);
  if (Number.isNaN(num)) return cost;
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function EventVendorList({ eventId, canManage = false }: EventVendorListProps) {
  const utils = trpc.useUtils();
  const { data: assignments, isLoading } = trpc.vendor.listByEvent.useQuery({ eventId });

  const unassignMutation = trpc.vendor.unassignFromEvent.useMutation({
    onSuccess: () => {
      toast.success('Vendor unassigned');
      utils.vendor.listByEvent.invalidate({ eventId });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading vendors...</p>;
  }

  if (!assignments || assignments.length === 0) {
    return <p className="text-sm text-gray-500">No vendors assigned to this event yet.</p>;
  }

  return (
    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
      {assignments.map((assignment) => {
        const serviceType = assignment.serviceType as VendorServiceType;
        return (
          <li key={assignment.id} className="p-4 flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-gray-900">{assignment.companyName}</h4>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${vendorServiceTypeBadgeClasses[serviceType]}`}
                >
                  {vendorServiceTypeLabels[serviceType]}
                </span>
              </div>
              {assignment.role && <p className="text-sm text-gray-700 mt-1">{assignment.role}</p>}
              <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4">
                <span>Cost: {formatCost(assignment.cost)}</span>
                {assignment.contactName && <span>{assignment.contactName}</span>}
                {assignment.email && <span>{assignment.email}</span>}
                {assignment.phone && <span>{assignment.phone}</span>}
              </div>
              {assignment.notes && (
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{assignment.notes}</p>
              )}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Unassign ${assignment.companyName} from this event?`)) {
                    unassignMutation.mutate({
                      eventId,
                      vendorId: assignment.vendorId,
                    });
                  }
                }}
                disabled={unassignMutation.isPending}
                className="text-sm text-red-600 hover:text-red-800 transition disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
