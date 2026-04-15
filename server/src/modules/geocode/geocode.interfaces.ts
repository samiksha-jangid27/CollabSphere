// ABOUTME: Type contracts for the geocode module — service interface and result shape.
// ABOUTME: Consumed by the service, controller, and tests.

export interface GeocodeResult {
  displayName: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
}

export interface IGeocodeService {
  search(query: string): Promise<GeocodeResult[]>;
}
