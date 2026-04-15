// ABOUTME: GeocodeService — wraps Nominatim /search with proper User-Agent, timeout, and error mapping.
// ABOUTME: Trims the upstream payload to GeocodeResult[] and throws AppError.badGateway on failure.

import { config } from '../../config/environment';
import { AppError } from '../../shared/errors';
import { GeocodeResult, IGeocodeService } from './geocode.interfaces';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
}

interface NominatimEntry {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 5000;

export class GeocodeService implements IGeocodeService {
  async search(query: string): Promise<GeocodeResult[]> {
    const url = `${NOMINATIM_URL}?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': config.GEOCODE_USER_AGENT,
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      throw AppError.badGateway('Geocode service unavailable');
    }
    clearTimeout(timer);

    if (!response.ok) {
      throw AppError.badGateway('Geocode service unavailable');
    }

    const entries = (await response.json()) as NominatimEntry[];
    return entries
      .filter((e) => e.lat != null && e.lon != null && e.display_name)
      .map((e) => {
        const address = e.address ?? {};
        const city = address.city ?? address.town ?? address.village ?? address.municipality;
        return {
          displayName: e.display_name!,
          city,
          state: address.state,
          country: address.country,
          lat: parseFloat(e.lat!),
          lng: parseFloat(e.lon!),
        };
      });
  }
}
