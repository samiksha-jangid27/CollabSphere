// ABOUTME: API client for /api/v1/search endpoints — profile search and city autocomplete.
// ABOUTME: Follows the same named-export object pattern as profileService.ts.

import api from './api';
import type { Profile } from '@/types/profile';

export interface CityResult {
  city: string;
  state: string;
  country: string;
}

export interface SearchFilters {
  city?: string;
  niche?: string;
  platform?: string;
}

export const searchService = {
  async searchProfiles(filters: SearchFilters): Promise<Profile[]> {
    const { data } = await api.get('/search/profiles', { params: filters });
    return data.data;
  },

  async getCities(q: string): Promise<CityResult[]> {
    if (!q.trim()) return [];
    const { data } = await api.get('/search/cities', { params: { q } });
    return data.data;
  },
};
