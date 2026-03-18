'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';

type DocumentType = 'contract' | 'menu' | 'floor_plan' | 'permit' | 'photo';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('upload-doc-title');

  useFocusTrap(dialogRef, { isOpen: true, onClose });

  const utils = trpc.useUtils();
  const createUploadUrl = trpc.document.createUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  function validateFile(f: File): string | null {
    if (f.size > MAX_FILE_SIZE) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      return 'Unsupported file type. Please upload PDF, JPEG, PNG, WebP, Word, or Excel files.';
    }
    return null;
  }

  function handleFileSelect(f: File) {
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFile(f);
    if (!name) {
      setName(f.name.replace(/\.[^.]+$/, ''));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
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
        headers: {
          'Content-Type': file.type,
        },
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

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          {/* Drag and drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : file
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setName('');
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg
                  className="mx-auto h-10 w-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm text-gray-600">
                  Drag and drop a file here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-400">PDF, images, Word, Excel up to 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              accept={ALLOWED_MIME_TYPES.join(',')}
              className="hidden"
            />
          </div>

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

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

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
