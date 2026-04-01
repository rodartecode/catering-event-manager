import Link from 'next/link';
import { SkillBadge } from './SkillBadge';

interface StaffCardProps {
  staff: {
    id: number;
    name: string;
    hourlyRate: string | null;
    isAvailable: boolean;
    userId: number | null;
    userName: string | null;
    userEmail: string | null;
    skillCount: number;
    skills?: string[];
  };
}

export function StaffCard({ staff }: StaffCardProps) {
  return (
    <Link
      href={`/staff/${staff.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition p-6"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{staff.name}</h3>
          {staff.userName && (
            <p className="text-sm text-gray-500">
              {staff.userName} ({staff.userEmail})
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            staff.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {staff.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>

      {staff.hourlyRate && <p className="text-sm text-gray-600 mb-3">${staff.hourlyRate}/hr</p>}

      <div className="flex items-center gap-2">
        {staff.skills ? (
          <div className="flex flex-wrap gap-1">
            {staff.skills.map((skill) => (
              <SkillBadge key={skill} skill={skill} />
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">
            {Number(staff.skillCount) > 0
              ? `${staff.skillCount} skill${Number(staff.skillCount) > 1 ? 's' : ''}`
              : 'No skills'}
          </span>
        )}
      </div>

      {!staff.userId && <p className="text-xs text-amber-600 mt-2">Not linked to a user account</p>}
    </Link>
  );
}
