'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useFormDirty } from '@/hooks/use-form-dirty';
import { trpc } from '@/lib/trpc';

const stationTypes = [
  'oven',
  'grill',
  'prep_counter',
  'cold_storage',
  'stovetop',
  'fryer',
  'mixer',
] as const;

const stationTypeLabels: Record<(typeof stationTypes)[number], string> = {
  oven: 'Oven',
  grill: 'Grill',
  prep_counter: 'Prep Counter',
  cold_storage: 'Cold Storage',
  stovetop: 'Stovetop',
  fryer: 'Fryer',
  mixer: 'Mixer',
};

const stationFormSchema = z.object({
  name: z.string().min(1, 'Station name is required').max(255),
  type: z.enum(stationTypes),
  capacity: z.string().min(1, 'Capacity is required'),
  venueId: z.string().optional(),
  notes: z.string().optional(),
});

type StationFormData = z.infer<typeof stationFormSchema>;

interface StationFormProps {
  onSuccess: (station: { id: number }) => void;
  onCancel: () => void;
}

const initialFormData: StationFormData = {
  name: '',
  type: 'oven',
  capacity: '1',
  venueId: '',
  notes: '',
};

export function StationForm({ onSuccess, onCancel }: StationFormProps) {
  const [formData, setFormData] = useState<StationFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { markClean } = useFormDirty({
    initialValues: initialFormData,
    currentValues: formData,
  });

  const { data: venues } = trpc.venue.list.useQuery();

  const createMutation = trpc.kitchenProduction.station.create.useMutation({
    onSuccess: (data) => {
      markClean();
      toast.success('Kitchen station created');
      onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.message);
      setErrors({ submit: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = stationFormSchema.parse(formData);
      const capacity = parseInt(validated.capacity, 10);

      if (Number.isNaN(capacity) || capacity < 1) {
        setErrors({ capacity: 'Capacity must be at least 1' });
        return;
      }

      createMutation.mutate({
        name: validated.name,
        type: validated.type,
        capacity,
        venueId: validated.venueId ? parseInt(validated.venueId, 10) : undefined,
        notes: validated.notes || undefined,
      });
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

  const updateField = <K extends keyof StationFormData>(field: K, value: StationFormData[K]) => {
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
      {/* Station Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Station Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Main Oven, Prep Station A"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Station Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Station Type <span className="text-red-500">*</span>
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => updateField('type', e.target.value as StationFormData['type'])}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {stationTypes.map((type) => (
            <option key={type} value={type}>
              {stationTypeLabels[type]}
            </option>
          ))}
        </select>
      </div>

      {/* Capacity */}
      <div>
        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
          Concurrent Capacity <span className="text-red-500">*</span>
        </label>
        <input
          id="capacity"
          type="number"
          min="1"
          value={formData.capacity}
          onChange={(e) => updateField('capacity', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.capacity ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <p className="mt-1 text-xs text-gray-500">
          How many tasks can run on this station at the same time
        </p>
        {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
      </div>

      {/* Venue */}
      <div>
        <label htmlFor="venueId" className="block text-sm font-medium text-gray-700 mb-2">
          Venue (optional)
        </label>
        <select
          id="venueId"
          value={formData.venueId}
          onChange={(e) => updateField('venueId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No venue (portable/shared)</option>
          {venues?.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Any additional details about this station..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
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
          disabled={createMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Station'}
        </button>
      </div>
    </form>
  );
}
