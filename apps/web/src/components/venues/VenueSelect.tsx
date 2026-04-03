'use client';

import { trpc } from '@/lib/trpc';

export interface VenueData {
  id: number;
  name: string;
  address: string;
  capacity: number | null;
  hasKitchen: boolean;
  kitchenType: string | null;
  equipmentAvailable: string[] | null;
  parkingNotes: string | null;
  loadInNotes: string | null;
}

interface VenueSelectProps {
  value: number | null;
  onSelect: (venue: VenueData | null) => void;
  disabled?: boolean;
}

export function VenueSelect({ value, onSelect, disabled }: VenueSelectProps) {
  const { data: venues, isLoading } = trpc.venue.list.useQuery();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venueId = e.target.value ? parseInt(e.target.value, 10) : null;
    if (venueId && venues) {
      const venue = venues.find((v) => v.id === venueId);
      if (venue) {
        onSelect({
          id: venue.id,
          name: venue.name,
          address: venue.address,
          capacity: venue.capacity,
          hasKitchen: venue.hasKitchen,
          kitchenType: venue.kitchenType,
          equipmentAvailable: venue.equipmentAvailable,
          parkingNotes: venue.parkingNotes,
          loadInNotes: venue.loadInNotes,
        });
        return;
      }
    }
    onSelect(null);
  };

  return (
    <div>
      <label htmlFor="venueSelect" className="block text-sm font-medium text-gray-700 mb-2">
        Venue
      </label>
      <select
        id="venueSelect"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="">Ad-hoc location (no saved venue)</option>
        {venues?.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name} — {venue.address}
          </option>
        ))}
      </select>
      {isLoading && <p className="mt-1 text-xs text-gray-500">Loading venues...</p>}
    </div>
  );
}
