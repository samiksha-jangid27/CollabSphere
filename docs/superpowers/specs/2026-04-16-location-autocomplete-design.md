# Location Autocomplete — Design Spec

**Date:** 2026-04-16
**Author:** Sarvesh (with Claude Opus planning)
**Status:** Approved for implementation

## Context

The profile edit form previously had a `LocationPicker` component with four separate fields (city, state, country, manual lat/lng). It had a UX bug where city/state/country changes silently dropped if coordinates were blank, and requiring users to hand-enter GeoJSON coordinates is hostile.

We removed the component from the form and are re-implementing it correctly with a single autocomplete search field backed by Nominatim (OpenStreetMap) through a backend proxy.

## Goals

1. One labeled field on the profile edit form for location.
2. Type to search, see a dropdown of place suggestions, click/press Enter to fill city + state + country + GeoJSON coordinates in one action.
3. Nominatim is accessed through a server-side proxy to comply with its usage policy (User-Agent, rate limits, logging).
4. Re-add location to the profile completeness calculation.
5. Match Editorial Noir aesthetics — hairline borders, no rounded corners, amber accent.

## Non-Goals

- Reverse geocoding (clicking a map).
- Offline suggestions or caching across sessions.
- Country-restricted search (future work).
- Frontend unit tests (client has no Jest/Vitest setup yet; backend carries the tests).

## Architecture

### Backend — new `geocode` module

Path: `server/src/modules/geocode/`

Files:
- `geocode.controller.ts` — thin HTTP handler, delegates to service
- `geocode.service.ts` — implements `IGeocodeService`, wraps Nominatim fetch
- `geocode.interfaces.ts` — `IGeocodeService`, `GeocodeResult`, `SearchInput`
- `geocode.routes.ts` — wires `authenticate` + `rateLimiter` + `validate` middleware
- `geocode.validation.ts` — Zod schema for query param

No repository (no DB interaction).

### Frontend — new `LocationSearch` component

- `client/src/components/profile/LocationSearch.tsx` — controlled input + debounced fetch + floating dropdown
- `client/src/services/geocodeService.ts` — typed wrapper around the Axios instance calling `/api/v1/geocode`
- Delete `client/src/components/profile/LocationPicker.tsx` (unused after the swap)
- Wire `LocationSearch` into `ProfileEditForm.tsx` replacing the removed location section

Data contract unchanged: `value: GeoLocation | undefined` in, `onChange(next: GeoLocation | undefined)` out. `GeoLocation` type in `client/src/types/profile.ts` stays as-is.

## Backend — Endpoint Detail

**Route:** `GET /api/v1/geocode?q=<query>`

**Middleware chain:** `authenticate` → `rateLimiter(30 req/min per user)` → `validate(searchSchema)` → controller

**Zod validation:**
```ts
const searchSchema = z.object({
  query: z.object({
    q: z.string().min(2).max(120),
  }),
});
```

**Service contract:**
```ts
interface IGeocodeService {
  search(q: string): Promise<GeocodeResult[]>;
}

interface GeocodeResult {
  displayName: string;  // "Mumbai, Maharashtra, India"
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
}
```

**Nominatim call:**
- URL: `https://nominatim.openstreetmap.org/search`
- Query params: `format=json`, `addressdetails=1`, `limit=5`, `q=<encoded>`
- Headers: `User-Agent: CollabSphere/1.0 (dev@collabsphere.local)`, `Accept-Language: en`
- Timeout: 5 seconds via `AbortController`
- Uses Node 20's global `fetch`

**Response trimming:** From Nominatim's raw response, pull:
- `display_name` → `displayName`
- `address.city || address.town || address.village || address.municipality` → `city`
- `address.state` → `state`
- `address.country` → `country`
- `parseFloat(lat)` → `lat`
- `parseFloat(lon)` → `lng`

Skip entries missing lat/lon.

**Success response:**
```json
{
  "success": true,
  "data": { "results": [...] },
  "message": "Geocode results"
}
```

**Error mapping:**
- Timeout / network error → `AppError.badGateway('Geocode service unavailable', 'GEOCODE_UPSTREAM_ERROR')` → HTTP 502
- Nominatim returns non-200 → same
- New error code `GEOCODE_UPSTREAM_ERROR` added to `shared/errors.ts`

**Env var:** Add to `server/src/config/environment.ts`:
```ts
GEOCODE_USER_AGENT: z.string().default('CollabSphere/1.0 (dev@collabsphere.local)'),
```

**Wiring:** Register in `server/src/index.ts`:
```ts
app.use(`${API_PREFIX}/geocode`, geocodeRoutes);
```

## Frontend — Component Detail

### `geocodeService.ts`

```ts
export interface GeocodeResult { /* mirrors server */ }

export const geocodeService = {
  async search(q: string): Promise<GeocodeResult[]> {
    const { data } = await api.get('/geocode', { params: { q } });
    return data.data.results;
  },
};
```

### `LocationSearch.tsx`

**Props:**
```ts
interface LocationSearchProps {
  value?: GeoLocation;
  onChange: (next: GeoLocation | undefined) => void;
}
```

**Internal state:**
- `inputText: string` — what's in the field
- `results: GeocodeResult[]` — latest search results
- `isOpen: boolean` — dropdown visible
- `isLoading: boolean` — request in flight
- `activeIndex: number` — keyboard highlight (-1 = none)
- `error: 'none' | 'no-results' | 'upstream'`
- `requestToken: number` — ref for race safety

**Init:** If `value` is provided on first render, format it as `"{city}, {state}, {country}"` (filter falsy) and set `inputText` to that. Do not run a search.

**Debounce:** 300ms via `setTimeout` + cleanup in `useEffect`. Skip search if `inputText.length < 2`.

**Race safety:** Increment `requestToken` on each new search. Only apply results if the completed request's token matches the current token. Use a `useRef` for the token to avoid re-render loops.

**Selection:** When user clicks a result or presses Enter:
1. Set `inputText` to the result's `displayName`
2. Call `onChange({ type: 'Point', coordinates: [result.lng, result.lat], city: result.city, state: result.state, country: result.country })`
3. Close dropdown
4. Reset `activeIndex = -1`

**Clear:** × button on the right side of the input (visible when `value` is set). Clicking:
1. `setInputText('')`
2. `onChange(undefined)`
3. Close dropdown

**Keyboard:**
- ↓ — move `activeIndex` forward (clamp to last result)
- ↑ — move `activeIndex` backward (clamp to 0, -1 if list empty)
- Enter — select `results[activeIndex]` if valid, else first result
- Escape — close dropdown, don't clear value
- Tab — close dropdown (let browser handle focus)

**Click outside:** Close dropdown via `useEffect` + document click listener on an encompassing ref.

### Styling (Editorial Noir)

- Input: plain `<input>` with `borderBottom: 1px solid var(--line)`, amber on focus (same pattern as existing form fields)
- Dropdown: absolutely positioned below input, `background: var(--ink-1)`, `border: 1px solid var(--line)`, no border-radius, no shadow
- Result rows: `padding: 10px 14px`, `type-body-m`, active row = `background: var(--ink-2)` + `border-left: 2px solid var(--amber)`
- Loading/empty/error rows: `type-body-s text-paper-muted`, same padding
- Clear × button: small, `type-eyebrow text-paper-muted`, hover to `text-paper`

### Integration in `ProfileEditForm`

Add a new `motion.div variants={fadeUp} className="mb-12"` section with label "Location" and `<LocationSearch value={location} onChange={setLocation} />`. Reintroduce `location: GeoLocation | undefined` state and pass it in the submit payload as `location: location || undefined`.

## Completeness

Update `calculateCompleteness` in `server/src/modules/profile/profile.service.ts`:

```ts
const checks: Array<[boolean, number]> = [
  [!!profile.displayName, 20],
  [!!profile.bio && profile.bio.length >= 20, 20],
  [!!profile.avatar, 20],
  [profile.niche.length > 0, 20],
  [!!profile.location?.coordinates, 20],
];
```

5 checks × 20 = 100. Clean.

## Error Handling Summary

| Condition | User sees | Network |
|---|---|---|
| < 2 chars | Dropdown hidden | No request |
| Searching | "Searching…" row | In flight |
| No results | "No matches" row | Response received |
| Nominatim 5xx or timeout | "Search unavailable" row | 502 from our backend |
| Rate limited by our backend | "Search unavailable" row | 429 from our backend |
| Auth expired | Axios interceptor refreshes | — |

## Testing

### Backend (TDD, Jest + Supertest + mocked fetch)

`server/tests/geocode/geocode.service.test.ts`:
- Calls Nominatim with proper User-Agent header (verify via mock)
- Encodes query correctly
- Trims response to `GeocodeResult[]` shape
- Skips entries missing lat/lon
- Throws `GEOCODE_UPSTREAM_ERROR` on non-200
- Throws `GEOCODE_UPSTREAM_ERROR` on timeout

`server/tests/geocode/geocode.routes.test.ts`:
- `GET /api/v1/geocode?q=mumbai` with valid auth returns 200 + trimmed results (mocked upstream)
- Without auth returns 401
- Without `q` or with `q.length < 2` returns 400
- On upstream error returns 502 with error code

### Frontend

Manual QA checklist (no unit tests):
- Type "mum" → dropdown appears with Mumbai results
- Click a result → input fills, form submit includes correct GeoJSON
- Clear × button → input empty, submit omits location
- Keyboard ↓↑ + Enter works
- Escape closes without clearing
- Editing an existing profile with a location pre-fills the display text

## File Manifest

**New:**
- `server/src/modules/geocode/geocode.controller.ts`
- `server/src/modules/geocode/geocode.service.ts`
- `server/src/modules/geocode/geocode.routes.ts`
- `server/src/modules/geocode/geocode.validation.ts`
- `server/src/modules/geocode/geocode.interfaces.ts`
- `server/tests/geocode/geocode.service.test.ts`
- `server/tests/geocode/geocode.routes.test.ts`
- `client/src/components/profile/LocationSearch.tsx`
- `client/src/services/geocodeService.ts`

**Modified:**
- `server/src/index.ts` — register geocode routes
- `server/src/config/environment.ts` — add `GEOCODE_USER_AGENT`
- `server/src/shared/errors.ts` — add `GEOCODE_UPSTREAM_ERROR` code + `AppError.badGateway` helper (if missing)
- `server/src/modules/profile/profile.service.ts` — update `calculateCompleteness` to 5×20
- `client/src/components/profile/ProfileEditForm.tsx` — restore location state + render `LocationSearch`
- `docs/API_SPEC.md` — document `GET /api/v1/geocode`

**Deleted:**
- `client/src/components/profile/LocationPicker.tsx`

## Open Questions

None. Ready for implementation plan.
