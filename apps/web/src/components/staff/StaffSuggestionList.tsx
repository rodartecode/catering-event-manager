'use client';

import { trpc } from '@/lib/trpc';
import { SkillBadge } from './SkillBadge';

interface StaffSuggestionListProps {
  skills?: string[];
  date?: Date;
  startTime?: string;
  endTime?: string;
  onSelect?: (resourceId: number) => void;
}

export function StaffSuggestionList({
  skills,
  date,
  startTime,
  endTime,
  onSelect,
}: StaffSuggestionListProps) {
  const { data, isLoading } = trpc.staff.findAvailable.useQuery(
    {
      skills: skills as Array<
        | 'food_safety_cert'
        | 'bartender'
        | 'sommelier'
        | 'lead_chef'
        | 'sous_chef'
        | 'prep_cook'
        | 'pastry_chef'
        | 'server'
        | 'event_coordinator'
        | 'barista'
      >,
      date,
      startTime,
      endTime,
    },
    { enabled: !!(skills?.length || date) }
  );

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-2">Searching available staff...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-500 py-2">No matching staff available</div>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Suggested Staff</h4>
      <ul className="divide-y divide-gray-100">
        {data.map((staff) => (
          <li key={staff.resourceId} className="py-2">
            <button
              type="button"
              onClick={() => onSelect?.(staff.resourceId)}
              className="w-full text-left hover:bg-gray-50 rounded px-2 py-1 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">{staff.resourceName}</span>
                  <span className="text-sm text-gray-500 ml-2">({staff.userName})</span>
                </div>
                {staff.hourlyRate && (
                  <span className="text-xs text-gray-500">${staff.hourlyRate}/hr</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {staff.skills.map((skill) => (
                  <SkillBadge key={skill} skill={skill} />
                ))}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
