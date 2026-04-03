'use client';

import { useRef, useState } from 'react';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';

interface RecordPaymentDialogProps {
  invoiceId: number;
  onClose: () => void;
}

const methods = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
] as const;

type MethodValue = (typeof methods)[number]['value'];

export function RecordPaymentDialog({ invoiceId, onClose }: RecordPaymentDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('record-payment');
  useFocusTrap(containerRef, { isOpen: true, onClose });

  const utils = trpc.useUtils();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<MethodValue>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = trpc.payment.record.useMutation({
    onSuccess: () => {
      utils.payment.listByInvoice.invalidate({ invoiceId });
      utils.invoice.getById.invalidate({ id: invoiceId });
      onClose();
    },
  });

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount)) {
      newErrors.amount = 'Enter a valid amount';
    }
    if (!paymentDate) {
      newErrors.paymentDate = 'Date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      invoiceId,
      amount,
      method,
      paymentDate: new Date(paymentDate),
      reference: reference || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id={titleId} className="text-xl font-semibold">
            Record Payment
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close dialog"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{mutation.error.message}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="payment-amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              id="payment-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as MethodValue)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {methods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment-date" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                errors.paymentDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label
              htmlFor="payment-reference"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reference #
            </label>
            <input
              id="payment-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, transaction ID, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="payment-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {mutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
