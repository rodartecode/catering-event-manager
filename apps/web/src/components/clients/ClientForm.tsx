'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useFormDirty } from '@/hooks/use-form-dirty';
import { trpc } from '@/lib/trpc';

const clientFormSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(255, 'Company name must be less than 255 characters'),
  contactName: z
    .string()
    .min(1, 'Contact name is required')
    .max(255, 'Contact name must be less than 255 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string().max(50, 'Phone must be less than 50 characters').optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  onSuccess: (client: { id: number }) => void;
  onCancel: () => void;
}

const initialFormData: Partial<ClientFormData> = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

export function ClientForm({ onSuccess, onCancel }: ClientFormProps) {
  const [formData, setFormData] = useState<Partial<ClientFormData>>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track unsaved changes
  const { markClean } = useFormDirty({
    initialValues: initialFormData,
    currentValues: formData,
  });

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      markClean();
      toast.success('Client created successfully');
      onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.message);
      setErrors({ submit: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = clientFormSchema.parse(formData);
      createClientMutation.mutate({
        companyName: validatedData.companyName,
        contactName: validatedData.contactName,
        email: validatedData.email,
        phone: validatedData.phone || undefined,
        address: validatedData.address || undefined,
        notes: validatedData.notes || undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const updateField = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          id="companyName"
          type="text"
          value={formData.companyName || ''}
          onChange={(e) => updateField('companyName', e.target.value)}
          placeholder="e.g., Acme Corporation"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.companyName ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
      </div>

      {/* Contact Name */}
      <div>
        <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
          Contact Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contactName"
          type="text"
          value={formData.contactName || ''}
          onChange={(e) => updateField('contactName', e.target.value)}
          placeholder="e.g., John Smith"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.contactName ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.contactName && <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="e.g., john@acme.com"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="e.g., (555) 123-4567"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Address
        </label>
        <textarea
          id="address"
          rows={2}
          value={formData.address || ''}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="e.g., 123 Main St, Suite 100, New York, NY 10001"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.address ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={formData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Any additional details about this client..."
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.notes ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Actions */}
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
          disabled={createClientMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
        </button>
      </div>
    </form>
  );
}
