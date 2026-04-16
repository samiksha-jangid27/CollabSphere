// ABOUTME: Unit tests for SearchService — validates filter requirement and search logic.
// ABOUTME: Uses in-memory DB for repository tests.

import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';
import { SearchRepository } from '@/modules/search/search.repository';
import { SearchService } from '@/modules/search/search.service';
import { AppError } from '@/shared/errors';

const repo = new SearchRepository();
const service = new SearchService(repo);

let phoneCounter = 1;

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
  phoneCounter = 1;
  jest.clearAllMocks();
});

async function createTestProfile(data: {
  displayName: string;
  niche?: string[];
  location?: { type: 'Point'; coordinates: [number, number]; city: string };
}) {
  const user = await User.create({ 
    phone: `+9198765432${phoneCounter++}`, 
    role: 'creator' 
  });
  return Profile.create({
    userId: user._id,
    displayName: data.displayName,
    niche: data.niche || [],
    location: data.location,
  });
}

describe('SearchService', () => {
  it('searchProfiles({}) throws INVALID_SEARCH_FILTERS', async () => {
    await expect(service.searchProfiles({})).rejects.toMatchObject({
      code: 'INVALID_SEARCH_FILTERS',
    });
  });

  it('searchProfiles({ city: "Mumbai" }) returns array', async () => {
    await createTestProfile({
      displayName: 'Aarav',
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    const results = await service.searchProfiles({ city: 'Mumbai' });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].displayName).toBe('Aarav');
  });

  it('searchProfiles({ city: "Nowhere" }) returns empty array', async () => {
    await createTestProfile({
      displayName: 'Aarav',
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    const results = await service.searchProfiles({ city: 'Nowhere' });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('searchProfiles({ niche: "fashion" }) returns matching profiles', async () => {
    await createTestProfile({ displayName: 'Maya', niche: ['fashion', 'travel'] });
    await createTestProfile({ displayName: 'Raj', niche: ['tech'] });
    const results = await service.searchProfiles({ niche: 'fashion' });
    expect(results.length).toBe(1);
    expect(results[0].displayName).toBe('Maya');
  });

  it('searchProfiles({ city, niche }) returns filtered results', async () => {
    await createTestProfile({
      displayName: 'Maya',
      niche: ['fashion'],
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    await createTestProfile({
      displayName: 'Raj',
      niche: ['tech'],
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    const results = await service.searchProfiles({ city: 'Mumbai', niche: 'fashion' });
    expect(results.length).toBe(1);
    expect(results[0].displayName).toBe('Maya');
  });

  it('searchCities(q) returns distinct cities matching query', async () => {
    await createTestProfile({
      displayName: 'User1',
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    await createTestProfile({
      displayName: 'User2',
      location: { type: 'Point', coordinates: [77.1025, 28.7041], city: 'Delhi' },
    });
    const results = await service.searchCities('mum');
    expect(Array.isArray(results)).toBe(true);
    expect(results.includes('Mumbai')).toBe(true);
  });

  it('searchCities("") returns all cities', async () => {
    await createTestProfile({
      displayName: 'User1',
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    await createTestProfile({
      displayName: 'User2',
      location: { type: 'Point', coordinates: [77.1025, 28.7041], city: 'Delhi' },
    });
    const results = await service.searchCities('');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});
