'use client';

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { StationForm } from '@/components/kitchen-production/StationForm';

function NewStationContent() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Add Kitchen Station</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <StationForm
            onSuccess={() => router.push('/kitchen-production')}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </div>
  );
}

export default function NewStationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewStationContent />
    </Suspense>
  );
}
