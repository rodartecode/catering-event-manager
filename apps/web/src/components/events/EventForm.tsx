'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useFormDirty } from '@/hooks/use-form-dirty';
import { type RouterOutput, trpc } from '@/lib/trpc';
import { EventFormFields } from './EventFormFields';

// Form validation schema
const eventFormSchema = z.object({
  clientId: z.number({ error: 'Client is required' }).positive('Client is required'),
  eventName: z
    .string()
    .min(1, 'Event name is required')
    .max(255, 'Event name must be less than 255 characters'),
  eventDate: z.coerce.date({
    error: 'Event date is required',
  }),
  location: z.string().max(500, 'Location must be less than 500 characters').optional(),
  estimatedAttendees: z
    .number()
    .positive('Must be a positive number')
    .optional()
    .or(z.literal(undefined)),
  notes: z.string().optional(),
  templateId: z.number().positive().optional(),
  venueId: z.number().positive().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  onSuccess: (event: RouterOutput['event']['create']) => void;
  onCancel: () => void;
}

const initialFormData: Partial<EventFormData> = {
  eventName: '',
  location: '',
  notes: '',
};

export function EventForm({ onSuccess, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState<Partial<EventFormData>>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track unsaved changes
  const { markClean } = useFormDirty({
    initialValues: initialFormData,
    currentValues: formData,
  });

  // Fetch clients for selection
  const { data: clientsList, isLoading: clientsLoading } = trpc.clients.list.useQuery();

  // Fetch templates for selection
  const { data: templatesList, isLoading: templatesLoading } = trpc.template.list.useQuery();

  const createEventMutation = trpc.event.create.useMutation({
    onSuccess: (data) => {
      markClean();
      toast.success('Event created successfully');
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
      const validatedData = eventFormSchema.parse({
        ...formData,
        estimatedAttendees: formData.estimatedAttendees
          ? Number(formData.estimatedAttendees)
          : undefined,
        templateId: formData.templateId ? Number(formData.templateId) : undefined,
        venueId: formData.venueId ? Number(formData.venueId) : undefined,
      });

      createEventMutation.mutate(validatedData);
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

  const updateField = (field: keyof EventFormData, value: EventFormData[keyof EventFormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
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
      <EventFormFields
        formData={formData as Record<string, unknown>}
        errors={errors}
        clientsList={clientsList}
        clientsLoading={clientsLoading}
        templatesList={templatesList}
        templatesLoading={templatesLoading}
        onFieldChange={(field, value) =>
          updateField(field as keyof EventFormData, value as EventFormData[keyof EventFormData])
        }
      />

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
          disabled={createEventMutation.isPending || clientsList?.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}
