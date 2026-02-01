'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { getInputA11yProps, getErrorProps } from '@/lib/form-a11y';
import { useFormDirty } from '@/hooks/use-form-dirty';

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
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  onSuccess: (event: any) => void;
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

  const updateField = (field: keyof EventFormData, value: any) => {
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
      {/* Client Selection */}
      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
          Client <span className="text-red-500" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <select
          id="clientId"
          required
          aria-required="true"
          {...getInputA11yProps('clientId', !!errors.clientId)}
          value={formData.clientId || ''}
          onChange={(e) => updateField('clientId', Number(e.target.value))}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.clientId ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={clientsLoading}
        >
          <option value="">Select a client...</option>
          {clientsList?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName} - {client.contactName}
            </option>
          ))}
        </select>
        {errors.clientId && (
          <p {...getErrorProps('clientId')} className="mt-1 text-sm text-red-600">
            {errors.clientId}
          </p>
        )}
        {clientsList?.length === 0 && !clientsLoading && (
          <p className="mt-1 text-sm text-yellow-600">
            No clients available. You&apos;ll need to create a client first.
          </p>
        )}
      </div>

      {/* Event Name */}
      <div>
        <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-2">
          Event Name <span className="text-red-500" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="eventName"
          type="text"
          required
          aria-required="true"
          {...getInputA11yProps('eventName', !!errors.eventName)}
          value={formData.eventName || ''}
          onChange={(e) => updateField('eventName', e.target.value)}
          placeholder="e.g., Annual Company Gala"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.eventName ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.eventName && (
          <p {...getErrorProps('eventName')} className="mt-1 text-sm text-red-600">
            {errors.eventName}
          </p>
        )}
      </div>

      {/* Event Date */}
      <div>
        <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-2">
          Event Date <span className="text-red-500" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="eventDate"
          type="date"
          required
          aria-required="true"
          {...getInputA11yProps('eventDate', !!errors.eventDate)}
          value={
            formData.eventDate
              ? new Date(formData.eventDate).toISOString().split('T')[0]
              : ''
          }
          onChange={(e) => updateField('eventDate', e.target.value ? new Date(e.target.value) : undefined)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.eventDate ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.eventDate && (
          <p {...getErrorProps('eventDate')} className="mt-1 text-sm text-red-600">
            {errors.eventDate}
          </p>
        )}
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <input
          id="location"
          type="text"
          {...getInputA11yProps('location', !!errors.location)}
          value={formData.location || ''}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="e.g., Grand Ballroom, 123 Main St"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.location ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.location && (
          <p {...getErrorProps('location')} className="mt-1 text-sm text-red-600">
            {errors.location}
          </p>
        )}
      </div>

      {/* Estimated Attendees */}
      <div>
        <label
          htmlFor="estimatedAttendees"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Estimated Attendees
        </label>
        <input
          id="estimatedAttendees"
          type="number"
          min="1"
          {...getInputA11yProps('estimatedAttendees', !!errors.estimatedAttendees)}
          value={formData.estimatedAttendees || ''}
          onChange={(e) =>
            updateField('estimatedAttendees', e.target.value ? Number(e.target.value) : undefined)
          }
          placeholder="e.g., 150"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.estimatedAttendees ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.estimatedAttendees && (
          <p {...getErrorProps('estimatedAttendees')} className="mt-1 text-sm text-red-600">
            {errors.estimatedAttendees}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          {...getInputA11yProps('notes', !!errors.notes)}
          value={formData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Any additional notes or special requirements..."
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.notes ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.notes && (
          <p {...getErrorProps('notes')} className="mt-1 text-sm text-red-600">
            {errors.notes}
          </p>
        )}
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
          disabled={createEventMutation.isPending || clientsList?.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}
