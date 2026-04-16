// ABOUTME: SearchRepository — extends BaseRepository for profile search queries.
// ABOUTME: Handles searchProfiles with filters and searchCities with distinct lookup.

import { BaseRepository } from '../../shared/BaseRepository';
import { Profile, IProfile } from '../../models/Profile';
import { SearchFilters } from './search.interfaces';

export class SearchRepository extends BaseRepository<IProfile> {
  constructor() {
    super(Profile);
  }

  async searchProfiles(filters: SearchFilters): Promise<IProfile[]> {
    const query: any = {};

    if (filters.city) {
      query['location.city'] = new RegExp(filters.city, 'i');
    }
    if (filters.niche) {
      query.niche = filters.niche;
    }
    if (filters.platform) {
      query['socialAccounts.platform'] = filters.platform;
    }

    return this.findMany(query, { limit: 20 });
  }

  async searchCities(q: string): Promise<string[]> {
    const query = q ? { 'location.city': new RegExp(q, 'i') } : {};
    const cities = await this.model.distinct('location.city', query);
    return cities.slice(0, 10);
  }
}
