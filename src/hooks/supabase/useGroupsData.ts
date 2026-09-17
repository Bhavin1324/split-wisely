import { useUserGroupsQuery, useGroupMembersQuery } from '../queries/useGroupsQuery';
import type { Group, GroupMember } from '../../types';

/**
 * Hook to retrieve groups for a specific user with caching and real-time synchronization.
 * Backed by TanStack Query.
 */
export function useGroups(userId: string | undefined) {
  const { data, loading, error, refetch } = useUserGroupsQuery(userId);
  return { data, loading, error, refetch };
}

/**
 * Hook to retrieve members of a group with caching and selective profile joins.
 * Backed by TanStack Query.
 */
export function useGroupMembers(groupId: string | undefined) {
  const { data, loading, error, refetch } = useGroupMembersQuery(groupId);
  return { data, loading, error, refetch };
}

export type { Group, GroupMember };
