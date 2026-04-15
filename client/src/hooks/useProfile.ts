'use client';

// ABOUTME: Data-fetching hook for the current user's profile, handles loading and 404 distinctly.
// ABOUTME: 404 surfaces as hasProfile=false (not an error), any other failure becomes error.

import { useEffect, useState, useCallback } from 'react';
import { profileService } from '@/services/profileService';
import { Profile } from '@/types/profile';

interface UseProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  hasProfile: boolean;
}

export function useProfile() {
  const [state, setState] = useState<UseProfileState>({
    profile: null,
    loading: true,
    error: null,
    hasProfile: false,
  });

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const profile = await profileService.getMe();
      setState({ profile, loading: false, error: null, hasProfile: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (axiosErr.response?.status === 404) {
        setState({ profile: null, loading: false, error: null, hasProfile: false });
        return;
      }
      setState({
        profile: null,
        loading: false,
        error: axiosErr.response?.data?.error?.message ?? 'Failed to load profile',
        hasProfile: false,
      });
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
