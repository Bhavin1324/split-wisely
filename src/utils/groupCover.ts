/**
 * Group cover utilities and preset themes.
 */

export interface GroupCoverPreset {
  id: string;
  name: string;
  category: string;
  gradient: string;
  previewUrl: string;
}

export const GROUP_COVER_PRESETS: GroupCoverPreset[] = [
  {
    id: 'cover-trip',
    name: 'Mountain Trip',
    category: 'trip',
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    previewUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cover-beach',
    name: 'Tropical Beach',
    category: 'trip',
    gradient: 'from-cyan-500 via-teal-600 to-emerald-600',
    previewUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cover-home',
    name: 'Cozy Apartment',
    category: 'home',
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    previewUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cover-dining',
    name: 'Feast & Drinks',
    category: 'dining',
    gradient: 'from-rose-500 via-red-600 to-amber-600',
    previewUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cover-party',
    name: 'Celebration',
    category: 'event',
    gradient: 'from-fuchsia-600 via-purple-600 to-pink-600',
    previewUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cover-work',
    name: 'Office & Projects',
    category: 'work',
    gradient: 'from-slate-700 via-gray-800 to-zinc-900',
    previewUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
  },
];

/**
 * Returns a fallback gradient class for groups without an image.
 */
export function getGroupFallbackGradient(groupId?: string): string {
  const gradients = [
    'from-emerald-600 to-teal-800',
    'from-blue-600 to-indigo-800',
    'from-purple-600 to-pink-800',
    'from-amber-600 to-orange-800',
    'from-rose-600 to-red-800',
    'from-cyan-600 to-blue-800',
  ];

  if (!groupId) return gradients[0];
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}
