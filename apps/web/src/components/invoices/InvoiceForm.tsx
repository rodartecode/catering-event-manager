'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceFormProps {
  eventId: number;
}

function calcAmount(quantity: string, unitPrice: string): number {
  const q = parseFloat(quantity) || 0;
  const p = parseFloat(unitPrice) || 0;
  return Math.round(q * p * 100) / 100;
}

export function InvoiceForm({ eventId }: InvoiceFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: '1.00', unitPrice: '' },
  ]);
  const [taxRate, setTaxRate] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.invoice.create.useMutation({
    onSuccess: (data) => {
      utils.invoice.listByEvent.invalidate({ eventId });
      router.push(`/events/${eventId}/invoices/${data.id}`);
    },
  });

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', quantity: '1.00', unitPrice: '' }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + calcAmount(item.quantity, item.unitPrice),
    0
  );
  const taxRateNum = parseFloat(taxRate) || 0;
  const taxRateDecimal = taxRateNum / 100;
  const taxAmount = Math.round(subtotal * taxRateDecimal * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    lineItems.forEach((item, i) => {
      if (!item.description.trim()) newErrors[`line_${i}_desc`] = 'Required';
      if (!item.unitPrice || !/^\d+(\.\d{1,2})?$/.test(item.unitPrice))
        newErrors[`line_${i}_price`] = 'Invalid';
      if (!item.quantity || !/^\d+(\.\d{1,2})?$/.test(item.quantity))
        newErrors[`line_${i}_qty`] = 'Invalid';
    });

    if (taxRate && !/^\d+(\.\d{1,2})?$/.test(taxRate)) {
      newErrors.taxRate = 'Invalid tax rate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate({
      eventId,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      taxRate: taxRateDecimal.toFixed(4),
      notes: notes || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {createMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{createMutation.error.message}</p>
        </div>
      )}

      {/* Line Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h3>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                {index === 0 && (
                  <label
                    htmlFor="line-item-description-0"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Description
                  </label>
                )}
                <input
                  id={`line-item-description-${index}`}
                  type="text"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Service description"
                  className={`w-full border rounded px-2 py-1.5 text-sm ${
                    errors[`line_${index}_desc`] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <div className="col-span-2">
                {index === 0 && (
                  <label htmlFor="line-item-qty-0" className="block text-xs text-gray-500 mb-1">
                    Qty
                  </label>
                )}
                <input
                  id={`line-item-qty-${index}`}
                  type="text"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  className={`w-full border rounded px-2 py-1.5 text-sm ${
                    errors[`line_${index}_qty`] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <div className="col-span-2">
                {index === 0 && (
                  <label
                    htmlFor="line-item-unit-price-0"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Unit Price
                  </label>
                )}
                <input
                  id={`line-item-unit-price-${index}`}
                  type="text"
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                  placeholder="0.00"
                  className={`w-full border rounded px-2 py-1.5 text-sm ${
                    errors[`line_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <span className="block text-xs text-gray-500 mb-1">Amount</span>}
                <p className="py-1.5 text-sm text-gray-900 font-medium">
                  ${calcAmount(item.quantity, item.unitPrice).toFixed(2)}
                </p>
              </div>
              <div className="col-span-1">
                {index === 0 && <span className="block text-xs text-gray-500 mb-1">&nbsp;</span>}
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-500 hover:text-red-700 text-sm py-1.5"
                    aria-label={`Remove line item ${index + 1}`}
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLineItem}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
        >
          + Add line item
        </button>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-sm items-center">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Tax Rate (%)</span>
            <input
              type="text"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="0"
              className={`w-16 border rounded px-2 py-1 text-sm text-right ${
                errors.taxRate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>
          <span className="font-medium">${taxAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Additional Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="invoice-due-date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Due Date
          </label>
          <input
            id="invoice-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="invoice-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="invoice-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}
