// Profile type
export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  default_currency: string;
  created_at: string;
}

// Group type
export interface Group {
  id: string;
  name: string;
  cover_image_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
}

// GroupMember type
export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

// Category type
export interface Category {
  id: string;
  name: string;
  icon_name: string;
}

// Expense type
export interface Expense {
  id: string;
  group_id: string | null;
  category_id: string | null;
  description: string;
  total_amount: number; // cents
  currency_code: string;
  exchange_rate: number;
  base_currency_amount: number; // cents
  payer_id: string;
  receipt_image_url: string | null;
  created_by: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  payer?: Profile;
  category?: Category;
  splits?: ExpenseSplit[];
}

// ExpenseSplit type
export interface ExpenseSplit {
  expense_id: string;
  user_id: string;
  amount_owed: number; // cents
  user?: Profile;
}

// Settlement type
export interface Settlement {
  id: string;
  group_id: string | null;
  payer_id: string;
  payee_id: string;
  amount: number; // cents
  currency_code: string;
  created_at: string;
  payer?: Profile;
  payee?: Profile;
}

// Activity Log type
export interface ActivityLog {
  id: string;
  group_id: string;
  user_id: string;
  action_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

// Split mode enum
export type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';

// For the split engine
export interface SplitParticipant {
  userId: string;
  amountOwed: number; // cents
}

// Simplified debt transaction
export interface SimplifiedTransaction {
  from: string;
  to: string;
  amount: number; // cents
}

// Balance summary for dashboard
export interface BalanceSummary {
  totalBalance: number; // cents, positive = owed to you
  youOwe: number; // cents
  youAreOwed: number; // cents
}

// Friend with balance
export interface FriendWithBalance {
  profile: Profile;
  balance: number; // positive = they owe you, negative = you owe them
}
