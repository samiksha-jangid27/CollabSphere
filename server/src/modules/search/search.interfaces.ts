// ABOUTME: ISearchService interface — controllers depend on this, not the concrete class.
// ABOUTME: Defines search filters and service contract.

import { IProfile } from '../../models/Profile';

export interface SearchFilters {
  city?: string;
  niche?: string;
  platform?: string;
}

export interface ISearchService {
  searchProfiles(filters: SearchFilters): Promise<IProfile[]>;
  searchCities(q: string): Promise<string[]>;
}
