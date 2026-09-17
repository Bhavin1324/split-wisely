import { useGroupActivitiesQuery } from '../queries/useGroupActivitiesQuery';
import type { GroupActivityItem } from '../../types';

export function useGroupActivities(groupId: string | undefined) {
  const { data, loading, error, refetch } = useGroupActivitiesQuery(groupId);
  return { data, loading, error, refetch };
}

export type { GroupActivityItem };
