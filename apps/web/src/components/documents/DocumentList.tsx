'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { trpc } from '@/lib/trpc';
import { DocumentTypeBadge } from './DocumentTypeBadge';
import { UploadDocumentDialog } from './UploadDocumentDialog';

interface DocumentListProps {
  eventId: number;
  isAdmin: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ eventId, isAdmin }: DocumentListProps) {
  const utils = trpc.useUtils();
  const [showUpload, setShowUpload] = useState(false);

  const { data: documents, isLoading } = trpc.document.listByEvent.useQuery({ eventId });

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      utils.document.listByEvent.invalidate({ eventId });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleSharingMutation = trpc.document.toggleSharing.useMutation({
    onSuccess: (data) => {
      utils.document.listByEvent.invalidate({ eventId });
      toast.success(data.sharedWithClient ? 'Shared with client' : 'Unshared from client');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function handleDownload(docId: number) {
    try {
      const result = await utils.document.getDownloadUrl.fetch({ id: docId });
      window.open(result.url, '_blank');
    } catch {
      toast.error('Failed to get download URL');
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Upload Document
        </button>
      )}

      {showUpload && (
        <UploadDocumentDialog eventId={eventId} onClose={() => setShowUpload(false)} />
      )}

      {!documents || documents.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No documents uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-500">Name</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Type</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Size</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Date</th>
                {isAdmin && (
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Shared</th>
                )}
                <th className="text-right py-2 px-2 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-900">{doc.name}</td>
                  <td className="py-2 px-2">
                    <DocumentTypeBadge type={doc.type} />
                  </td>
                  <td className="py-2 px-2 text-gray-600">{formatFileSize(doc.fileSize)}</td>
                  <td className="py-2 px-2 text-gray-600">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => toggleSharingMutation.mutate({ id: doc.id })}
                        disabled={toggleSharingMutation.isPending}
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          doc.sharedWithClient
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {doc.sharedWithClient ? 'Shared' : 'Private'}
                      </button>
                    </td>
                  )}
                  <td className="py-2 px-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Download
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this document?')) {
                              deleteMutation.mutate({ id: doc.id });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
