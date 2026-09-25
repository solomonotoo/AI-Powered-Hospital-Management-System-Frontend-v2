import { QueryClient } from "@tanstack/react-query";

// One client for the app. WHY these defaults: hospital data must never
// serve stale clinical/financial state from cache — refetch on focus and
// short stale times keep queue boards and charts honest on shared
// workstations. Mutations invalidate explicit query keys per feature
// (never broad invalidations that flash stale sensitive data).
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
