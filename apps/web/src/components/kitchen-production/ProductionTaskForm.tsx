'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';

const prepTypes = [
  'marinate',
  'bake',
  'grill',
  'plate',
  'chop',
  'mix',
  'chill',
  'fry',
  'assemble',
  'garnish',
] as const;

const prepTypeLabels: Record<(typeof prepTypes)[number], string> = {
  marinate: 'Marinate',
  bake: 'Bake',
  grill: 'Grill',
  plate: 'Plate',
  chop: 'Chop',
  mix: 'Mix',
  chill: 'Chill',
  fry: 'Fry',
  assemble: 'Assemble',
  garnish: 'Garnish',
};

const formSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(255),
  prepType: z.enum(prepTypes),
  durationMinutes: z.string().min(1, 'Duration is required'),
  offsetHours: z.string().min(1, 'Offset is required'),
  stationId: z.string().optional(),
  servings: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProductionTaskFormProps {
  eventId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const initialFormData: FormData = {
  name: '',
  prepType: 'chop',
  durationMinutes: '30',
  offsetHours: '4',
  stationId: '',
  servings: '',
  notes: '',
};

export function ProductionTaskForm({ eventId, onSuccess, onCancel }: ProductionTaskFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: stations } = trpc.kitchenProduction.station.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.kitchenProduction.task.create.useMutation({
    onSuccess: () => {
      utils.kitchenProduction.timeline.getByEvent.invalidate({ eventId });
      utils.kitchenProduction.task.list.invalidate({ eventId });
      toast.success('Production task created');
      onSuccess();
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
      const validated = formSchema.parse(formData);
      const duration = parseInt(validated.durationMinutes, 10);
      const offsetHours = parseFloat(validated.offsetHours);

      if (Number.isNaN(duration) || duration < 1) {
        setErrors({ durationMinutes: 'Duration must be at least 1 minute' });
        return;
      }

      if (Number.isNaN(offsetHours) || offsetHours < 0) {
        setErrors({ offsetHours: 'Offset must be a positive number' });
        return;
      }

      createMutation.mutate({
        eventId,
        name: validated.name,
        prepType: validated.prepType,
        durationMinutes: duration,
        offsetMinutes: Math.round(-offsetHours * 60),
        stationId: validated.stationId ? parseInt(validated.stationId, 10) : undefined,
        servings: validated.servings ? parseInt(validated.servings, 10) : undefined,
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

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Task Name */}
      <div>
        <label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-1">
          Task Name <span className="text-red-500">*</span>
        </label>
        <input
          id="taskName"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Marinate chicken thighs"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Prep Type */}
        <div>
          <label htmlFor="prepType" className="block text-sm font-medium text-gray-700 mb-1">
            Prep Type <span className="text-red-500">*</span>
          </label>
          <select
            id="prepType"
            value={formData.prepType}
            onChange={(e) => updateField('prepType', e.target.value as FormData['prepType'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {prepTypes.map((type) => (
              <option key={type} value={type}>
                {prepTypeLabels[type]}
              </option>
            ))}
          </select>
        </div>

        {/* Station */}
        <div>
          <label htmlFor="stationId" className="block text-sm font-medium text-gray-700 mb-1">
            Station
          </label>
          <select
            id="stationId"
            value={formData.stationId}
            onChange={(e) => updateField('stationId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Unassigned</option>
            {stations?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Duration */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duration (min) <span className="text-red-500">*</span>
          </label>
          <input
            id="duration"
            type="number"
            min="1"
            value={formData.durationMinutes}
            onChange={(e) => updateField('durationMinutes', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.durationMinutes ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.durationMinutes && (
            <p className="mt-1 text-sm text-red-600">{errors.durationMinutes}</p>
          )}
        </div>

        {/* Hours Before Event */}
        <div>
          <label htmlFor="offsetHours" className="block text-sm font-medium text-gray-700 mb-1">
            Hours before <span className="text-red-500">*</span>
          </label>
          <input
            id="offsetHours"
            type="number"
            min="0"
            step="0.5"
            value={formData.offsetHours}
            onChange={(e) => updateField('offsetHours', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.offsetHours ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.offsetHours && <p className="mt-1 text-sm text-red-600">{errors.offsetHours}</p>}
        </div>

        {/* Servings */}
        <div>
          <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-1">
            Servings
          </label>
          <input
            id="servings"
            type="number"
            min="1"
            value={formData.servings}
            onChange={(e) => updateField('servings', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="taskNotes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="taskNotes"
          rows={2}
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Additional instructions..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errors.submit && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}
