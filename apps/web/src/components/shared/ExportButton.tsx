'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { downloadCSVString } from '@/lib/export-utils';

interface ExportButtonProps {
  onExport: () => Promise<{ csv: string; filename: string; rowCount: number }>;
  label?: string;
}

export function ExportButton({ onExport, label = 'Export CSV' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await onExport();
      downloadCSVString(result.csv, result.filename);
      toast.success(`Exported ${result.rowCount} rows`);
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      {isExporting ? 'Exporting...' : label}
    </button>
  );
}
