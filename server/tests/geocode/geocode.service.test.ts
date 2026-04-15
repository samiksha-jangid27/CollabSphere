// ABOUTME: Unit tests for GeocodeService — verifies Nominatim fetch wiring, trimming, errors.
// ABOUTME: Mocks global fetch; no network calls.

import { GeocodeService } from '@/modules/geocode/geocode.service';
import { AppError } from '@/shared/errors';

const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(response: { ok?: boolean; status?: number; body?: unknown }) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.body ?? [],
  }) as unknown as typeof fetch;
}

function mockFetchReject(err: Error) {
  global.fetch = jest.fn().mockRejectedValue(err) as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  jest.clearAllMocks();
});

describe('GeocodeService', () => {
  const service = new GeocodeService();

  it('calls Nominatim with the configured User-Agent', async () => {
    mockFetchOnce({ body: [] });
    await service.search('mumbai');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('https://nominatim.openstreetmap.org/search');
    expect(url).toContain('format=json');
    expect(url).toContain('addressdetails=1');
    expect(url).toContain('limit=5');
    expect(url).toContain('q=mumbai');
    expect((init as RequestInit).headers).toMatchObject({
      'User-Agent': expect.stringContaining('CollabSphere'),
      'Accept-Language': 'en',
    });
  });

  it('URL-encodes the query', async () => {
    mockFetchOnce({ body: [] });
    await service.search('new york');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('q=new%20york');
  });

  it('trims Nominatim results to GeocodeResult shape', async () => {
    mockFetchOnce({
      body: [
        {
          display_name: 'Mumbai, Maharashtra, India',
          lat: '19.0760',
          lon: '72.8777',
          address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
        },
      ],
    });

    const results = await service.search('mumbai');

    expect(results).toEqual([
      {
        displayName: 'Mumbai, Maharashtra, India',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        lat: 19.076,
        lng: 72.8777,
      },
    ]);
  });

  it('falls back to town/village/municipality when city is missing', async () => {
    mockFetchOnce({
      body: [
        {
          display_name: 'Smalltown, CA, USA',
          lat: '36.0000',
          lon: '-120.0000',
          address: { town: 'Smalltown', state: 'California', country: 'USA' },
        },
      ],
    });

    const [result] = await service.search('smalltown');
    expect(result.city).toBe('Smalltown');
  });

  it('skips entries with missing lat or lon', async () => {
    mockFetchOnce({
      body: [
        { display_name: 'A', lat: '1', lon: '2', address: {} },
        { display_name: 'B', address: {} },
      ],
    });

    const results = await service.search('x');
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('A');
  });

  it('throws GEOCODE_UPSTREAM_ERROR on non-2xx response', async () => {
    mockFetchOnce({ ok: false, status: 503, body: [] });

    await expect(service.search('mumbai')).rejects.toMatchObject({
      statusCode: 502,
      code: 'GEOCODE_UPSTREAM_ERROR',
    });
  });

  it('throws GEOCODE_UPSTREAM_ERROR when fetch rejects', async () => {
    mockFetchReject(new Error('network down'));

    await expect(service.search('mumbai')).rejects.toBeInstanceOf(AppError);
    await expect(service.search('mumbai')).rejects.toMatchObject({
      code: 'GEOCODE_UPSTREAM_ERROR',
    });
  });
});
