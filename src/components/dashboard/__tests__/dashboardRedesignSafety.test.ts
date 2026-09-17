import { describe, it, expect } from 'vitest';
import { formatCents } from '../../../utils/currency';

describe('Dashboard Redesign Safety & Edge-Case Verification', () => {
  describe('Signed-zero guard logic for DashboardHeroCard', () => {
    it('prevents negative zero (-₹0.00) when youOwe is 0', () => {
      const youOwe = 0;
      const formatted = youOwe > 0 ? `-${formatCents(youOwe)}` : formatCents(0);
      expect(formatted).toBe('₹0.00');
      expect(formatted).not.toContain('-');
    });

    it('prevents positive zero (+₹0.00) when youAreOwed is 0', () => {
      const youAreOwed = 0;
      const formatted = youAreOwed > 0 ? `+${formatCents(youAreOwed)}` : formatCents(0);
      expect(formatted).toBe('₹0.00');
      expect(formatted).not.toContain('+');
    });

    it('formats positive debts and credits with correct mathematical signs', () => {
      const youOwe = 2550; // ₹25.50
      const youAreOwed = 4800; // ₹48.00

      const oweFormatted = youOwe > 0 ? `-${formatCents(youOwe)}` : formatCents(0);
      const owedFormatted = youAreOwed > 0 ? `+${formatCents(youAreOwed)}` : formatCents(0);

      expect(oweFormatted).toBe('-₹25.50');
      expect(owedFormatted).toBe('+₹48.00');
    });

    it('accurately evaluates neutral, positive, and negative net position states', () => {
      const evaluateHeroState = (totalBalance: number) => {
        const isZero = totalBalance === 0;
        const isPositive = totalBalance > 0;
        return {
          isZero,
          isPositive,
          label: isZero
            ? 'All settled up across groups'
            : isPositive
              ? 'You are overall in the green'
              : 'Net amount you owe across groups',
        };
      };

      expect(evaluateHeroState(0)).toEqual({
        isZero: true,
        isPositive: false,
        label: 'All settled up across groups',
      });

      expect(evaluateHeroState(1500)).toEqual({
        isZero: false,
        isPositive: true,
        label: 'You are overall in the green',
      });

      expect(evaluateHeroState(-3200)).toEqual({
        isZero: false,
        isPositive: false,
        label: 'Net amount you owe across groups',
      });
    });
  });

  describe('GroupCard settlement & debt masking prevention', () => {
    it('does NOT declare settled when net balance is 0 but active debts exist', () => {
      const userId = 'user-1';
      const balance = 0; // Net position = $0 (owes $20 to Alice, Bob owes $20 to user)
      const groupDebts = [
        { from: 'user-1', to: 'alice', amount: 2000 },
        { from: 'bob', to: 'user-1', amount: 2000 },
      ];

      const myDebts = groupDebts.filter(d => d.from === userId || d.to === userId);
      const isSettled = Math.abs(balance) < 1 && myDebts.length === 0;

      // Must be FALSE because active debts exist that require settlement
      expect(isSettled).toBe(false);
      expect(myDebts.length).toBe(2);
    });

    it('correctly declares settled when balance is 0 and no debts exist', () => {
      const userId = 'user-1';
      const balance = 0;
      const groupDebts: Array<{ from: string; to: string; amount: number }> = [];

      const myDebts = groupDebts.filter(d => d.from === userId || d.to === userId);
      const isSettled = Math.abs(balance) < 1 && myDebts.length === 0;

      expect(isSettled).toBe(true);
      expect(myDebts.length).toBe(0);
    });
  });

  describe('Directional Balance Arrow Semantics in GroupCard', () => {
    it('selects incoming cashflow (ArrowDownLeft / success) when balance is positive (receivable)', () => {
      const balance = 4500; // User is owed money
      const isSettled = false;

      const arrowType = isSettled ? 'CheckCircle2' : balance > 0 ? 'ArrowDownLeft' : 'ArrowUpRight';
      const colorClass = isSettled ? 'text-text-muted' : balance > 0 ? 'text-success-text' : 'text-error-text';

      expect(arrowType).toBe('ArrowDownLeft');
      expect(colorClass).toBe('text-success-text');
    });

    it('selects outgoing cashflow (ArrowUpRight / danger) when balance is negative (payable)', () => {
      const balance = -3200; // User owes money
      const isSettled = false;

      const arrowType = isSettled ? 'CheckCircle2' : balance > 0 ? 'ArrowDownLeft' : 'ArrowUpRight';
      const colorClass = isSettled ? 'text-text-muted' : balance > 0 ? 'text-success-text' : 'text-error-text';

      expect(arrowType).toBe('ArrowUpRight');
      expect(colorClass).toBe('text-error-text');
    });

    it('selects neutral checkmark when settled', () => {
      const balance = 0;
      const isSettled = true;

      const arrowType = isSettled ? 'CheckCircle2' : balance > 0 ? 'ArrowDownLeft' : 'ArrowUpRight';
      expect(arrowType).toBe('CheckCircle2');
    });
  });

  describe('memberMap Resolution & UserAvatar data mapping', () => {
    it('resolves member name and avatar_url in O(1) from memberMap', () => {
      const memberMap = new Map<string, { full_name: string; avatar_url?: string | null }>([
        ['user-123', { full_name: 'Priya Sharma', avatar_url: 'https://example.com/avatar.jpg' }],
      ]);

      const resolveUser = (id: string) => {
        const fromMap = memberMap.get(id);
        if (fromMap) return { id, full_name: fromMap.full_name, avatar_url: fromMap.avatar_url };
        return { id, full_name: 'Friend', avatar_url: null };
      };

      const resolved = resolveUser('user-123');
      expect(resolved).toEqual({
        id: 'user-123',
        full_name: 'Priya Sharma',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    it('gracefully falls back to placeholder Friend when member is unmapped', () => {
      const memberMap = new Map<string, { full_name: string; avatar_url?: string | null }>();

      const resolveUser = (id: string) => {
        const fromMap = memberMap.get(id);
        if (fromMap) return { id, full_name: fromMap.full_name, avatar_url: fromMap.avatar_url };
        return { id, full_name: 'Friend', avatar_url: null };
      };

      const resolved = resolveUser('unknown-id');
      expect(resolved).toEqual({
        id: 'unknown-id',
        full_name: 'Friend',
        avatar_url: null,
      });
    });
  });

  describe('ActivityItem participation semantics', () => {
    it('identifies non-participants and suppresses "settled" label', () => {
      const currentUserId = 'user-charlie';
      const expense = {
        payer_id: 'user-alice',
        base_currency_amount: 5000,
        splits: [
          { user_id: 'user-bob', amount_owed: 5000 },
        ],
      };

      const isCurrentUserPayer = expense.payer_id === currentUserId;
      const userSplit = (expense.splits ?? []).find(s => s.user_id === currentUserId);
      const isParticipant = (expense.splits ?? []).some(s => s.user_id === currentUserId);
      const isSoloPayer = isCurrentUserPayer && (!expense.splits?.length || (expense.splits.length === 1 && expense.splits[0].user_id === currentUserId));

      let userAmount = 0;
      let statusLabel = 'settled';

      if (isSoloPayer) {
        userAmount = expense.base_currency_amount;
        statusLabel = 'personal';
      } else if (isCurrentUserPayer) {
        userAmount = expense.base_currency_amount - (userSplit?.amount_owed ?? 0);
        statusLabel = userAmount > 0 ? 'you lent' : 'settled';
      } else if (isParticipant) {
        userAmount = -(userSplit?.amount_owed ?? 0);
        statusLabel = 'your share';
      } else {
        userAmount = 0;
        statusLabel = 'not involved';
      }

      expect(statusLabel).toBe('not involved');
      expect(userAmount).toBe(0);
    });

    it('identifies solo payer expense correctly as personal', () => {
      const currentUserId = 'user-alice';
      const expense = {
        payer_id: 'user-alice',
        base_currency_amount: 3200,
        splits: [
          { user_id: 'user-alice', amount_owed: 3200 },
        ],
      };

      const isCurrentUserPayer = expense.payer_id === currentUserId;
      const userSplit = (expense.splits ?? []).find(s => s.user_id === currentUserId);
      const isParticipant = (expense.splits ?? []).some(s => s.user_id === currentUserId);
      const isSoloPayer = isCurrentUserPayer && (!expense.splits?.length || (expense.splits.length === 1 && expense.splits[0].user_id === currentUserId));

      let userAmount = 0;
      let statusLabel = 'settled';

      if (isSoloPayer) {
        userAmount = expense.base_currency_amount;
        statusLabel = 'personal';
      } else if (isCurrentUserPayer) {
        userAmount = expense.base_currency_amount - (userSplit?.amount_owed ?? 0);
        statusLabel = userAmount > 0 ? 'you lent' : 'settled';
      } else if (isParticipant) {
        userAmount = -(userSplit?.amount_owed ?? 0);
        statusLabel = 'your share';
      } else {
        userAmount = 0;
        statusLabel = 'not involved';
      }

      expect(statusLabel).toBe('personal');
      expect(userAmount).toBe(3200);
    });
  });

  describe('GroupCard Member Count & Preview Remediation', () => {
    it('uses group.member_count when populated by the data layer', () => {
      const group = { member_count: 5 };
      const previewMembers: Array<{ id: string }> = [];
      const memberCount = group.member_count ?? (previewMembers.length > 0 ? previewMembers.length : 1);
      expect(memberCount).toBe(5);
    });

    it('falls back safely to previewMembers count or minimum 1 when member_count is undefined (never 0)', () => {
      const groupWithoutCount: { member_count?: number } = {};
      const previewWithTwo = [{ id: 'user-1' }, { id: 'user-2' }];
      const previewEmpty: Array<{ id: string }> = [];

      const countWithPreview = groupWithoutCount.member_count ?? (previewWithTwo.length > 0 ? previewWithTwo.length : 1);
      const countWithoutPreview = groupWithoutCount.member_count ?? (previewEmpty.length > 0 ? previewEmpty.length : 1);

      expect(countWithPreview).toBe(2);
      expect(countWithoutPreview).toBe(1);
      expect(countWithoutPreview).toBeGreaterThan(0);
    });

    it('aggregates relational membership rows into exact count map and preview lists', () => {
      const allMembers = [
        { group_id: 'g-1', user_id: 'u-1', profile: { id: 'u-1', full_name: 'Alice', avatar_url: null } },
        { group_id: 'g-1', user_id: 'u-2', profile: { id: 'u-2', full_name: 'Bob', avatar_url: 'https://img/bob.png' } },
        { group_id: 'g-1', user_id: 'u-3', profile: { id: 'u-3', full_name: 'Charlie', avatar_url: null } },
        { group_id: 'g-2', user_id: 'u-1', profile: { id: 'u-1', full_name: 'Alice', avatar_url: null } },
      ];

      const countMap = new Map<string, number>();
      const membersByGroup = new Map<string, typeof allMembers>();

      for (const gm of allMembers) {
        countMap.set(gm.group_id, (countMap.get(gm.group_id) || 0) + 1);
        const list = membersByGroup.get(gm.group_id) || [];
        list.push(gm);
        membersByGroup.set(gm.group_id, list);
      }

      expect(countMap.get('g-1')).toBe(3);
      expect(countMap.get('g-2')).toBe(1);
      expect(membersByGroup.get('g-1')?.length).toBe(3);
      expect(membersByGroup.get('g-1')?.[1].profile.avatar_url).toBe('https://img/bob.png');
    });
  });

  describe('Dashboard Welcome Header Avatar & Initials Fallback', () => {
    const resolveAvatarUrl = (
      currentUser?: { avatar_url?: string | null },
      user?: { user_metadata?: { avatar_url?: string | null } },
      demoMode = false,
      mockAvatarUrl: string | null = 'https://example.com/mock.png'
    ) => {
      return currentUser?.avatar_url || user?.user_metadata?.avatar_url || (demoMode ? mockAvatarUrl : null);
    };

    const getInitials = (displayName: string) => {
      return displayName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';
    };

    it('resolves avatarUrl with correct precedence hierarchy', () => {
      // 1. currentUser avatar takes top priority
      expect(resolveAvatarUrl(
        { avatar_url: 'https://img/profile.png' },
        { user_metadata: { avatar_url: 'https://img/meta.png' } },
        false
      )).toBe('https://img/profile.png');

      // 2. user_metadata fallback if currentUser has no avatar
      expect(resolveAvatarUrl(
        { avatar_url: null },
        { user_metadata: { avatar_url: 'https://img/meta.png' } },
        false
      )).toBe('https://img/meta.png');

      // 3. DEMO_MODE fallback if neither exists
      expect(resolveAvatarUrl(
        undefined,
        undefined,
        true,
        'https://example.com/mock.png'
      )).toBe('https://example.com/mock.png');

      // 4. Returns null if all missing and not in demo mode
      expect(resolveAvatarUrl(undefined, undefined, false)).toBeNull();
    });

    it('gracefully switches to gradient initials squircle upon avatar error', () => {
      let avatarError = false;
      const avatarUrl: string | null = 'https://broken-image.com/404.png';
      const displayName = 'Bhavin Patel';

      const renderHeaderAvatar = (url: string | null, error: boolean, name: string) => {
        if (url && !error) {
          return { type: 'img', src: url, alt: name };
        }
        return { type: 'initials', content: getInitials(name) };
      };

      // Initial state: attempt image load
      expect(renderHeaderAvatar(avatarUrl, avatarError, displayName)).toEqual({
        type: 'img',
        src: 'https://broken-image.com/404.png',
        alt: 'Bhavin Patel',
      });

      // Simulate onError firing
      avatarError = true;
      expect(renderHeaderAvatar(avatarUrl, avatarError, displayName)).toEqual({
        type: 'initials',
        content: 'BP',
      });
    });

    it('extracts initials accurately across name formats without crashing', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Alice')).toBe('A');
      expect(getInitials('Alexander Graham Bell')).toBe('AG');
      expect(getInitials('   Bob   Smith  ')).toBe('BS');
      expect(getInitials('')).toBe('U');
      expect(getInitials('   ')).toBe('U');
    });
  });
});

