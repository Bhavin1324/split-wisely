/**
 * Category keywords for auto-categorization based on expense description.
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Drink': [
    'dinner', 'lunch', 'breakfast', 'food', 'restaurant', 'pizza', 'burger',
    'coffee', 'cafe', 'drink', 'bar', 'beer', 'grocery', 'snack', 'tea',
  ],
  'Transportation': [
    'uber', 'lyft', 'taxi', 'cab', 'bus', 'train', 'subway', 'flight',
    'gas', 'parking', 'toll', 'metro', 'petrol', 'diesel',
  ],
  'Entertainment': [
    'movie', 'cinema', 'concert', 'ticket', 'game', 'club', 'party',
    'rental', 'museum', 'bowling', 'netflix', 'hulu', 'disney', 'spotify',
    'theater', 'theatre', 'show', 'amusement', 'park', 'zoo', 'aquarium',
    'arcade', 'festival',
  ],
  'Utilities & Rent': [
    'rent', 'water', 'electricity', 'internet', 'wifi', 'power',
    'utility', 'trash', 'bill', 'maintenance',
  ],
  'Shopping': [
    'groceries', 'supermarket', 'mall', 'clothes', 'shoes', 'amazon',
    'walmart', 'target', 'store', 'market',
  ],
};

/**
 * Matches an expense description string against category keyword patterns.
 * Returns the matching category ID, or null if no match is found.
 */
export function matchCategoryByDescription(
  description: string,
  categories: { id: string; name: string }[],
): string | null {
  if (!description || !categories.length) return null;
  const lowerDesc = description.toLowerCase();

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerDesc.includes(kw))) {
      const match = categories.find((c) => c.name === catName);
      if (match) return match.id;
    }
  }

  return null;
}
