'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useFormDirty } from '@/hooks/use-form-dirty';
import { trpc } from '@/lib/trpc';

const kitchenTypes = ['full', 'prep_only', 'warming_only', 'none'] as const;

const kitchenTypeLabels: Record<(typeof kitchenTypes)[number], string> = {
  full: 'Full Kitchen',
  prep_only: 'Prep Only',
  warming_only: 'Warming Only',
  none: 'None',
};

const venueFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Venue name is required')
    .max(255, 'Venue name must be less than 255 characters'),
  address: z.string().min(1, 'Address is required'),
  capacity: z.string().optional(),
  hasKitchen: z.boolean(),
  kitchenType: z.enum(kitchenTypes).optional(),
  equipmentAvailable: z.string().optional(),
  parkingNotes: z.string().optional(),
  loadInNotes: z.string().optional(),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type VenueFormData = z.infer<typeof venueFormSchema>;

interface VenueFormProps {
  onSuccess: (venue: { id: number }) => void;
  onCancel: () => void;
}

const initialFormData: VenueFormData = {
  name: '',
  address: '',
  capacity: '',
  hasKitchen: false,
  kitchenType: undefined,
  equipmentAvailable: '',
  parkingNotes: '',
  loadInNotes: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

export function VenueForm({ onSuccess, onCancel }: VenueFormProps) {
  const [formData, setFormData] = useState<VenueFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { markClean } = useFormDirty({
    initialValues: initialFormData,
    currentValues: formData,
  });

  const createVenueMutation = trpc.venue.create.useMutation({
    onSuccess: (data) => {
      markClean();
      toast.success('Venue created successfully');
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
      const validated = venueFormSchema.parse(formData);
      const capacity = validated.capacity ? parseInt(validated.capacity, 10) : undefined;

      if (
        validated.capacity &&
        (Number.isNaN(capacity) || (capacity !== undefined && capacity < 1))
      ) {
        setErrors({ capacity: 'Capacity must be a positive number' });
        return;
      }

      const equipment = validated.equipmentAvailable
        ? validated.equipmentAvailable
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      createVenueMutation.mutate({
        name: validated.name,
        address: validated.address,
        capacity: capacity || undefined,
        hasKitchen: validated.hasKitchen,
        kitchenType: validated.hasKitchen ? validated.kitchenType : undefined,
        equipmentAvailable: equipment,
        parkingNotes: validated.parkingNotes || undefined,
        loadInNotes: validated.loadInNotes || undefined,
        contactName: validated.contactName || undefined,
        contactPhone: validated.contactPhone || undefined,
        contactEmail: validated.contactEmail || undefined,
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

  const updateField = <K extends keyof VenueFormData>(field: K, value: VenueFormData[K]) => {
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
      {/* Venue Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Venue Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Grand Ballroom at The Ritz"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          id="address"
          rows={2}
          value={formData.address}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="e.g., 123 Main St, Suite 100, New York, NY 10001"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.address ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
      </div>

      {/* Capacity */}
      <div>
        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
          Capacity
        </label>
        <input
          id="capacity"
          type="number"
          min="1"
          value={formData.capacity}
          onChange={(e) => updateField('capacity', e.target.value)}
          placeholder="e.g., 200"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.capacity ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
      </div>

      {/* Kitchen */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">Kitchen Facilities</legend>
        <div className="flex items-center gap-2">
          <input
            id="hasKitchen"
            type="checkbox"
            checked={formData.hasKitchen}
            onChange={(e) => {
              updateField('hasKitchen', e.target.checked);
              if (!e.target.checked) {
                updateField('kitchenType', undefined);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="hasKitchen" className="text-sm text-gray-700">
            Venue has kitchen facilities
          </label>
        </div>

        {formData.hasKitchen && (
          <div>
            <label htmlFor="kitchenType" className="block text-sm font-medium text-gray-700 mb-2">
              Kitchen Type
            </label>
            <select
              id="kitchenType"
              value={formData.kitchenType || ''}
              onChange={(e) =>
                updateField(
                  'kitchenType',
                  (e.target.value || undefined) as VenueFormData['kitchenType']
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select kitchen type</option>
              {kitchenTypes.map((type) => (
                <option key={type} value={type}>
                  {kitchenTypeLabels[type]}
                </option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      {/* Equipment Available */}
      <div>
        <label
          htmlFor="equipmentAvailable"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Equipment Available
        </label>
        <input
          id="equipmentAvailable"
          type="text"
          value={formData.equipmentAvailable}
          onChange={(e) => updateField('equipmentAvailable', e.target.value)}
          placeholder="e.g., oven, grill, refrigerator, dishwasher"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Separate items with commas</p>
      </div>

      {/* Logistics */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">Logistics Notes</legend>

        <div>
          <label htmlFor="parkingNotes" className="block text-sm font-medium text-gray-700 mb-2">
            Parking Notes
          </label>
          <textarea
            id="parkingNotes"
            rows={2}
            value={formData.parkingNotes}
            onChange={(e) => updateField('parkingNotes', e.target.value)}
            placeholder="e.g., Loading zone on north side, 2-hour parking on Main St"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="loadInNotes" className="block text-sm font-medium text-gray-700 mb-2">
            Load-In Notes
          </label>
          <textarea
            id="loadInNotes"
            rows={2}
            value={formData.loadInNotes}
            onChange={(e) => updateField('loadInNotes', e.target.value)}
            placeholder="e.g., Service entrance on east side, freight elevator available"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </fieldset>

      {/* Contact Info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-700">Venue Contact</legend>

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
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Phone
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
              placeholder="e.g., (555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="e.g., events@venue.com"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.contactEmail ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.contactEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>
            )}
          </div>
        </div>
      </fieldset>

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
          placeholder="Any additional details about this venue..."
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
          disabled={createVenueMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createVenueMutation.isPending ? 'Creating...' : 'Create Venue'}
        </button>
      </div>
    </form>
  );
}
