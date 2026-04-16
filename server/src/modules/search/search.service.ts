// ABOUTME: SearchService — business logic for discovery search and city autocomplete.
// ABOUTME: Validates that at least one filter is provided before delegating to repo.

import { SearchRepository } from './search.repository';
import { ISearchService, SearchFilters } from './search.interfaces';
import { IProfile } from '../../models/Profile';
import { AppError, ERROR_CODES } from '../../shared/errors';

export class SearchService implements ISearchService {
  constructor(private readonly repo: SearchRepository) {}

  async searchProfiles(filters: SearchFilters): Promise<IProfile[]> {
    const hasAtLeastOneFilter = !!(filters.city || filters.niche || filters.platform);
    if (!hasAtLeastOneFilter) {
      throw AppError.badRequest(
        'At least one filter (city, niche, platform) is required',
        ERROR_CODES.INVALID_SEARCH_FILTERS,
      );
    }
    return this.repo.searchProfiles(filters);
  }

  async searchCities(q: string): Promise<string[]> {
    return this.repo.searchCities(q);
  }
}
