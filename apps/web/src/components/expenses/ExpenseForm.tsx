'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface ExpenseFormProps {
  eventId: number;
  expense?: {
    id: number;
    category: string;
    description: string;
    amount: string;
    vendor: string | null;
    expenseDate: Date;
    notes: string | null;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const categories = [
  { value: 'labor', label: 'Labor' },
  { value: 'food_supplies', label: 'Food & Supplies' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'venue', label: 'Venue' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'decor', label: 'Decor' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'other', label: 'Other' },
] as const;

type CategoryValue = (typeof categories)[number]['value'];

function formatDateForInput(date: Date): string {
  return new Date(date).toISOString().split('T')[0];
}

export function ExpenseForm({ eventId, expense, onSuccess, onCancel }: ExpenseFormProps) {
  const utils = trpc.useUtils();
  const isEditing = !!expense;

  const [formData, setFormData] = useState({
    category: (expense?.category || 'food_supplies') as CategoryValue,
    description: expense?.description || '',
    amount: expense?.amount || '',
    vendor: expense?.vendor || '',
    expenseDate: expense?.expenseDate
      ? formatDateForInput(expense.expenseDate)
      : formatDateForInput(new Date()),
    notes: expense?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.expense.create.useMutation({
    onSuccess: () => {
      utils.expense.listByEvent.invalidate({ eventId });
      utils.expense.getEventCostSummary.invalidate({ eventId });
      onSuccess();
    },
  });

  const updateMutation = trpc.expense.update.useMutation({
    onSuccess: () => {
      utils.expense.listByEvent.invalidate({ eventId });
      utils.expense.getEventCostSummary.invalidate({ eventId });
      onSuccess();
    },
  });

  const mutation = isEditing ? updateMutation : createMutation;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.amount || !/^\d+(\.\d{1,2})?$/.test(formData.amount)) {
      newErrors.amount = 'Enter a valid amount (e.g. 100.00)';
    }
    if (!formData.expenseDate) {
      newErrors.expenseDate = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing && expense) {
      updateMutation.mutate({
        id: expense.id,
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        vendor: formData.vendor || null,
        expenseDate: new Date(formData.expenseDate),
        notes: formData.notes || null,
      });
    } else {
      createMutation.mutate({
        eventId,
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        vendor: formData.vendor || undefined,
        expenseDate: new Date(formData.expenseDate),
        notes: formData.notes || undefined,
      });
    }
  }

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{mutation.error.message}</p>
        </div>
      )}

      <div>
        <label htmlFor="expense-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="expense-category"
          value={formData.category}
          onChange={(e) => updateField('category', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="expense-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <input
          id="expense-description"
          type="text"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          maxLength={500}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount ($) <span className="text-red-500">*</span>
          </label>
          <input
            id="expense-amount"
            type="text"
            inputMode="decimal"
            value={formData.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            placeholder="0.00"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
        </div>

        <div>
          <label htmlFor="expense-date" className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="expense-date"
            type="date"
            value={formData.expenseDate}
            onChange={(e) => updateField('expenseDate', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.expenseDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.expenseDate && <p className="mt-1 text-sm text-red-600">{errors.expenseDate}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="expense-vendor" className="block text-sm font-medium text-gray-700 mb-1">
          Vendor
        </label>
        <input
          id="expense-vendor"
          type="text"
          value={formData.vendor}
          onChange={(e) => updateField('vendor', e.target.value)}
          maxLength={255}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="expense-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="expense-notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          {mutation.isPending
            ? isEditing
              ? 'Saving...'
              : 'Adding...'
            : isEditing
              ? 'Save Changes'
              : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}
