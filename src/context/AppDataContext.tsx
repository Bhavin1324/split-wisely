import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { Profile, Group, Category } from '../types';
import { MOCK_PROFILES, MOCK_GROUPS, MOCK_CATEGORIES, MOCK_CURRENT_USER } from '../lib/mockData';

export const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co';

interface AppDataContextType {
  currentUser: Profile | null;
  groups: Group[];
  categories: Category[];
  loading: boolean;
  refetchGroups: () => void;
  refetchProfile: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    if (DEMO_MODE) {
      const profile = MOCK_PROFILES.find(p => p.id === userId) || MOCK_CURRENT_USER;
      setCurrentUser(profile || null);
      return;
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setCurrentUser(data as Profile);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  }, []);

  const fetchGroups = useCallback(async (userId: string) => {
    if (DEMO_MODE) {
      setGroups(MOCK_GROUPS);
      return;
    }
    try {
      const { data, error } = await supabase.from('group_members').select('group_id, groups(*)').eq('user_id', userId);
      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedGroups = data.map((d: any) => d.groups).filter(Boolean) as Group[];
        setGroups(fetchedGroups);
      }
    } catch (e) {
      console.error('Error fetching groups:', e);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    if (DEMO_MODE) {
      setCategories(MOCK_CATEGORIES);
      return;
    }
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (!error && data) {
        setCategories(data as Category[]);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  }, []);

  const refetchGroups = useCallback(() => {
    if (user?.id) {
       fetchGroups(user.id);
    }
  }, [user, fetchGroups]);

  const refetchProfile = useCallback(() => {
    if (user?.id) {
       fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (user?.id) {
        await Promise.all([
          fetchProfile(user.id),
          fetchGroups(user.id),
          fetchCategories()
        ]);
      } else {
        setCurrentUser(null);
        setGroups([]);
        setCategories([]);
      }
      setLoading(false);
    };

    fetchData();
  }, [user?.id, fetchProfile, fetchGroups, fetchCategories]);

  return (
    <AppDataContext.Provider
      value={{
        currentUser,
        groups,
        categories,
        loading,
        refetchGroups,
        refetchProfile,
      }}
    >
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
