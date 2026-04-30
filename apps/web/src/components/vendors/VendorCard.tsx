import Link from 'next/link';
import {
  type VendorServiceType,
  vendorServiceTypeBadgeClasses,
  vendorServiceTypeLabels,
} from './service-types';

interface VendorCardProps {
  vendor: {
    id: number;
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    serviceType: VendorServiceType;
  };
  assignedEventCount?: number;
}

export function VendorCard({ vendor, assignedEventCount = 0 }: VendorCardProps) {
  return (
    <Link href={`/vendors/${vendor.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 h-full">
        <div className="flex justify-between items-start mb-3 gap-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
            {vendor.companyName}
          </h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${vendorServiceTypeBadgeClasses[vendor.serviceType]}`}
          >
            {vendorServiceTypeLabels[vendor.serviceType]}
          </span>
        </div>

        <div className="space-y-1 text-sm text-gray-600">
          {vendor.contactName && <div>{vendor.contactName}</div>}
          {vendor.email && <div>{vendor.email}</div>}
          {vendor.phone && <div>{vendor.phone}</div>}
        </div>

        {assignedEventCount > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            {assignedEventCount} assigned event{assignedEventCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  );
}
