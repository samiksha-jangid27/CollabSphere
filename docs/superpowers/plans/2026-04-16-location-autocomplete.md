# Location Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the removed `LocationPicker` with a single-field Nominatim-backed autocomplete, proxied through a new `/api/v1/geocode` backend endpoint, and restore location to the profile completeness calculation.

**Architecture:** New `geocode` module on the server (controller → service → Nominatim fetch) fronted by the existing auth + rate-limit + validate middleware stack. New `LocationSearch` React component on the client with a debounced search, dropdown, keyboard navigation, and clear-button. Drops into `ProfileEditForm` through the existing `GeoLocation` contract so submit logic is unchanged.

**Tech Stack:** Express 4 + TypeScript + Zod + Jest + Supertest (backend); Next.js 14 + React + Framer Motion + Axios (frontend); Nominatim OpenStreetMap API (upstream).

**Spec:** [`docs/superpowers/specs/2026-04-16-location-autocomplete-design.md`](../specs/2026-04-16-location-autocomplete-design.md)

---

## Task 1: Add BAD_GATEWAY status + error code + AppError helper

**Files:**
- Modify: `server/src/shared/constants.ts`
- Modify: `server/src/shared/errors.ts`

- [ ] **Step 1: Add `BAD_GATEWAY: 502` to `HTTP_STATUS` in `server/src/shared/constants.ts`**

Insert between `INTERNAL_SERVER_ERROR: 500` and the closing `} as const;`:

```typescript
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
} as const;
```

- [ ] **Step 2: Add error code and helper to `server/src/shared/errors.ts`**

In `ERROR_CODES`, add under the `// General` section:

```typescript
  // Geocode
  GEOCODE_UPSTREAM_ERROR: 'GEOCODE_UPSTREAM_ERROR',
```

In the `AppError` class, add a new static helper after `tooManyRequests` and before `internal`:

```typescript
  static badGateway(message: string, code: string = ERROR_CODES.GEOCODE_UPSTREAM_ERROR) {
    return new AppError(message, HTTP_STATUS.BAD_GATEWAY, code);
  }
```

- [ ] **Step 3: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/shared/constants.ts server/src/shared/errors.ts
git commit -m "feat(server): add BAD_GATEWAY status and GEOCODE_UPSTREAM_ERROR code"
```

---

## Task 2: Add `GEOCODE_USER_AGENT` env var

**Files:**
- Modify: `server/src/config/environment.ts`
- Modify: `server/.env.example` (if present)

- [ ] **Step 1: Add to the Zod schema in `environment.ts`**

Insert right before `CLIENT_URL`:

```typescript
  GEOCODE_USER_AGENT: z.string().default('CollabSphere/1.0 (dev@collabsphere.local)'),
```

- [ ] **Step 2: Add to `.env.example` (if file exists)**

```bash
# Optional — override the User-Agent header sent to Nominatim
GEOCODE_USER_AGENT=CollabSphere/1.0 (dev@collabsphere.local)
```

Check first: `ls server/.env.example 2>/dev/null`. If absent, skip this step.

- [ ] **Step 3: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/config/environment.ts server/.env.example 2>/dev/null
git commit -m "feat(server): add GEOCODE_USER_AGENT env var for Nominatim proxy"
```

---

## Task 3: Add `geocodeLimiter` instance

**Files:**
- Modify: `server/src/middleware/rateLimiter.ts`

- [ ] **Step 1: Add the limiter export at the bottom of the file**

```typescript
export const geocodeLimiter = createRateLimiter(60 * 1000, 30);
```

30 requests per minute per client. Debounced input at 300ms produces at most ~3 req/sec which is well below this.

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/rateLimiter.ts
git commit -m "feat(server): add geocodeLimiter (30 req/min)"
```

---

## Task 4: Create geocode module interfaces

**Files:**
- Create: `server/src/modules/geocode/geocode.interfaces.ts`

- [ ] **Step 1: Create the interfaces file**

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/geocode/geocode.interfaces.ts
git commit -m "feat(server): add GeocodeService interface and result type"
```

---

## Task 5: TDD — GeocodeService tests (red)

**Files:**
- Create: `server/tests/geocode/geocode.service.test.ts`

- [ ] **Step 1: Write the failing test file**

```typescript
// ABOUTME: Unit tests for GeocodeService — verifies Nominatim fetch wiring, trimming, errors.
// ABOUTME: Mocks global fetch; no network calls.

import { GeocodeService } from '@/modules/geocode/geocode.service';
import { AppError } from '@/shared/errors';

const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(response: Partial<Response> & { body?: unknown }) {
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
```

- [ ] **Step 2: Run test and confirm failure**

Run: `cd server && npx jest tests/geocode/geocode.service.test.ts`
Expected: FAIL — "Cannot find module '@/modules/geocode/geocode.service'"

- [ ] **Step 3: Commit (red state)**

```bash
git add server/tests/geocode/geocode.service.test.ts
git commit -m "test(server): add failing GeocodeService tests"
```

---

## Task 6: TDD — GeocodeService implementation (green)

**Files:**
- Create: `server/src/modules/geocode/geocode.service.ts`

- [ ] **Step 1: Create the service file**

```typescript
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
```

- [ ] **Step 2: Run tests — expect green**

Run: `cd server && npx jest tests/geocode/geocode.service.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 3: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/geocode/geocode.service.ts
git commit -m "feat(server): implement GeocodeService with Nominatim proxy"
```

---

## Task 7: Geocode validation schema

**Files:**
- Create: `server/src/modules/geocode/geocode.validation.ts`

- [ ] **Step 1: Create the validation file**

```typescript
// ABOUTME: Zod schema for the geocode search endpoint — validates the q query parameter.
// ABOUTME: Consumed by the validate() middleware on geocode routes.

import { z } from 'zod';

export const searchGeocodeSchema = z.object({
  query: z.object({
    q: z.string().min(2, 'Query must be at least 2 characters').max(120),
  }),
});
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/geocode/geocode.validation.ts
git commit -m "feat(server): add geocode search validation schema"
```

---

## Task 8: Geocode controller

**Files:**
- Create: `server/src/modules/geocode/geocode.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// ABOUTME: GeocodeController — thin HTTP handler delegating to GeocodeService.
// ABOUTME: Parses q from req.query, returns results in the standard API envelope.

import { Request, Response, NextFunction } from 'express';
import { IGeocodeService } from './geocode.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';

export class GeocodeController {
  constructor(private readonly service: IGeocodeService) {}

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query.q as string;
      const results = await this.service.search(q);
      sendSuccess(res, { results }, 'Geocode results', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/geocode/geocode.controller.ts
git commit -m "feat(server): add GeocodeController"
```

---

## Task 9: Geocode routes

**Files:**
- Create: `server/src/modules/geocode/geocode.routes.ts`

- [ ] **Step 1: Create the routes file**

```typescript
// ABOUTME: Geocode route definitions — wires auth, rate-limit, validation, and controller.
// ABOUTME: Mounted at /api/v1/geocode in index.ts.

import { Router } from 'express';
import { GeocodeController } from './geocode.controller';
import { GeocodeService } from './geocode.service';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { geocodeLimiter } from '../../middleware/rateLimiter';
import { searchGeocodeSchema } from './geocode.validation';

const service = new GeocodeService();
const controller = new GeocodeController(service);

const router = Router();

router.get(
  '/',
  authenticate,
  geocodeLimiter,
  validate(searchGeocodeSchema),
  controller.search,
);

export default router;
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/geocode/geocode.routes.ts
git commit -m "feat(server): wire geocode route with auth, rate limit, and validation"
```

---

## Task 10: Register routes in index.ts

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add import near other route imports**

Add after `import profileRoutes from './modules/profile/profile.routes';`:

```typescript
import geocodeRoutes from './modules/geocode/geocode.routes';
```

- [ ] **Step 2: Register the route**

Add after `app.use(\`${API_PREFIX}/profiles\`, profileRoutes);`:

```typescript
app.use(`${API_PREFIX}/geocode`, geocodeRoutes);
```

- [ ] **Step 3: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(server): mount geocode routes at /api/v1/geocode"
```

---

## Task 11: Integration test for `GET /api/v1/geocode`

**Files:**
- Create: `server/tests/geocode/geocode.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// ABOUTME: Integration tests for GET /api/v1/geocode — auth, validation, upstream error mapping.
// ABOUTME: Mocks global.fetch so no real Nominatim calls are made.

import request from 'supertest';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '../helpers/testApp';
import { User } from '@/models/User';
import { TokenService } from '@/modules/auth/token.service';

const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const tokenService = new TokenService();
const API = '/api/v1/geocode';

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
  global.fetch = ORIGINAL_FETCH;
  jest.clearAllMocks();
});

async function authedUser() {
  const user = await User.create({
    phone: '+919876543210',
    email: 'a@b.com',
    role: 'creator',
    phoneVerified: true,
  });
  const token = tokenService.generateAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });
  return { user, token };
}

describe('Geocode Integration', () => {
  it('returns trimmed results for a valid query', async () => {
    mockFetchOnce([
      {
        display_name: 'Mumbai, Maharashtra, India',
        lat: '19.0760',
        lon: '72.8777',
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      },
    ]);

    const { token } = await authedUser();
    const res = await request(app)
      .get(API)
      .query({ q: 'mumbai' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results).toEqual([
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

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(API).query({ q: 'mumbai' });
    expect(res.status).toBe(401);
  });

  it('rejects missing q', async () => {
    const { token } = await authedUser();
    const res = await request(app).get(API).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects q shorter than 2 characters', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .get(API)
      .query({ q: 'a' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 502 on upstream failure', async () => {
    mockFetchOnce([], false, 503);
    const { token } = await authedUser();
    const res = await request(app)
      .get(API)
      .query({ q: 'mumbai' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('GEOCODE_UPSTREAM_ERROR');
  });
});
```

- [ ] **Step 2: Run and confirm green**

Run: `cd server && npx jest tests/geocode/geocode.integration.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 3: Run the full test suite**

Run: `cd server && npm test`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add server/tests/geocode/geocode.integration.test.ts
git commit -m "test(server): add geocode integration tests"
```

---

## Task 12: Restore location to profile completeness

**Files:**
- Modify: `server/src/modules/profile/profile.service.ts`
- Modify: existing profile service test (if one exists — check `server/tests/profile/profile.service.test.ts`)

- [ ] **Step 1: Update `calculateCompleteness` in `profile.service.ts`**

Replace the current `checks` array with:

```typescript
    const checks: Array<[boolean, number]> = [
      [!!profile.displayName, 20],
      [!!profile.bio && profile.bio.length >= 20, 20],
      [!!profile.avatar, 20],
      [profile.niche.length > 0, 20],
      [!!profile.location?.coordinates, 20],
    ];
```

- [ ] **Step 2: Update any existing profile service unit test**

Check: `ls server/tests/profile/profile.service.test.ts 2>/dev/null`. If it exists and has completeness assertions, update the expected values to match the new 5×20 distribution. Otherwise skip this step.

- [ ] **Step 3: Run profile tests**

Run: `cd server && npx jest tests/profile`
Expected: All PASS.

- [ ] **Step 4: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/profile/profile.service.ts server/tests/profile 2>/dev/null
git commit -m "feat(server): restore location to profile completeness (5x20)"
```

---

## Task 13: Client geocode service

**Files:**
- Create: `client/src/services/geocodeService.ts`

- [ ] **Step 1: Create the client service**

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/services/geocodeService.ts
git commit -m "feat(client): add geocodeService API wrapper"
```

---

## Task 14: `LocationSearch` component

**Files:**
- Create: `client/src/components/profile/LocationSearch.tsx`

- [ ] **Step 1: Create the component**

```tsx
// ABOUTME: Editorial Noir location autocomplete — debounced Nominatim search with dropdown selection.
// ABOUTME: Emits GeoJSON Point + city/state/country through onChange. Single field, no manual coords.

"use client";

import { useEffect, useRef, useState } from "react";
import { geocodeService, type GeocodeResult } from "@/services/geocodeService";
import type { GeoLocation } from "@/types/profile";

interface LocationSearchProps {
  value?: GeoLocation;
  onChange: (next: GeoLocation | undefined) => void;
}

type DropdownState =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "results"; items: GeocodeResult[] }
  | { kind: "empty" }
  | { kind: "error" };

function formatInitial(value?: GeoLocation): string {
  if (!value) return "";
  return [value.city, value.state, value.country].filter(Boolean).join(", ");
}

export function LocationSearch({ value, onChange }: LocationSearchProps) {
  const [inputText, setInputText] = useState(formatInitial(value));
  const [dropdown, setDropdown] = useState<DropdownState>({ kind: "hidden" });
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [hasSelection, setHasSelection] = useState(Boolean(value));

  const containerRef = useRef<HTMLDivElement>(null);
  const requestToken = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (hasSelection) return;
    if (inputText.trim().length < 2) {
      setDropdown({ kind: "hidden" });
      return;
    }

    const token = ++requestToken.current;
    setDropdown({ kind: "loading" });

    debounceTimer.current = setTimeout(() => {
      geocodeService
        .search(inputText.trim())
        .then((items) => {
          if (token !== requestToken.current) return;
          if (items.length === 0) setDropdown({ kind: "empty" });
          else setDropdown({ kind: "results", items });
        })
        .catch(() => {
          if (token !== requestToken.current) return;
          setDropdown({ kind: "error" });
        });
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputText, hasSelection]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectResult(result: GeocodeResult) {
    const next: GeoLocation = {
      type: "Point",
      coordinates: [result.lng, result.lat],
      city: result.city,
      state: result.state,
      country: result.country,
    };
    setInputText(result.displayName);
    setHasSelection(true);
    setIsOpen(false);
    setActiveIndex(-1);
    setDropdown({ kind: "hidden" });
    onChange(next);
  }

  function clearSelection() {
    setInputText("");
    setHasSelection(false);
    setIsOpen(false);
    setActiveIndex(-1);
    setDropdown({ kind: "hidden" });
    onChange(undefined);
  }

  function handleInputChange(next: string) {
    setInputText(next);
    if (hasSelection) {
      setHasSelection(false);
      onChange(undefined);
    }
    setIsOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (dropdown.kind !== "results") {
      if (e.key === "Escape") setIsOpen(false);
      return;
    }
    const items = dropdown.items;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = activeIndex >= 0 ? items[activeIndex] : items[0];
      if (pick) selectResult(pick);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && focused && dropdown.kind !== "hidden";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setIsOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a city"
          className="type-body-l text-paper block w-full bg-transparent py-2 pr-8 outline-none placeholder:text-paper-muted"
          style={{
            borderBottom: `1px solid ${focused ? "var(--amber)" : "var(--line)"}`,
            transition: "border-color 150ms linear",
          }}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="location-search-listbox"
        />
        {hasSelection && (
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear location"
            className="type-eyebrow text-paper-muted hover:text-paper"
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              padding: "4px 6px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 150ms linear",
            }}
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id="location-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-50"
          style={{
            top: "calc(100% + 4px)",
            background: "var(--ink-1)",
            border: "1px solid var(--line)",
          }}
        >
          {dropdown.kind === "loading" && (
            <div className="type-body-s text-paper-muted" style={{ padding: "10px 14px" }}>
              Searching…
            </div>
          )}
          {dropdown.kind === "empty" && (
            <div className="type-body-s text-paper-muted" style={{ padding: "10px 14px" }}>
              No matches
            </div>
          )}
          {dropdown.kind === "error" && (
            <div className="type-body-s text-paper-muted" style={{ padding: "10px 14px" }}>
              Search unavailable
            </div>
          )}
          {dropdown.kind === "results" &&
            dropdown.items.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={`${item.displayName}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectResult(item);
                  }}
                  className="type-body-m text-paper block w-full text-left"
                  style={{
                    padding: "10px 14px",
                    background: active ? "var(--ink-2)" : "transparent",
                    borderLeft: `2px solid ${active ? "var(--amber)" : "transparent"}`,
                    cursor: "pointer",
                    transition: "background 120ms linear, border-color 120ms linear",
                  }}
                >
                  {item.displayName}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/profile/LocationSearch.tsx
git commit -m "feat(client): add LocationSearch autocomplete component"
```

---

## Task 15: Wire `LocationSearch` into `ProfileEditForm`

**Files:**
- Modify: `client/src/components/profile/ProfileEditForm.tsx`

- [ ] **Step 1: Restore `GeoLocation` import**

Update the type import block:

```tsx
import type {
  CreateProfileInput,
  GeoLocation,
  Profile,
} from "@/types/profile";
```

- [ ] **Step 2: Import `LocationSearch`**

Add below `import { NicheSelector } from "./NicheSelector";`:

```tsx
import { LocationSearch } from "./LocationSearch";
```

- [ ] **Step 3: Restore location state**

In the component body, add below `const [niche, setNiche] = useState<string[]>(initial?.niche ?? []);`:

```tsx
  const [location, setLocation] = useState<GeoLocation | undefined>(
    initial?.location
  );
```

- [ ] **Step 4: Include location in the submit payload**

Update the `payload` object:

```tsx
    const payload: CreateProfileInput = {
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      niche,
      location,
    };
```

- [ ] **Step 5: Render the `LocationSearch` section**

In the JSX, add a new `motion.div` section immediately after the Niche `motion.div` and before the `<motion.hr variants={fadeUp} className="rule-line my-12" />`:

```tsx
      <motion.div variants={fadeUp} className="mb-12">
        <span className="type-label text-paper-dim block uppercase">
          Location
        </span>
        <div className="mt-4">
          <LocationSearch value={location} onChange={setLocation} />
        </div>
      </motion.div>
```

- [ ] **Step 6: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 7: Manual QA in the dev server**

Run: `npm run dev` (from repo root)
Navigate to `http://localhost:3000/profile/me/edit`. Verify:
- Typing "mum" shows dropdown with Mumbai results
- Click selects — input fills with display name, × appears
- Click × clears input and dropdown stays empty
- Keyboard ↓↑ navigates, Enter selects
- Escape closes dropdown
- Saving persists location (reload profile page, see city/state/country in sidebar? — it'll show "creator" today; verify via `GET /api/v1/profiles/me` in Network tab that `location.coordinates` exists)

- [ ] **Step 8: Commit**

```bash
git add client/src/components/profile/ProfileEditForm.tsx
git commit -m "feat(client): wire LocationSearch into ProfileEditForm"
```

---

## Task 16: Delete the old `LocationPicker`

**Files:**
- Delete: `client/src/components/profile/LocationPicker.tsx`

- [ ] **Step 1: Verify nothing imports it**

Run: `grep -r "LocationPicker" client/src server/src 2>/dev/null`
Expected: No results (or only the file itself).

- [ ] **Step 2: Delete the file**

```bash
rm "client/src/components/profile/LocationPicker.tsx"
```

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A client/src/components/profile/LocationPicker.tsx
git commit -m "chore(client): remove unused LocationPicker component"
```

---

## Task 17: Document the endpoint

**Files:**
- Modify: `docs/API_SPEC.md`

- [ ] **Step 1: Check if the file exists**

Run: `ls docs/API_SPEC.md 2>/dev/null`
If absent, skip this task entirely.

- [ ] **Step 2: Add the new endpoint section**

Append (or insert in alphabetical order with other endpoints):

````markdown
### `GET /api/v1/geocode`

Search for places via Nominatim (OpenStreetMap) proxy.

**Auth:** required
**Rate limit:** 30 req/min per client

**Query parameters:**
- `q` (string, required, 2–120 chars) — search query

**Response 200:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "displayName": "Mumbai, Maharashtra, India",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "lat": 19.076,
        "lng": 72.8777
      }
    ]
  },
  "message": "Geocode results"
}
```

**Errors:**
- `400 VALIDATION_ERROR` — `q` missing or < 2 chars
- `401 AUTH_INVALID_TOKEN` — unauthenticated
- `429 TOO_MANY_REQUESTS` — rate limited
- `502 GEOCODE_UPSTREAM_ERROR` — Nominatim unavailable
````

- [ ] **Step 3: Commit**

```bash
git add docs/API_SPEC.md
git commit -m "docs: document GET /api/v1/geocode endpoint"
```

---

## Final verification

- [ ] **Step 1: Backend tests**

Run: `cd server && npm test`
Expected: All PASS.

- [ ] **Step 2: Backend typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Client typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: End-to-end smoke test**

Start the dev server with `npm run dev`. In the browser at `http://localhost:3000/profile/me/edit`:
1. Type "mumbai" in the Location field
2. Wait ~300ms, see dropdown with 1+ results
3. Click a result, see input fill + × appear
4. Click Save
5. Navigate to `/profile/me`, open DevTools → Network → GET `/profiles/me`, confirm `data.profile.location.coordinates = [72.8777, 19.076]`
6. Navigate back to edit form, confirm the location pre-fills

- [ ] **Step 5: Report**

Summarize to Sarvesh: number of commits, test counts (X backend tests added, Y total passing), any deviations from the spec, and a link to the edit page for visual verification.

---

## Self-Review

- **Spec coverage:** Every section of the spec maps to tasks — backend module (Tasks 4–11), geocodeService client (13), LocationSearch component (14), ProfileEditForm wiring (15), LocationPicker removal (16), completeness (12), API docs (17), error handling (1), env (2), rate limit (3).
- **No placeholders:** All code blocks are complete; no TBDs, TODOs, or "similar to above."
- **Type consistency:** `GeocodeResult` has identical field names in service, interfaces, client service, and tests (`displayName`, `city`, `state`, `country`, `lat`, `lng`). `GeoLocation.coordinates` is consistently `[lng, lat]` throughout.
- **Known fragility:** Task 15 step 3 assumes the line `const [niche, setNiche] = …` still exists unchanged. If `ProfileEditForm.tsx` diverges, the insertion point may need adjustment — fall back to adding state after `setNiche`.
