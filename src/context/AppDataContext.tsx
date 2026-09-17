import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { queryKeys } from '../lib/queryKeys';
import { useProfileQuery, useCategoriesQuery } from '../hooks/queries/useProfileQuery';
import { useUserGroupsQuery } from '../hooks/queries/useGroupsQuery';
import type { Profile, Group, Category } from '../types';

export const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co';

interface AppDataContextType {
  currentUser: Profile | null;
  groups: Group[];
  categories: Category[];
  loading: boolean;
  refetchGroups: () => void;
  refetchProfile: () => void;
  refetchData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useProfileQuery(user?.id);
  const groupsQuery = useUserGroupsQuery(user?.id);
  const categoriesQuery = useCategoriesQuery();

  const currentUser = profileQuery.data ?? null;
  const groups = useMemo(() => {
    return Array.isArray(groupsQuery.data)
      ? groupsQuery.data.filter((g): g is Group => Boolean(g && typeof g === 'object' && g.id))
      : [];
  }, [groupsQuery.data]);
  const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];

  const loading = authLoading || profileQuery.isLoading || groupsQuery.loading || categoriesQuery.isLoading;

  const refetchGroups = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user?.id) });
  };

  const refetchProfile = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail(user?.id) });
  };

  const refetchData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail(user?.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user?.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements.all }),
    ]);
  };

  const contextValue = useMemo<AppDataContextType>(
    () => ({
      currentUser,
      groups,
      categories,
      loading,
      refetchGroups,
      refetchProfile,
      refetchData,
    }),
    [currentUser, groups, categories, loading]
  );

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
