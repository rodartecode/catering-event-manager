export type ResourceTypeFilterValue = 'staff' | 'equipment' | 'materials' | '';

export interface ResourceTypeFilterProps {
  value: ResourceTypeFilterValue;
  onChange: (value: ResourceTypeFilterValue) => void;
}

const filterOptions: {
  label: string;
  value: ResourceTypeFilterValue;
  activeClass: string;
  inactiveClass: string;
  ringClass: string;
}[] = [
  {
    label: 'All',
    value: '',
    activeClass: 'bg-blue-600 text-white',
    inactiveClass: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ringClass: 'focus:ring-blue-500',
  },
  {
    label: 'Staff',
    value: 'staff',
    activeClass: 'bg-purple-600 text-white',
    inactiveClass: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    ringClass: 'focus:ring-purple-500',
  },
  {
    label: 'Equipment',
    value: 'equipment',
    activeClass: 'bg-blue-600 text-white',
    inactiveClass: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    ringClass: 'focus:ring-blue-500',
  },
  {
    label: 'Materials',
    value: 'materials',
    activeClass: 'bg-green-600 text-white',
    inactiveClass: 'bg-green-100 text-green-700 hover:bg-green-200',
    ringClass: 'focus:ring-green-500',
  },
];

export function ResourceTypeFilter({ value, onChange }: ResourceTypeFilterProps) {
  return (
    <fieldset className="mb-4">
      <legend className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</legend>
      <div className="flex gap-2">
        {filterOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 ${option.ringClass} focus:ring-offset-2 ${
              value === option.value ? option.activeClass : option.inactiveClass
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
