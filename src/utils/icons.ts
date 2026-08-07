import { Receipt, Utensils, Car, Smile, Home, ShoppingBag, TagIcon } from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
  TagOutlined: TagIcon,
  CoffeeOutlined: Utensils,
  CarOutlined: Car,
  SmileOutlined: Smile,
  HomeOutlined: Home,
  ShoppingOutlined: ShoppingBag,
  // Added standard entertainment/movie mappings
  PlayCircleOutlined: Smile,
  VideoCameraOutlined: Smile,
  CustomerServiceOutlined: Smile,
  TicketOutlined: Smile,
  TrophyOutlined: Smile,
};

const CATEGORY_ICONS_BY_NAME: Record<string, any> = {
  'General': TagIcon,
  'Food & Drink': Utensils,
  'Transportation': Car,
  'Entertainment': Smile,
  'Utilities & Rent': Home,
  'Shopping': ShoppingBag,
};

export function getCategoryIcon(categoryRaw?: any) {
  if (!categoryRaw) return Receipt;
  const category = Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw;
  if (!category) return Receipt;
  return CATEGORY_ICONS_BY_NAME[category.name] ?? CATEGORY_ICONS[category.icon_name] ?? Receipt;
}
