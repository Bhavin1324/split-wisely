import { useProfileQuery } from '../queries/useProfileQuery';
import { useFriendsQuery } from '../queries/useFriendsQuery';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export function useProfile(userId: string | undefined) {
  const query = useProfileQuery(userId);
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useFriends(userId: string | undefined) {
  const { data, loading, error, refetch } = useFriendsQuery(userId);
  return { data, loading, error, refetch };
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', `%${query.trim()}%`)
    .limit(10);

  if (error) throw error;
  return (data as Profile[]) || [];
}
