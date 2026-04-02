'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';
import { FileUploadZone } from './FileUploadZone';

type DocumentType = 'contract' | 'menu' | 'floor_plan' | 'permit' | 'photo';

const typeOptions: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'menu', label: 'Menu' },
  { value: 'floor_plan', label: 'Floor Plan' },
  { value: 'permit', label: 'Permit' },
  { value: 'photo', label: 'Photo' },
];

interface UploadDocumentDialogProps {
  eventId: number;
  onClose: () => void;
}

export function UploadDocumentDialog({ eventId, onClose }: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('contract');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('upload-doc-title');

  useFocusTrap(dialogRef, { isOpen: true, onClose });

  const utils = trpc.useUtils();
  const createUploadUrl = trpc.document.createUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  function handleAutoName(autoName: string) {
    if (!name) {
      setName(autoName);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Step 1: Get presigned URL
      const { signedUrl, storageKey } = await createUploadUrl.mutateAsync({
        eventId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        type,
      });

      // Step 2: Upload file directly to storage
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Step 3: Confirm upload in DB
      await confirmUpload.mutateAsync({
        eventId,
        name: name.trim(),
        type,
        storageKey,
        fileSize: file.size,
        mimeType: file.type,
      });

      toast.success('Document uploaded successfully');
      utils.document.listByEvent.invalidate({ eventId });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
      >
        <div className="flex justify-between items-start mb-6">
          <h3 id={titleId} className="text-xl font-semibold">
            Upload Document
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
          <FileUploadZone
            file={file}
            onFileSelect={setFile}
            onAutoName={handleAutoName}
            error={error}
            onError={setError}
          />

          {/* Document name */}
          <div>
            <label htmlFor="doc-name" className="block text-sm font-medium text-gray-700 mb-1">
              Document Name
            </label>
            <input
              id="doc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Document type */}
          <div>
            <label htmlFor="doc-type" className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              id="doc-type"
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !name.trim() || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
