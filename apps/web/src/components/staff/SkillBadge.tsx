interface SkillBadgeProps {
  skill: string;
}

const skillConfig: Record<string, { bg: string; text: string; label: string }> = {
  food_safety_cert: { bg: 'bg-green-100', text: 'text-green-800', label: 'Food Safety' },
  bartender: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Bartender' },
  sommelier: { bg: 'bg-red-100', text: 'text-red-800', label: 'Sommelier' },
  lead_chef: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Lead Chef' },
  sous_chef: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Sous Chef' },
  prep_cook: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Prep Cook' },
  pastry_chef: { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Pastry Chef' },
  server: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Server' },
  event_coordinator: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Event Coordinator' },
  barista: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Barista' },
};

const defaultConfig = { bg: 'bg-gray-100', text: 'text-gray-800', label: '' };

export function SkillBadge({ skill }: SkillBadgeProps) {
  const config = skillConfig[skill] || defaultConfig;
  const label = config.label || skill.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {label}
    </span>
  );
}
