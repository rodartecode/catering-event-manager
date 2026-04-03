'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { SkillBadge } from './SkillBadge';

const ALL_SKILLS = [
  'food_safety_cert',
  'bartender',
  'sommelier',
  'lead_chef',
  'sous_chef',
  'prep_cook',
  'pastry_chef',
  'server',
  'event_coordinator',
  'barista',
] as const;

interface SkillsEditorProps {
  userId: number;
  currentSkills: Array<{
    skill: string;
    certifiedAt: Date | null;
    expiresAt: Date | null;
  }>;
  isAdmin: boolean;
}

export function SkillsEditor({ userId, currentSkills, isAdmin }: SkillsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(currentSkills.map((s) => s.skill));

  const utils = trpc.useUtils();
  const updateSkills = trpc.staff.updateSkills.useMutation({
    onSuccess: () => {
      utils.staff.getStaffProfile.invalidate();
      utils.staff.getSkills.invalidate();
      setEditing(false);
    },
  });

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSave = () => {
    updateSkills.mutate({
      userId,
      skills: selectedSkills.map((skill) => ({
        skill: skill as (typeof ALL_SKILLS)[number],
      })),
    });
  };

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Skills</h3>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setSelectedSkills(currentSkills.map((s) => s.skill));
                setEditing(true);
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>
        {currentSkills.length === 0 ? (
          <p className="text-sm text-gray-500">No skills assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {currentSkills.map((s) => (
              <SkillBadge key={s.skill} skill={s.skill} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Edit Skills</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateSkills.isPending}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {updateSkills.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_SKILLS.map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <button
              type="button"
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                isSelected
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {isSelected && (
                <svg
                  aria-hidden="true"
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <SkillBadge skill={skill} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
