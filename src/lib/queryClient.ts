import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized TanStack Query Client for Centfolio.
 * Configured with industry-standard defaults:
 * - 2-minute stale time prevents redundant network calls during rapid tab/route switching
 * - 5-minute garbage collection retains inactive cache in memory while freeing resources promptly
 * - Automatic background revalidation on internet reconnection
 * - No aggressive window focus refetching to prevent unexpected layout shifts
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5,    // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
