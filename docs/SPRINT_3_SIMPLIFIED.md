# Sprint 3 — Discovery & Search (Simplified)

**Goal:** Users can discover creators by filtering on city, niche, and platform.

**Duration:** Weeks 5–6 (2 weeks)

**Effort:** ~10–12 hours total

**Status:** Not started

---

## Overview

Sprint 3 adds a discovery page where users search for creators. Instead of the overcomplicated Notion spec, we're shipping the **absolute minimum that works**:

- **One search endpoint** that filters by city, niche, and platform
- **No geospatial queries**, no pagination, no sorting
- **One discover page** with a search bar + filter pills
- **Reuse ProfileCard from Sprint 2**

We defer geospatial search, follower filtering, sorting, and pagination to Sprint 3.5 (optional polish week).

---

## Backend Tasks

### Task 1: Create Search Module Structure
**File:** `server/src/modules/search/`

Create 6 files:
- `search.interfaces.ts` — TypeScript interfaces
- `search.validation.ts` — Zod schemas for query params
- `search.repository.ts` — MongoDB queries
- `search.service.ts` — Business logic
- `search.controller.ts` — HTTP handlers
- `search.routes.ts` — Route definitions

**Deliverable:** Empty stubs with correct class structure (no logic yet).

---

### Task 2: Implement Search Repository
**File:** `server/src/modules/search/search.repository.ts`

Extend `BaseRepository<Profile>`. Implement one method:

```typescript
searchProfiles(filters: {
  city?: string;
  niche?: string;
  platform?: string;
}) => Promise<Profile[]>
```

**Logic:**
- Build MongoDB query object: `{ $and: [...] }`
- Add city filter: `location.city === filters.city` (case-insensitive)
- Add niche filter: `niche === filters.niche`
- Add platform filter: `socialAccounts.platform includes filters.platform`
- Return first 20 results (hardcoded limit)
- **No pagination, no sorting**

**Example query:**
```javascript
{
  "location.city": "Mumbai",
  "niche": "fashion"
}
```

---

### Task 3: Implement Search Service
**File:** `server/src/modules/search/search.service.ts`

Implements `ISearchService`. One public method:

```typescript
searchProfiles(filters: SearchFilters): Promise<Profile[]>
```

**Logic:**
- Validate filters exist (at least one)
- Call `searchRepository.searchProfiles(filters)`
- Return results

**Error handling:**
- Throw `AppError` with code `INVALID_SEARCH_FILTERS` if no filters provided
- Throw `AppError` with code `SEARCH_FAILED` if query fails

---

### Task 4: Implement Search Controller
**File:** `server/src/modules/search/search.controller.ts`

Implement two endpoints:

#### Endpoint 1: `GET /api/v1/search/profiles`

**Query params:**
```
?city=Mumbai&niche=fashion&platform=instagram
```

All params are **optional**. User must provide at least one.

**Response (success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "avatar": "...",
      "name": "...",
      "niche": "fashion",
      "location": { "city": "Mumbai", ... },
      "followerCount": 50000,
      "socialAccounts": [ ... ]
    }
  ],
  "message": "Found 20 profiles"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SEARCH_FILTERS",
    "message": "Provide at least one filter (city, niche, or platform)"
  }
}
```

**Logic:**
1. Extract query params: `city`, `niche`, `platform`
2. Validate with Zod schema
3. Call `searchService.searchProfiles(filters)`
4. Return results using `sendSuccess()`

---

#### Endpoint 2: `GET /api/v1/search/cities`

City autocomplete for the search bar. Returns distinct city values.

**Query params:**
```
?q=mum
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "city": "Mumbai", "state": "Maharashtra", "country": "India" },
    { "city": "Mumbia", "state": "...", "country": "..." }
  ]
}
```

**Logic:**
1. Extract `q` query param (search term)
2. Query `Profile` collection, distinct `location.city` where city matches query (regex, case-insensitive)
3. Return first 10 results
4. If no `q` provided, return empty array

---

### Task 5: Create Routes
**File:** `server/src/modules/search/search.routes.ts`

```typescript
const router = express.Router();

router.get('/profiles', searchController.searchProfiles);
router.get('/cities', searchController.searchCities);

export default router;
```

No auth required (public endpoints).

---

### Task 6: Register Routes in Express
**File:** `server/src/index.ts`

Add this line after other route registrations:
```typescript
app.use(`${API_PREFIX}/search`, searchRoutes);
```

---

### Task 7: Add MongoDB Indexes
**File:** `server/src/models/Profile.ts` or migration script

Add these indexes to Profile schema:
```javascript
{
  "location.city": 1
}

{
  "niche": 1
}

// For platform filtering (social accounts array)
{
  "socialAccounts.platform": 1
}
```

**Why:** Faster queries on these fields.

---

### Task 8: Write Tests
**File:** `server/tests/search/`

Create:
- `search.service.test.ts` — Unit tests for search logic
- `search.integration.test.ts` — Integration tests for endpoints

**Test scenarios:**

**Service tests:**
- `searchProfiles({ city: "Mumbai", niche: "fashion" })` returns profiles
- `searchProfiles({})` throws error (no filters)
- `searchProfiles({ city: "InvalidCity" })` returns empty array

**Integration tests:**
- `GET /api/v1/search/profiles?city=Mumbai` returns 200 + profiles
- `GET /api/v1/search/profiles?city=Mumbai&niche=fashion` returns 200 + filtered profiles
- `GET /api/v1/search/profiles` (no params) returns 400 + error
- `GET /api/v1/search/cities?q=mum` returns 200 + city suggestions
- `GET /api/v1/search/cities` (no q param) returns 200 + empty array

---

## Frontend Tasks

### Task 9: Create Discover Page
**File:** `client/src/app/(main)/discover/page.tsx`

**Layout:**
```
┌─────────────────────────────┐
│ CollabSphere                │  (Header from layout)
├─────────────────────────────┤
│                             │
│  🔍 SearchBar (city)       │  (Component)
│                             │
│  ☐ Niche  ☐ Platform      │  (FilterPanel component)
│                             │
│  [Profile Card] [Card] ... │  (ProfileGrid component)
│  [Card] [Card] [Card]      │
│                             │
└─────────────────────────────┘
```

**Logic:**
1. Import `SearchBar`, `FilterPanel`, `ProfileGrid` components
2. State: `{ city, niche, platform, results, loading, error }`
3. When user clicks "Search" or changes filters, call `useSearch()` hook
4. Pass results to `ProfileGrid`

**Responsive:**
- Mobile: 1 column grid
- Tablet (640px+): 2 columns
- Desktop (1024px+): 3 columns

---

### Task 10: Create SearchBar Component
**File:** `client/src/components/search/SearchBar.tsx`

**Props:**
```typescript
interface SearchBarProps {
  onSearch: (city: string) => void;
  isLoading?: boolean;
}
```

**Features:**
- Text input for city
- Autocomplete dropdown (calls `/search/cities` as user types)
- "Search" button
- Show loading state during autocomplete

**Logic:**
1. User types in input → debounce 300ms
2. Call `SearchService.getCities(query)`
3. Display dropdown with suggestions
4. User clicks suggestion → fill input
5. User clicks "Search" button → call `onSearch(city)`

---

### Task 11: Create FilterPanel Component
**File:** `client/src/components/search/FilterPanel.tsx`

**Props:**
```typescript
interface FilterPanelProps {
  onFilter: (filters: { niche?: string; platform?: string }) => void;
}
```

**Features:**
- Niche dropdown (options: `"fashion", "tech", "lifestyle", "fitness", "travel", "food", "entertainment", "business", "education", "other"`)
- Platform dropdown (options: `"instagram", "tiktok", "youtube", "twitter", "linkedin"`)
- Clear filters button

**Logic:**
1. User selects niche and/or platform
2. Call `onFilter()` with selected values
3. Clear button resets both to `undefined`

---

### Task 12: Create ProfileGrid Component
**File:** `client/src/components/search/ProfileGrid.tsx`

**Props:**
```typescript
interface ProfileGridProps {
  profiles: Profile[];
  isLoading?: boolean;
}
```

**Features:**
- Display array of profiles as grid
- Each cell is a `ProfileCard` (reuse from Sprint 2)
- Empty state: "No creators found. Try different filters."
- Loading skeleton (5–6 cards) while fetching

---

### Task 13: Create useSearch Hook
**File:** `client/src/hooks/useSearch.ts`

```typescript
interface UseSearchResult {
  results: Profile[];
  loading: boolean;
  error: string | null;
  search: (filters: SearchFilters) => Promise<void>;
}

export function useSearch(): UseSearchResult {
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (filters: SearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await SearchService.searchProfiles(filters);
      setResults(data);
    } catch (err) {
      setError("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
}
```

---

### Task 14: Update SearchService API Client
**File:** `client/src/services/api.ts` or create `client/src/services/SearchService.ts`

Add two methods:

```typescript
async searchProfiles(filters: {
  city?: string;
  niche?: string;
  platform?: string;
}): Promise<Profile[]> {
  const response = await apiClient.get('/search/profiles', { params: filters });
  return response.data.data; // Extract from response wrapper
}

async getCities(query: string): Promise<any[]> {
  const response = await apiClient.get('/search/cities', { params: { q: query } });
  return response.data.data;
}
```

---

## Database Tasks

### Task 15: Create Indexes
Already covered in Backend Task 7.

**Summary:**
- Add index on `location.city`
- Add index on `niche`
- Add index on `socialAccounts.platform`

Run before testing.

---

## Documentation Tasks

### Task 16: Update API_SPEC.md

Add two new endpoints (after existing Profile endpoints):

```markdown
## Endpoint 16: Search Profiles

**Method:** GET
**Path:** `/api/v1/search/profiles`
**Auth:** Public
**Query Params:**
- `city` (string, optional) — city name
- `niche` (string, optional) — creator niche
- `platform` (string, optional) — social platform

**Example:**
```bash
GET /api/v1/search/profiles?city=Mumbai&niche=fashion
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "profile-1",
      "userId": "user-1",
      "avatar": "https://...",
      "name": "John Doe",
      "niche": "fashion",
      "location": {
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      },
      "followerCount": 50000,
      "socialAccounts": [...]
    }
  ]
}
```

**Response (400 - No filters):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SEARCH_FILTERS",
    "message": "Provide at least one filter"
  }
}
```

---

## Endpoint 17: Get Cities

**Method:** GET
**Path:** `/api/v1/search/cities`
**Auth:** Public
**Query Params:**
- `q` (string, optional) — search term

**Example:**
```bash
GET /api/v1/search/cities?q=mum
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "city": "Mumbai", "state": "Maharashtra", "country": "India" }
  ]
}
```
```

---

### Task 17: Add Error Codes
**File:** `server/src/shared/errors.ts`

Add these error codes:

```typescript
INVALID_SEARCH_FILTERS: {
  statusCode: 400,
  message: 'Provide at least one filter (city, niche, or platform)'
},
SEARCH_FAILED: {
  statusCode: 500,
  message: 'Search failed. Please try again.'
}
```

---

## Testing Checklist

Before marking Sprint 3 complete:

### Backend
- [ ] `npm test` passes all search module tests
- [ ] `curl http://localhost:5001/api/v1/search/profiles?city=Mumbai` returns profiles
- [ ] `curl http://localhost:5001/api/v1/search/cities?q=mum` returns cities
- [ ] Invalid query params return 400

### Frontend
- [ ] `/discover` page loads without errors
- [ ] SearchBar autocomplete works (types → suggestions appear)
- [ ] FilterPanel dropdowns work
- [ ] Clicking "Search" calls API and displays results
- [ ] ProfileCard displays all info correctly
- [ ] Empty state shows when no results
- [ ] Responsive on mobile/tablet/desktop

### Integration
- [ ] Logged-in user can navigate to `/discover`
- [ ] Search results load in <1s
- [ ] Clicking profile card navigates to profile detail page (already works from Sprint 2)

---

## File Summary

**New Backend Files:**
- `server/src/modules/search/search.controller.ts`
- `server/src/modules/search/search.service.ts`
- `server/src/modules/search/search.repository.ts`
- `server/src/modules/search/search.routes.ts`
- `server/src/modules/search/search.validation.ts`
- `server/src/modules/search/search.interfaces.ts`
- `server/tests/search/search.service.test.ts`
- `server/tests/search/search.integration.test.ts`

**New Frontend Files:**
- `client/src/app/(main)/discover/page.tsx`
- `client/src/components/search/SearchBar.tsx`
- `client/src/components/search/FilterPanel.tsx`
- `client/src/components/search/ProfileGrid.tsx`
- `client/src/hooks/useSearch.ts`

**Modified Files:**
- `server/src/index.ts` — register search routes
- `server/src/models/Profile.ts` — add indexes
- `server/src/shared/errors.ts` — add error codes
- `client/src/services/api.ts` — add search methods
- `docs/API_SPEC.md` — add endpoints
- `docs/DATA_MODEL.md` — note indexes

---

## What's NOT in Sprint 3

These go to Sprint 3.5 or later:

- ❌ Geospatial radius search (`$near` queries)
- ❌ Follower range filtering
- ❌ Sorting (distance, followers, recent)
- ❌ Pagination UI + logic
- ❌ Verification status filter
- ❌ Advanced search (combined filters with aggregation pipeline)
- ❌ Saved/bookmarked searches

---

## Success Criteria

Sprint 3 is **COMPLETE** when:

✅ Users can search for creators by city, niche, and platform  
✅ Search results display in a grid with ProfileCards  
✅ Autocomplete works for city selection  
✅ All API endpoints return 200 with correct data  
✅ All tests pass (unit + integration)  
✅ `/discover` page is responsive  
✅ Docs updated with new endpoints and error codes  
✅ No console errors or warnings  

**Estimated time: 10–12 hours**
