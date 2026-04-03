interface VenueEquipmentChecklistProps {
  venueEquipment: string[];
  requiredEquipment: string[];
}

export function VenueEquipmentChecklist({
  venueEquipment,
  requiredEquipment,
}: VenueEquipmentChecklistProps) {
  if (requiredEquipment.length === 0) {
    return null;
  }

  const venueSet = new Set(venueEquipment.map((e) => e.toLowerCase()));

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Equipment Checklist</h4>
      <ul className="space-y-1">
        {requiredEquipment.map((item) => {
          const available = venueSet.has(item.toLowerCase());
          return (
            <li key={item} className="flex items-center gap-2 text-sm">
              {available ? (
                <>
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-green-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-green-800">{item}</span>
                </>
              ) : (
                <>
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-red-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span className="text-red-800">
                    {item}{' '}
                    <span className="text-gray-500">
                      — add portable {item.toLowerCase()} to resources
                    </span>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
