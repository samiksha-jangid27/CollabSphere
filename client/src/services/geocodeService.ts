// ABOUTME: Typed API client for GET /api/v1/geocode — debounced autocomplete search.
// ABOUTME: Returns trimmed GeocodeResult[] matching the server's shape.

import api from './api';

export interface GeocodeResult {
  displayName: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
}

export const geocodeService = {
  async search(q: string): Promise<GeocodeResult[]> {
    const { data } = await api.get('/geocode', { params: { q } });
    return data.data.results as GeocodeResult[];
  },
};
