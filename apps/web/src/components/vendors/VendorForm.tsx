'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useFormDirty } from '@/hooks/use-form-dirty';
import { trpc } from '@/lib/trpc';
import {
  type VendorServiceType,
  vendorServiceTypeLabels,
  vendorServiceTypes,
} from './service-types';

const vendorFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(255),
  contactName: z.string().max(255).optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  serviceType: z.enum(vendorServiceTypes),
  notes: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorFormSchema>;

interface VendorFormProps {
  initialData?: {
    id: number;
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    serviceType: VendorServiceType;
    notes: string | null;
    isActive: boolean;
  };
  onSuccess: (vendor: { id: number }) => void;
  onCancel: () => void;
}

const blankFormData: VendorFormData = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  serviceType: 'other',
  notes: '',
};

export function VendorForm({ initialData, onSuccess, onCancel }: VendorFormProps) {
  const isEdit = Boolean(initialData);
  const initialFormData: VendorFormData = initialData
    ? {
        companyName: initialData.companyName,
        contactName: initialData.contactName ?? '',
        email: initialData.email ?? '',
        phone: initialData.phone ?? '',
        serviceType: initialData.serviceType,
        notes: initialData.notes ?? '',
      }
    : blankFormData;

  const [formData, setFormData] = useState<VendorFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { markClean } = useFormDirty({
    initialValues: initialFormData,
    currentValues: formData,
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.vendor.create.useMutation({
    onSuccess: (data) => {
      markClean();
      utils.vendor.list.invalidate();
      toast.success('Vendor created successfully');
      onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.message);
      setErrors({ submit: error.message });
    },
  });

  const updateMutation = trpc.vendor.update.useMutation({
    onSuccess: (data) => {
      markClean();
      utils.vendor.list.invalidate();
      utils.vendor.getById.invalidate({ id: data.id });
      toast.success('Vendor updated successfully');
      onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.message);
      setErrors({ submit: error.message });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = vendorFormSchema.parse(formData);
      const payload = {
        companyName: validated.companyName,
        contactName: validated.contactName || undefined,
        email: validated.email || undefined,
        phone: validated.phone || undefined,
        serviceType: validated.serviceType,
        notes: validated.notes || undefined,
      };

      if (isEdit && initialData) {
        updateMutation.mutate({ id: initialData.id, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const err of error.issues) {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        }
        setErrors(fieldErrors);
      }
    }
  };

  const updateField = <K extends keyof VendorFormData>(field: K, value: VendorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          id="companyName"
          type="text"
          value={formData.companyName}
          onChange={(e) => updateField('companyName', e.target.value)}
          placeholder="e.g., Bloom & Stem Florals"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.companyName ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
      </div>

      <div>
        <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-2">
          Service Type <span className="text-red-500">*</span>
        </label>
        <select
          id="serviceType"
          value={formData.serviceType}
          onChange={(e) => updateField('serviceType', e.target.value as VendorServiceType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {vendorServiceTypes.map((type) => (
            <option key={type} value={type}>
              {vendorServiceTypeLabels[type]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">Contact Information</legend>

        <div>
          <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
            Contact Name
          </label>
          <input
            id="contactName"
            type="text"
            value={formData.contactName}
            onChange={(e) => updateField('contactName', e.target.value)}
            placeholder="e.g., Jane Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="e.g., contact@vendor.com"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="e.g., (555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Additional details about this vendor..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errors.submit && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Vendor'}
        </button>
      </div>
    </form>
  );
}
