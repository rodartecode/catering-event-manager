import { getErrorProps, getInputA11yProps } from '@/lib/form-a11y';

export interface EventFormFieldsProps {
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  clientsList: { id: number; companyName: string; contactName: string }[] | undefined;
  clientsLoading: boolean;
  templatesList: { id: number; name: string; itemCount: number }[] | undefined;
  templatesLoading: boolean;
  onFieldChange: (field: string, value: unknown) => void;
}

const LABEL = 'block text-sm font-medium text-gray-700 mb-2';
const ERROR = 'mt-1 text-sm text-red-600';

function RequiredMark() {
  return (
    <>
      {' '}
      <span className="text-red-500" aria-hidden="true">
        *
      </span>
      <span className="sr-only">(required)</span>
    </>
  );
}

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  if (!errors[field]) return null;
  return (
    <p {...getErrorProps(field)} className={ERROR}>
      {errors[field]}
    </p>
  );
}

export function EventFormFields({
  formData,
  errors,
  clientsList,
  clientsLoading,
  templatesList,
  templatesLoading,
  onFieldChange,
}: EventFormFieldsProps) {
  const inputClass = (field: string) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      errors[field] ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <>
      {/* Client Selection */}
      <div>
        <label htmlFor="clientId" className={LABEL}>
          Client
          <RequiredMark />
        </label>
        <select
          id="clientId"
          required
          aria-required="true"
          {...getInputA11yProps('clientId', !!errors.clientId)}
          value={(formData.clientId as number) || ''}
          onChange={(e) => onFieldChange('clientId', Number(e.target.value))}
          className={inputClass('clientId')}
          disabled={clientsLoading}
        >
          <option value="">Select a client...</option>
          {clientsList?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName} - {client.contactName}
            </option>
          ))}
        </select>
        <FieldError field="clientId" errors={errors} />
        {clientsList?.length === 0 && !clientsLoading && (
          <p className="mt-1 text-sm text-yellow-600">
            No clients available. You&apos;ll need to create a client first.
          </p>
        )}
      </div>
      {/* Task Template Selection */}
      <div>
        <label htmlFor="templateId" className={LABEL}>
          Task Template
          <span className="text-gray-400 text-xs ml-2">(optional)</span>
        </label>
        <select
          id="templateId"
          {...getInputA11yProps('templateId', !!errors.templateId)}
          value={(formData.templateId as number) || ''}
          onChange={(e) =>
            onFieldChange('templateId', e.target.value ? Number(e.target.value) : undefined)
          }
          className={inputClass('templateId')}
          disabled={templatesLoading}
        >
          <option value="">None - start with no tasks</option>
          {templatesList?.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.itemCount} tasks)
            </option>
          ))}
        </select>
        <FieldError field="templateId" errors={errors} />
        <p className="mt-1 text-xs text-gray-500">
          Select a template to auto-generate tasks with due dates based on the event date.
        </p>
      </div>
      {/* Event Name */}
      <div>
        <label htmlFor="eventName" className={LABEL}>
          Event Name
          <RequiredMark />
        </label>
        <input
          id="eventName"
          type="text"
          required
          aria-required="true"
          {...getInputA11yProps('eventName', !!errors.eventName)}
          value={(formData.eventName as string) || ''}
          onChange={(e) => onFieldChange('eventName', e.target.value)}
          placeholder="e.g., Annual Company Gala"
          className={inputClass('eventName')}
        />
        <FieldError field="eventName" errors={errors} />
      </div>
      {/* Event Date */}
      <div>
        <label htmlFor="eventDate" className={LABEL}>
          Event Date
          <RequiredMark />
        </label>
        <input
          id="eventDate"
          type="date"
          required
          {...getInputA11yProps('eventDate', !!errors.eventDate)}
          value={
            formData.eventDate
              ? new Date(formData.eventDate as string | Date).toISOString().split('T')[0]
              : ''
          }
          onChange={(e) =>
            onFieldChange('eventDate', e.target.value ? new Date(e.target.value) : undefined)
          }
          className={inputClass('eventDate')}
        />
        <FieldError field="eventDate" errors={errors} />
      </div>
      {/* Location */}
      <div>
        <label htmlFor="location" className={LABEL}>
          Location
        </label>
        <input
          id="location"
          type="text"
          {...getInputA11yProps('location', !!errors.location)}
          value={(formData.location as string) || ''}
          onChange={(e) => onFieldChange('location', e.target.value)}
          placeholder="e.g., Grand Ballroom, 123 Main St"
          className={inputClass('location')}
        />
        <FieldError field="location" errors={errors} />
      </div>
      {/* Estimated Attendees */}
      <div>
        <label htmlFor="estimatedAttendees" className={LABEL}>
          Estimated Attendees
        </label>
        <input
          id="estimatedAttendees"
          type="number"
          min="1"
          {...getInputA11yProps('estimatedAttendees', !!errors.estimatedAttendees)}
          value={(formData.estimatedAttendees as number) || ''}
          onChange={(e) =>
            onFieldChange('estimatedAttendees', e.target.value ? Number(e.target.value) : undefined)
          }
          placeholder="e.g., 150"
          className={inputClass('estimatedAttendees')}
        />
        <FieldError field="estimatedAttendees" errors={errors} />
      </div>
      {/* Notes */}
      <div>
        <label htmlFor="notes" className={LABEL}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          {...getInputA11yProps('notes', !!errors.notes)}
          value={(formData.notes as string) || ''}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          placeholder="Any additional notes or special requirements..."
          className={inputClass('notes')}
        />
        <FieldError field="notes" errors={errors} />
      </div>
    </>
  );
}
