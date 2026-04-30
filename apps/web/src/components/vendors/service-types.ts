export const vendorServiceTypes = [
  'rentals',
  'florals',
  'av',
  'photography',
  'transportation',
  'decor',
  'entertainment',
  'other',
] as const;

export type VendorServiceType = (typeof vendorServiceTypes)[number];

export const vendorServiceTypeLabels: Record<VendorServiceType, string> = {
  rentals: 'Rentals',
  florals: 'Florals',
  av: 'Audio / Visual',
  photography: 'Photography',
  transportation: 'Transportation',
  decor: 'Decor',
  entertainment: 'Entertainment',
  other: 'Other',
};

export const vendorServiceTypeBadgeClasses: Record<VendorServiceType, string> = {
  rentals: 'bg-amber-100 text-amber-800',
  florals: 'bg-pink-100 text-pink-800',
  av: 'bg-purple-100 text-purple-800',
  photography: 'bg-sky-100 text-sky-800',
  transportation: 'bg-emerald-100 text-emerald-800',
  decor: 'bg-rose-100 text-rose-800',
  entertainment: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
};
