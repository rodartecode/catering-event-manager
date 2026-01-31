'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';

const resourceFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Resource name is required')
    .max(255, 'Resource name must be less than 255 characters'),
  type: z.enum(['staff', 'equipment', 'materials'], {
    error: 'Resource type is required',
  }),
  hourlyRate: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      'Hourly rate must be a valid number'
    ),
  notes: z.string().optional(),
});

type ResourceFormData = z.infer<typeof resourceFormSchema>;

interface ResourceFormProps {
  onSuccess: (resource: any) => void;
  onCancel: () => void;
}

export function ResourceForm({ onSuccess, onCancel }: ResourceFormProps) {
  const [formData, setFormData] = useState<Partial<ResourceFormData>>({
    name: '',
    type: undefined,
    hourlyRate: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createResourceMutation = trpc.resource.create.useMutation({
    onSuccess: (data) => {
      toast.success('Resource created successfully');
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
      const validatedData = resourceFormSchema.parse(formData);
      createResourceMutation.mutate({
        name: validatedData.name,
        type: validatedData.type,
        hourlyRate: validatedData.hourlyRate || undefined,
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

  const updateField = (field: keyof ResourceFormData, value: any) => {
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
      {/* Resource Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Resource Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., John Smith, Chafing Dish Set, Tablecloths"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Resource Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Resource Type <span className="text-red-500">*</span>
        </label>
        <select
          id="type"
          value={formData.type || ''}
          onChange={(e) => updateField('type', e.target.value as ResourceFormData['type'])}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.type ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a type...</option>
          <option value="staff">Staff</option>
          <option value="equipment">Equipment</option>
          <option value="materials">Materials</option>
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
      </div>

      {/* Hourly Rate */}
      <div>
        <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-2">
          Hourly Rate
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
          <input
            id="hourlyRate"
            type="text"
            inputMode="decimal"
            value={formData.hourlyRate || ''}
            onChange={(e) => updateField('hourlyRate', e.target.value)}
            placeholder="0.00"
            className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.hourlyRate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        {errors.hourlyRate && <p className="mt-1 text-sm text-red-600">{errors.hourlyRate}</p>}
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
          placeholder="Any additional details about this resource..."
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
          disabled={createResourceMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createResourceMutation.isPending ? 'Creating...' : 'Create Resource'}
        </button>
      </div>
    </form>
  );
}
