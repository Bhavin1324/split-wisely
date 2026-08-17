import { SplitEngine } from '../core/domain/SplitEngine';
import type { SplitMode, SplitParticipant } from '../types';

interface ComputeSplitsParams {
  splitMode: SplitMode;
  totalCents: number;
  selectedUserIds: string[];
  members: { user_id: string }[];
  exactAmounts: Record<string, number | null>;
  percentages: Record<string, number | null>;
  shares: Record<string, number>;
}

export function computeSplits({
  splitMode,
  totalCents,
  selectedUserIds,
  members,
  exactAmounts,
  percentages,
  shares,
}: ComputeSplitsParams): SplitParticipant[] {
  switch (splitMode) {
    case 'equal':
      if (selectedUserIds.length === 0) {
        throw new Error('Select at least one participant for equal split.');
      }
      return SplitEngine.equalSplit(totalCents, selectedUserIds);

    case 'exact':
      return SplitEngine.exactSplit(
        totalCents,
        members.map((m) => ({
          userId: m.user_id,
          amount: Math.round((exactAmounts[m.user_id] ?? 0) * 100),
        })),
      );

    case 'percentage':
      return SplitEngine.percentageSplit(
        totalCents,
        members.map((m) => ({
          userId: m.user_id,
          percentage: percentages[m.user_id] ?? 0,
        })),
      );

    case 'shares':
      return SplitEngine.sharesSplit(
        totalCents,
        members.map((m) => ({
          userId: m.user_id,
          share: shares[m.user_id] ?? 0,
        })),
      );

    default:
      throw new Error('Unsupported split mode.');
  }
}
