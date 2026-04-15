// ABOUTME: Project-level Claude Code guardrails for CollabSphere.
// ABOUTME: Defines tech stack, architecture rules, security constraints, and coding conventions.

# CollabSphere — Claude Code Guardrails

## Project Identity

CollabSphere is a collaboration marketplace for social media influencers, creators, and brands.
College semester project with system design focus. Co-developer: Samiksha (GitHub: samiksha-jangid27).

---

## Tech Stack (locked — do not substitute)

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14+ | SSR/SSG React framework |
| Styling | Tailwind CSS + Framer Motion | Utility-first styling, dark theme, animations |
| Backend | Node.js + Express.js (TypeScript) | REST API server |
| Database | MongoDB Atlas (Mongoose ODM) | Document store + geospatial queries |
| Auth | JWT + Twilio/MSG91 + Nodemailer | Token auth, OTP, email verification |
| Real-time | Socket.io | WebSocket messaging layer |
| File Storage | Cloudinary | Media uploads (photos/videos) |
| Deployment | Vercel (FE) + Render (BE) + Atlas (DB) | Cloud hosting |
| Testing | Jest + Supertest | Unit + integration tests |

---

## Architecture Rules

- **Layered architecture:** Client → API Gateway → Service → Data Access → Database
- **Modular structure:** `src/modules/{feature}/` — each module has controller, service, routes, validation
- **Shared utilities:** `src/shared/` (constants, errors, logger, responseHelper)
- **Models:** `src/models/` (Mongoose schemas)
- **Config:** `src/config/` (database, environment, cloudinary, socket)
- **Middleware:** `src/middleware/` (authenticate, authorize, validate, rateLimiter, errorHandler)
- Every service class implements its interface (`ProfileService` implements `IProfileService`)
- Controllers depend on service interfaces, not concrete classes (Dependency Inversion)
- Repository pattern for all DB access — no raw Mongoose calls in services
- RESTful API versioned at `/api/v1/`

### Standard API Response Shape

```typescript
// Success
{ success: true, data: { ... }, message: "..." }

// Error
{ success: false, error: { code: "ERROR_CODE", message: "..." } }

// Paginated
{ success: true, data: [...], pagination: { page, limit, total, hasNext } }
```

### Backend Folder Structure

```
server/src/
├── config/          # database, environment, cloudinary, socket
├── middleware/       # authenticate, authorize, validate, rateLimiter, errorHandler
├── modules/
│   ├── auth/        # controller, service, routes, validation
│   ├── profile/
│   ├── search/
│   ├── collaboration/
│   ├── messaging/
│   ├── verification/
│   ├── social/
│   └── admin/
├── models/          # User, Profile, SocialAccount, MediaPost, CollaborationRequest, Message, etc.
├── shared/          # constants, errors, logger, responseHelper
└── index.ts
```

### Frontend Folder Structure

```
client/src/
├── app/
│   ├── (auth)/      # login, verify
│   ├── (main)/      # profile, discover, collaborations, messages, settings
│   ├── admin/
│   └── layout.tsx
├── components/
│   ├── ui/          # Button, Card, Input, Modal
│   ├── profile/     # ProfileCard, ProfileHeader
│   ├── search/      # SearchBar, FilterPanel
│   ├── collaboration/
│   └── messaging/
├── hooks/           # useAuth, useProfile, useSearch, useSocket
├── context/         # AuthContext, SocketContext
├── services/        # api.ts, authService, profileService, collabService
├── utils/
└── styles/
```

---

## Design Patterns (enforced)

| Pattern | Where | Why |
|---|---|---|
| Factory | Profile/Collab creation | Centralizes object creation by role type |
| Strategy | Search algorithms | Swap geo/niche/combined search at runtime |
| Observer | Event-driven notifications | Decouples event producers from consumers |
| Repository | All DB access | Abstract Mongoose behind repository interfaces |
| Base class inheritance | BaseRepository, BaseController | Shared CRUD logic |

---

## Security Guardrails

### Authentication
- OTP: stored hashed with TTL, max 3 requests/15min per phone, lockout after 5 failed attempts/30min
- JWT access tokens: 15min expiry, signed HS256 or RS256
- JWT refresh tokens: 7 days, stored hashed in DB, rotated on every refresh
- Refresh tokens in HTTP-only, secure, SameSite cookies
- HTTPS only — all API communication over TLS

### Data Protection
- OAuth tokens encrypted at rest (AES-256)
- Phone/email indexed for lookup, never publicly exposed
- Contact info permission-gated: `public | connections | hidden`
- File uploads: validated MIME types + size limits
- No government ID collection — verification via phone + email + social proof

### API Protection
- All inputs validated with Zod schemas on every endpoint
- Rate limiting: 100 req/min general, 5/min for OTP endpoints
- helmet.js for security headers
- CORS whitelist frontend origin only
- CSRF protection via SameSite cookies + CSRF tokens
- Mongoose parameterized queries (no raw query injection)

### Role-Based Access
- Three roles: `creator`, `brand`, `admin`
- Admin routes protected by `authenticate` + `authorize(['admin'])` middleware chain
- Creator/Brand routes protected by `authenticate` + `authorize(['creator', 'brand'])`

---

## Database Rules

- MongoDB with Mongoose ODM, strict schemas
- GeoJSON Point type for all locations: `{ type: "Point", coordinates: [lng, lat] }`
- `2dsphere` indexes on `Profile.location` and `CollaborationRequest.location`
- One profile per user enforced via unique index on `Profile.userId`
- Conversation + Message as separate collections (standard chat pattern)
- Applicants embedded in CollaborationRequest (bounded array, not a join table)
- Unique compound index on Bookmark: `{ userId: 1, profileId: 1 }`

---

## Frontend Rules

- **Dark theme only** — no light mode
- **Font:** Inter (UI), JetBrains Mono (code/mono)
- **Spacing:** 4px grid system (4, 8, 12, 16, 24, 32, 48)
- **Responsive:** Mobile-first. <640px single column + bottom tabs, 640-1024 two columns, >1024 full sidebar layout
- **Animations:** Framer Motion for page transitions and card reveals
- **Touch targets:** Minimum 44px on mobile
- **Accessibility:** Semantic HTML, ARIA labels, keyboard navigation, focus rings
- **Loading states:** Skeleton screens, optimistic updates, instant feedback

---

## Code Conventions

- TypeScript strict mode everywhere (both client and server)
- Every new file starts with two `// ABOUTME:` comment lines
- Single responsibility per file — no god classes
- Names describe what code DOES (`ProfileService`), not how it's made (`ZodValidator`)
- No temporal names (`New`, `Legacy`, `Old`)
- No comments about what "used to be there"
- Smallest change that achieves the outcome — no adjacent refactoring

---

## Sprint Status (Updated 2026-04-16)

### Sprint 1 — Authentication System ✅ COMPLETE
- Auth module with OTP/email verification
- JWT token management (access + refresh)
- Login and email verification pages
- All tests passing

### Sprint 2 — Profile System ✅ COMPLETE

**Implemented Features:**

**Backend:**
- ✅ Profile model (Mongoose schema with GeoJSON location, 2dsphere index)
- ✅ Profile CRUD endpoints (7 endpoints: POST, GET /me, PATCH /me, DELETE /me, GET /:id)
- ✅ Avatar/cover image upload to Cloudinary
- ✅ Multer middleware for in-memory file handling
- ✅ Profile repository layer (extends BaseRepository)
- ✅ Profile service with one-profile-per-user enforcement
- ✅ Zod validation schemas for all inputs
- ✅ Profile controller with error handling
- ✅ Geocode service (Nominatim proxy) for location autocomplete
- ✅ All tests passing (unit, integration)

**Frontend:**
- ✅ Profile pages: view own profile, edit profile, view other profiles
- ✅ ProfileHeader component (avatar + cover + name)
- ✅ ProfileBio component (bio + niche + interests)
- ✅ ProfileEditForm with full form controls
- ✅ Avatar/cover upload with drag-drop preview
- ✅ LocationSearch autocomplete component
- ✅ Profile completeness indicator
- ✅ Profile data fetching hook (useProfile)
- ✅ ProfileService API client

**Documentation:**
- ✅ API_SPEC.md updated with profile endpoints (8-14)
- ✅ Profile error codes added to error reference
- ✅ Geocode endpoint documented (endpoint 15)

**Design System Compliance:**
- Editorial Noir design tokens applied
- Dark theme with ink/paper/amber palette
- Framer Motion animations (0.5s easeOutExpo)
- Responsive layout (mobile-first)
- Sharp button radius (2px max), pill radius (0)

### Next Steps (Sprint 3 — Discovery & Search)
- Geo-search by location + niche
- Discovery feed with filters
- Search refinement UI

**Key Files:**
- Backend: `server/src/modules/profile/`, `server/src/models/Profile.ts`, `server/src/config/cloudinary.ts`
- Frontend: `client/src/app/(main)/profile/`, `client/src/components/profile/`
- Docs: `docs/API_SPEC.md` (sections 8-14)
