import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_PROFILES, MOCK_CATEGORIES, MOCK_CURRENT_USER } from '../../lib/mockData';
import type { Profile, Category } from '../../types';

/**
 * Fetch current user profile with caching.
 */
export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.detail(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      if (DEMO_MODE) {
        const profile = MOCK_PROFILES.find((p) => p.id === userId) || MOCK_CURRENT_USER;
        return profile || null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    },
    enabled: Boolean(userId),
  });
}

/**
 * Fetch expense categories with long-lived caching.
 */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async (): Promise<Category[]> => {
      if (DEMO_MODE) {
        return MOCK_CATEGORIES;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
      return (data || []) as Category[];
    },
    staleTime: 1000 * 60 * 60, // Categories rarely change, cache for 1 hour
  });
}
