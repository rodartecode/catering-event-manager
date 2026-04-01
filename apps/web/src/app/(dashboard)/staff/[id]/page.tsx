'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AvailabilityGrid } from '@/components/staff/AvailabilityGrid';
import { SkillsEditor } from '@/components/staff/SkillsEditor';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

export default function StaffProfilePage() {
  const params = useParams();
  const resourceId = Number(params.id);
  const { isAdmin } = useIsAdmin();

  const {
    data: profile,
    isLoading,
    error,
  } = trpc.staff.getStaffProfile.useQuery({ resourceId }, { enabled: !Number.isNaN(resourceId) });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">Staff member not found</p>
          <Link href="/staff" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
            Back to Staff
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/staff" className="text-blue-600 hover:text-blue-700 text-sm">
          &larr; Back to Staff
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
            {profile.userName && (
              <p className="text-gray-600 mt-1">
                {profile.userName} &middot; {profile.userEmail}
              </p>
            )}
            {profile.userRole && (
              <p className="text-sm text-gray-500 mt-1 capitalize">{profile.userRole}</p>
            )}
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                profile.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {profile.isAvailable ? 'Available' : 'Unavailable'}
            </span>
            {profile.hourlyRate && <p className="text-gray-600 mt-2">${profile.hourlyRate}/hr</p>}
          </div>
        </div>
        {profile.notes && <p className="text-gray-600 mt-4">{profile.notes}</p>}
        {!profile.userId && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              This staff resource is not linked to a user account. Skills and availability cannot be
              managed until linked.
            </p>
          </div>
        )}
      </div>

      {/* Skills + Availability */}
      {profile.userId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <SkillsEditor
              userId={profile.userId}
              currentSkills={profile.skills}
              isAdmin={isAdmin}
            />
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <AvailabilityGrid
              userId={profile.userId}
              slots={profile.availability}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      )}
    </div>
  );
}
