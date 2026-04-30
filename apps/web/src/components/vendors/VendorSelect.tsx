'use client';

import { trpc } from '@/lib/trpc';
import { type VendorServiceType, vendorServiceTypeLabels } from './service-types';

export interface VendorOption {
  id: number;
  companyName: string;
  serviceType: VendorServiceType;
}

interface VendorSelectProps {
  value: number | null;
  onSelect: (vendor: VendorOption | null) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

export function VendorSelect({
  value,
  onSelect,
  disabled,
  label = 'Vendor',
  placeholder = 'No vendor selected',
}: VendorSelectProps) {
  const { data: vendors, isLoading } = trpc.vendor.list.useQuery();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value, 10) : null;
    if (id && vendors) {
      const v = vendors.find((vendor) => vendor.id === id);
      if (v) {
        onSelect({
          id: v.id,
          companyName: v.companyName,
          serviceType: v.serviceType as VendorServiceType,
        });
        return;
      }
    }
    onSelect(null);
  };

  return (
    <div>
      <label htmlFor="vendorSelect" className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        id="vendorSelect"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {vendors?.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.companyName} —{' '}
            {vendorServiceTypeLabels[vendor.serviceType as VendorServiceType]}
          </option>
        ))}
      </select>
      {isLoading && <p className="mt-1 text-xs text-gray-500">Loading vendors...</p>}
    </div>
  );
}
