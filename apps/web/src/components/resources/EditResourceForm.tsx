'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { z } from 'zod';

const resourceFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Resource name is required')
    .max(255, 'Resource name must be less than 255 characters'),
  type: z.enum(['staff', 'equipment', 'materials'], {
    required_error: 'Resource type is required',
  }),
  hourlyRate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      'Hourly rate must be a valid number'
    ),
  notes: z.string().optional().nullable(),
  isAvailable: z.boolean(),
});

type ResourceFormData = z.infer<typeof resourceFormSchema>;

interface ResourceData {
  id: number;
  name: string;
  type: 'staff' | 'equipment' | 'materials';
  hourlyRate: string | null;
  notes: string | null;
  isAvailable: boolean;
}

interface EditResourceFormProps {
  resource: ResourceData;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditResourceForm({ resource, onSuccess, onCancel }: EditResourceFormProps) {
  const [formData, setFormData] = useState<ResourceFormData>({
    name: resource.name,
    type: resource.type,
    hourlyRate: resource.hourlyRate || '',
    notes: resource.notes || '',
    isAvailable: resource.isAvailable,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const updateResourceMutation = trpc.resource.update.useMutation({
    onSuccess: () => {
      utils.resource.getById.invalidate({ id: resource.id });
      utils.resource.list.invalidate();
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = resourceFormSchema.parse(formData);
      updateResourceMutation.mutate({
        id: resource.id,
        name: validatedData.name,
        type: validatedData.type,
        hourlyRate: validatedData.hourlyRate || null,
        notes: validatedData.notes || null,
        isAvailable: validatedData.isAvailable,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const updateField = <K extends keyof ResourceFormData>(field: K, value: ResourceFormData[K]) => {
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
          value={formData.name}
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
          value={formData.type}
          onChange={(e) => updateField('type', e.target.value as ResourceFormData['type'])}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.type ? 'border-red-500' : 'border-gray-300'
          }`}
        >
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

      {/* Availability */}
      <div className="flex items-center">
        <input
          id="isAvailable"
          type="checkbox"
          checked={formData.isAvailable}
          onChange={(e) => updateField('isAvailable', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-700">
          Available for scheduling
        </label>
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
          disabled={updateResourceMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateResourceMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
