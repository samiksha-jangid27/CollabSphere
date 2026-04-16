// ABOUTME: Hook encapsulating search state — results, loading, error — and the search action.
// ABOUTME: No auto-fetch; user initiates via the returned search() callback.

'use client';

import { useState, useCallback } from 'react';
import { searchService, type SearchFilters } from '@/services/searchService';
import type { Profile } from '@/types/profile';

interface UseSearchState {
  results: Profile[];
  loading: boolean;
  error: string | null;
}

export function useSearch() {
  const [state, setState] = useState<UseSearchState>({
    results: [],
    loading: false,
    error: null,
  });

  const search = useCallback(async (filters: SearchFilters) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const results = await searchService.searchProfiles(filters);
      setState({ results, loading: false, error: null });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        axiosErr.response?.data?.error?.message ??
        'Search failed. Please try again.';
      setState({ results: [], loading: false, error: message });
    }
  }, []);

  return { ...state, search };
}
