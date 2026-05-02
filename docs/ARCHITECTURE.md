# CollabSphere — Architecture Reference

A complete walkthrough of the system, written as a viva-prep document. Every claim points to a file and (where useful) a line number so you can pull it up live during questioning.

---

## 1. What CollabSphere Is

CollabSphere is a two-sided marketplace that connects social-media creators with brands looking to run collaborations. Brands discover creators by city, niche, and platform, send a structured collaboration request, and on acceptance both parties drop into a real-time chat to negotiate. The product also includes profile management, image uploads, email verification, and JWT-based authentication.

**Scope built so far (Sprints 1 to 4):** Auth, Profiles, Discovery & Search, Collaboration Marketplace. Messaging models exist, real-time chat is wired in via Socket.io, and Sprint 5 polish work is in progress.

---

## 2. Tech Stack and Why

| Layer | Choice | Why this choice |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | Server-side rendering for SEO on public profiles, file-based routing, built-in API proxy support, and Vercel-native deployment. |
| UI styling | Tailwind CSS + Framer Motion | Tailwind keeps styling co-located with markup and avoids CSS bloat. Framer Motion gives declarative, physics-based animations that match the Editorial Noir motion spec. |
| State / data fetching | React Context + custom hooks + Axios | Auth and socket state need to be globally accessible (Context), data fetching is per-component (hooks), and Axios gives interceptors for token refresh. |
| Backend framework | Node.js + Express 5 (TypeScript) | Express is minimal and unopinionated, which lets us layer middleware deliberately. TypeScript gives us interface-driven design for OOP. |
| Database | MongoDB Atlas (Mongoose) | Document model fits flexible profile data and embedded sub-objects (location GeoJSON, contactInfo, collaborationPreferences). The `2dsphere` index supports geospatial queries. |
| Auth | JWT (HS256) with refresh-token rotation | Stateless access tokens scale horizontally. Refresh tokens are stored hashed in DB and rotated on every refresh to mitigate replay. |
| Real-time | Socket.io | Bidirectional WebSocket channel for chat, with auto-fallback to long-polling. |
| File uploads | Cloudinary | Handles image transformation, CDN delivery, and avoids putting binary blobs in MongoDB. |
| Validation | Zod | Single schema source for both runtime validation and TypeScript types. |
| Testing | Jest + Supertest + mongodb-memory-server | In-memory Mongo means tests are hermetic, fast, and reproducible. |
| Deployment | Vercel (frontend) + Render (backend) + MongoDB Atlas | Each platform is best-in-class for its layer. Vercel for edge SSR, Render for long-lived Express, Atlas for managed Mongo. |

---

## 3. High-Level Architecture

```
                       ┌──────────────────────┐
                       │    Next.js Client    │   (Vercel)
                       │  React + Tailwind    │
                       └──────────┬───────────┘
                                  │ HTTPS (Axios)
                                  │ WebSocket (Socket.io)
                                  ▼
                       ┌──────────────────────┐
                       │   Express API (TS)   │   (Render)
                       │   /api/v1/*          │
                       │   ┌────────────────┐ │
                       │   │  Middleware    │ │  cors → helmet → json → cookies
                       │   │                │ │  → rateLimit → routes → errorHandler
                       │   └───────┬────────┘ │
                       │           ▼          │
                       │   ┌────────────────┐ │
                       │   │  Controllers   │ │  HTTP layer
                       │   └───────┬────────┘ │
                       │           ▼          │
                       │   ┌────────────────┐ │
                       │   │  Services      │ │  Business logic
                       │   └───────┬────────┘ │
                       │           ▼          │
                       │   ┌────────────────┐ │
                       │   │  Repositories  │ │  DB access (extends BaseRepository)
                       │   └───────┬────────┘ │
                       └───────────┼──────────┘
                                   ▼
                       ┌──────────────────────┐
                       │   MongoDB Atlas      │
                       │   (Mongoose models)  │
                       └──────────────────────┘
```

**One-line summary of responsibility per layer:**
- **Routes** → wire HTTP verbs to controllers, attach middleware
- **Middleware** → cross-cutting concerns (auth, validation, rate limit, errors)
- **Controllers** → parse request, call service, shape HTTP response
- **Services** → business rules, orchestration, event emission
- **Repositories** → all Mongoose queries, no business logic
- **Models** → Mongoose schemas with indexes and instance methods

---

## 4. Backend Folder Structure

```
server/src/
├── config/
│   ├── environment.ts       Zod-validated env vars
│   ├── database.ts          Mongo connection
│   ├── cloudinary.ts        Cloudinary SDK init
│   └── socket.ts            Socket.io setup
├── middleware/
│   ├── authenticate.ts      JWT verification → req.user
│   ├── authorize.ts         Role gating (creator/brand/admin)
│   ├── validate.ts          Zod schema validation
│   ├── rateLimiter.ts       express-rate-limit config
│   ├── upload.ts            Multer in-memory storage
│   └── errorHandler.ts      Global AppError catcher
├── modules/
│   ├── auth/
│   ├── profile/
│   ├── search/
│   ├── geocode/
│   ├── collaboration/
│   └── messaging/
├── models/
│   ├── User.ts
│   ├── Profile.ts
│   ├── CollaborationRequest.ts
│   ├── Conversation.ts
│   └── Message.ts
├── shared/
│   ├── BaseRepository.ts    Generic CRUD base class
│   ├── EventBus.ts          Singleton observer
│   ├── errors.ts            AppError factory + error codes
│   ├── responseHelper.ts    sendSuccess / sendError
│   ├── constants.ts         API_PREFIX, JWT expiry, etc.
│   └── logger.ts            Winston logger
└── index.ts                 App entry point
```

Each module under `modules/<name>/` has six files:
```
<name>.controller.ts        HTTP handler
<name>.service.ts           Business logic
<name>.repository.ts        DB queries
<name>.routes.ts            Route registration + middleware wiring
<name>.validation.ts        Zod schemas
<name>.interfaces.ts        TypeScript contracts
```

This keeps every feature self-contained and gives you a predictable place to look for any concern.

---

## 5. The Request Lifecycle (end-to-end)

Take `POST /api/v1/profiles` as a worked example.

1. **Express receives the HTTPS request.** TLS is terminated by Render. `app.set('trust proxy', 1)` (server/src/index.ts:30) tells Express to honour `X-Forwarded-*` headers so `req.secure`, `req.ip`, and the rate limiter see the real client.
2. **CORS** (server/src/index.ts:36–43) checks `Origin` against `config.CLIENT_URL`. If it matches, response gets `Access-Control-Allow-*` headers. If not, the browser blocks it.
3. **helmet** (line 44) sets security headers (X-Frame-Options, X-Content-Type-Options, etc.).
4. **express.json + cookie-parser** (lines 45–46) parse the body and cookies.
5. **apiLimiter** (line 47) enforces 100 req/min per IP (default), backed by `express-rate-limit`.
6. **Route match.** `/api/v1/profiles` → `profileRoutes` (line 51).
7. **Per-route middleware on the route file:** `authenticate` (decodes JWT, attaches `req.user`), then `validate(createProfileSchema)` (runs Zod), then optionally `upload.single('avatar')` (Multer for file uploads).
8. **Controller** receives `req`, pulls validated data, calls `profileService.createProfile(userId, data)`, awaits the result, and calls `sendSuccess(res, 201, profile, 'Profile created')`.
9. **Service** runs the rule: "one profile per user." Checks if a profile already exists, throws `AppError.conflict(...)` if so, otherwise calls `profileRepository.create(...)`.
10. **Repository** calls Mongoose `Profile.create(data)`.
11. **Mongoose** validates against the schema, applies indexes, persists to Atlas.
12. **Response shape.** Always `{ success: true, data: {...}, message: '...' }` (or `{ success: false, error: {...} }`). Enforced by the helpers in `server/src/shared/responseHelper.ts`.
13. **errorHandler** (last middleware, line 63) catches any thrown `AppError` or unexpected error, logs it with Winston, and produces the standard error response.

---

## 6. Design Patterns in Use

This is what to talk about if asked "what OOP / design patterns did you apply?"

### 6.1 Repository Pattern
**Where:** `server/src/shared/BaseRepository.ts` and every `<module>.repository.ts`.

**What it does:** Abstracts Mongoose behind a thin interface. Services never call Mongoose directly. They call `repo.findById(id)` or `repo.create(data)`. This means the persistence layer can be swapped (in theory) without touching business logic.

**Why it matters:** Testability. Tests can pass a mock repository to a service.

### 6.2 Inheritance via Generic Base Class
`BaseRepository<T extends Document>` is a generic abstract class providing `findById`, `findOne`, `find`, `create`, `updateById`, `deleteById`. Concrete repositories extend it:

```ts
export class ProfileRepository extends BaseRepository<IProfile> {
  constructor() { super(Profile); }
  // ...add Profile-specific queries here
}
```

This is textbook inheritance and removes ~50 lines of boilerplate per repository.

### 6.3 Dependency Injection (Constructor Injection)
**Where:** `server/src/modules/auth/auth.service.ts` constructor takes `userRepo`, `tokenService`, `emailProvider`. Same pattern in every service.

**Why:** The Dependency Inversion Principle from SOLID. Controllers and services depend on **interfaces** (`IAuthService`, `ITokenService`), not on concrete classes. This is what makes the code unit-testable.

### 6.4 Observer Pattern (EventBus)
**Where:** `server/src/shared/EventBus.ts` is a singleton with `on(event, handler)` and `emit(event, payload)`.

**Events defined:** `USER_REGISTERED`, `EMAIL_VERIFIED`, `OTP_SENT`, `COLLAB_ACCEPTED`.

**Concrete use:** When a collaboration request is accepted, `CollaborationService` emits `COLLAB_ACCEPTED`. `MessagingService.subscribeToEvents` (wired in `server/src/index.ts:66–68`) subscribes to that event and auto-creates the conversation between brand and creator. Publisher and subscriber never know about each other — the bus decouples them.

### 6.5 Strategy Pattern (Search Filters)
**Where:** `server/src/modules/search/search.service.ts`.

The search method accepts a filters object (`city`, `niche`, `platform`) and the repository builds the Mongo query dynamically. New filter types can be added without changing existing ones — each filter is independently composable.

### 6.6 Factory (Error Construction)
**Where:** `server/src/shared/errors.ts`.

```ts
export class AppError extends Error {
  static badRequest(code: string, message: string) { ... }
  static unauthorized(code: string, message: string) { ... }
  static notFound(code: string, message: string) { ... }
  static conflict(code: string, message: string) { ... }
  static internal(code: string, message: string) { ... }
}
```

Factory methods produce typed errors with consistent shape. `errorHandler` middleware reads them and produces the standard error response.

---

## 7. Database Design

### 7.1 Collections (5)
- **users** — identity and auth
- **profiles** — public-facing creator/brand info
- **collaborationrequests** — the marketplace listings
- **conversations** — chat threads
- **messages** — individual chat messages

### 7.2 User Schema (`models/User.ts`)
```
_id, username (unique), password (bcrypt, select:false), email (unique, sparse),
emailVerified, role (creator|brand|admin), isActive, isBanned,
refreshToken (hashed, select:false), createdAt, updatedAt
```
- **`select: false` on password and refreshToken** means they never leak in default queries.
- **`toJSON` strips them again** as a defense in depth.
- **Sparse unique on email** lets users register without an email immediately and still keeps it unique once added.

### 7.3 Profile Schema (`models/Profile.ts`)
```
_id, userId (unique ref to User → enforces 1:1),
displayName, bio, avatar (Cloudinary URL), coverImage,
niche[], interests[], contentTypes[],
collaborationPreferences { types, openToCollab, preferredPlatforms },
contactInfo { email, website, whatsapp, visibility },
location { type: 'Point', coordinates: [lng, lat], city, country },
isVerified, verifiedAt, followerCount, profileCompleteness
```

**Indexes (server/src/models/Profile.ts:110–114):**
- `{ userId: 1 }` unique → enforces one profile per user
- `{ location: '2dsphere' }` → reserved for future geospatial queries
- `{ 'location.city': 1 }` → fast city filter (the index actually used today)
- `{ niche: 1 }` → filter by niche
- `{ isVerified: 1 }` → filter verified creators
- `{ followerCount: -1 }` → sort popular first

### 7.4 CollaborationRequest Schema
```
_id, userId (creator), brandId (brand sender), title, description,
budget, deadline, status (Open|Pending|Accepted|Declined|Closed),
createdAt, updatedAt
```
**Indexes:** `{ userId, status }` and `{ brandId, status }` so inbox and sent queries are O(log n).

### 7.5 Conversation and Message
- `Conversation { participants[2], collaborationRequestId, lastMessageAt }`
- `Message { conversationId, senderId, content, readAt, createdAt }`

This is the canonical chat model: conversations and messages are separate collections so a conversation can contain thousands of messages without bloating its document.

### 7.6 Why MongoDB instead of SQL?
1. **Document fit.** A profile is naturally one document with embedded sub-objects (location, contactInfo, collaborationPreferences). In SQL you'd need 3–4 joined tables.
2. **Geospatial.** `2dsphere` indexes are first-class in Mongo.
3. **Schema evolution.** As the spec grows, adding optional fields doesn't need migrations.
4. **Atlas managed hosting.** Free tier, zero ops.

---

## 8. Authentication and Security

### 8.1 The Token Model
- **Access token:** JWT, HS256, 15-minute expiry, sent in `Authorization: Bearer <token>` header.
- **Refresh token:** JWT, 7-day expiry, stored **hashed** in `User.refreshToken`, sent only via an `HttpOnly`, `Secure`, `SameSite=None` cookie scoped to `/api/v1`.
- **Email verification token:** JWT, 24-hour expiry, contains `purpose: 'email_verify'` claim, embedded in the verification link.

Three secrets, one per token type, all loaded via Zod-validated env vars.

### 8.2 Refresh Flow (the silent retry)
1. Client makes a request with an expired access token → server returns 401.
2. Axios interceptor (in `client/src/services/api.ts`) catches the 401 and automatically calls `POST /auth/refresh` with the refresh cookie attached.
3. Server verifies the refresh token, hashes it, looks up the user, compares hashes (constant-time), and if it matches, **issues a new access token AND a new refresh token** (rotation), stores the new hash, and sets the new cookie.
4. Client retries the original request with the fresh access token. The user sees nothing.

Rotation means a stolen refresh token is single-use — once the legitimate user refreshes, the stolen one becomes invalid.

### 8.3 Cookie Configuration
```ts
// server/src/modules/auth/auth.controller.ts:12-22
{
  httpOnly: true,                            // JS can't read it (XSS protection)
  secure: config.isProd,                     // HTTPS only in production
  sameSite: config.isProd ? 'none' : 'strict',  // 'none' for cross-origin Vercel→Render
  path: '/api/v1',                           // not sent on other paths
  maxAge: 7 * 24 * 60 * 60 * 1000,           // 7 days
}
```

### 8.4 Other Security Measures
- **Helmet** sets a strict default Content-Security-Policy and disables `X-Powered-By`.
- **Rate limiting** at 100 req/min per IP via `express-rate-limit`.
- **Zod validation** on every endpoint blocks malformed input before it reaches the service.
- **Mongoose parameterized queries** prevent NoSQL injection.
- **Bcrypt with 10 salt rounds** for password hashing.
- **CORS whitelist** is a single origin (`config.CLIENT_URL`), not `*`.
- **Authorization middleware** gates routes by role (`authorize(['brand'])` for `POST /collaborations`, etc.).

---

## 9. Module Walkthroughs

### 9.1 Auth Module (`server/src/modules/auth/`)
**Endpoints:**
- `POST /auth/register` — create user with username/password, hash password, issue tokens
- `POST /auth/login` — verify credentials, issue tokens
- `POST /auth/email/send` — generate email JWT, send via Nodemailer
- `GET /auth/email/verify/:token` — verify JWT, set `emailVerified=true`
- `POST /auth/refresh` — rotate access + refresh tokens
- `POST /auth/logout` — clear refresh token in DB and cookie
- `GET /auth/me` — return current user

**Key files:**
- `auth.controller.ts` — HTTP layer
- `auth.service.ts` — business logic (DI: userRepo, tokenService, emailProvider)
- `token.service.ts` — JWT signing and verification, secret per token type
- `email.provider.ts` — Nodemailer wrapper, dev mode uses Ethereal fake SMTP

**Talking point for viva:** "We deliberately split TokenService from AuthService so token logic is independently testable and could be swapped (e.g., to RS256 with a key pair) without touching auth flow."

### 9.2 Profile Module
**Endpoints:** `POST/GET/PATCH/DELETE /profiles/me`, `POST /profiles/me/avatar`, `POST /profiles/me/cover`, `GET /profiles/:id`.

**Highlights:**
- One-profile-per-user enforced both at the DB level (unique index on `userId`) AND in service (defense in depth).
- Avatar/cover uploads go through Multer in-memory → Cloudinary upload stream → URL stored in profile.
- `profileCompleteness` is calculated server-side based on which optional fields are filled (gives the frontend a single number to render the progress bar).

### 9.3 Search Module
**Endpoints:**
- `GET /search/profiles?city=&niche=&platform=` — paginated profile search
- `GET /search/cities?q=` — distinct city names for autocomplete

**Implementation note:** Spec originally called for geospatial radius search (`$near`). We pivoted to city/niche/platform string filters because users in our research consistently chose "Bangalore" rather than "within 25km of my coordinates." The `2dsphere` index is still in place for future use.

### 9.4 Geocode Module
Wraps Nominatim (OpenStreetMap's geocoding API) to convert address text into structured location data. Has a custom `User-Agent` header per Nominatim's terms of service.

### 9.5 Collaboration Module
**Endpoints:**
- `POST /collaborations` (brand only) — create request
- `GET /collaborations/inbox` (creator) — paginated received requests
- `GET /collaborations/sent` (brand) — paginated sent requests
- `PATCH /collaborations/:id/accept` (creator, recipient only)
- `PATCH /collaborations/:id/decline` (creator, recipient only)

**State machine:** `Pending → Accepted | Declined → Closed`. Service enforces valid transitions.

**Side effect on accept:** emits `COLLAB_ACCEPTED` → MessagingService listener creates the Conversation between brand and creator. This is the EventBus in action.

### 9.6 Messaging Module
**Endpoints:** list conversations, get messages by conversation, send message.

**Real-time layer:** Socket.io (`config/socket.ts`). When a message is sent via REST, the service emits a socket event to the conversation room so the other participant sees it instantly.

---

## 10. Frontend Architecture

### 10.1 Folder Structure (App Router)
```
client/src/
├── app/
│   ├── (auth)/             route group — login, verify pages
│   ├── (main)/             route group — authenticated app shell
│   │   ├── profile/me, profile/[id]
│   │   ├── discover/
│   │   ├── collaborations/inbox, sent
│   │   └── messages/
│   ├── layout.tsx          root layout, fonts, providers
│   └── globals.css         Editorial Noir design tokens
├── components/
│   ├── ui/                 Button, Card, Input, Modal
│   ├── profile/            ProfileCard, ProfileHeader, ProfileBio
│   ├── search/             SearchBar, FilterPanel, ProfileGrid
│   └── collaboration/      RequestForm, RequestCard, RequestList
├── hooks/                  useAuth, useProfile, useSearch, useCollaboration
├── context/                AuthContext, SocketContext
├── services/               api.ts (Axios), authService, profileService, etc.
└── lib/motion.ts           Framer Motion variants (fadeUp, stagger)
```

### 10.2 Auth Context
A React Context (`context/AuthContext.tsx`) wraps the app. It exposes:
- `user`, `isAuthenticated`, `isLoading`
- `login(username, password)`, `register(...)`, `logout()`
- Auto-refresh on mount: hits `/auth/me` to hydrate the user object if a refresh cookie is present.

Protected pages use a `useAuth()` hook and redirect to `/login` if `!isAuthenticated`.

### 10.3 Axios Instance with Interceptor
`services/api.ts` exports a single Axios instance configured with:
- `baseURL: process.env.NEXT_PUBLIC_API_URL`
- `withCredentials: true` (sends cookies)
- Response interceptor: catches 401, calls `/auth/refresh`, retries the original request once.

This keeps token-refresh logic out of every component.

### 10.4 Editorial Noir Design System
Spec at `docs/design/editorial-noir.md`. Tokens live in `client/src/app/globals.css` as CSS variables (`--ink-0`, `--paper`, `--amber`, etc.). Motion constants live in `client/src/lib/motion.ts` (`ease = [0.16, 1, 0.3, 1]`, `fadeUp`, `staggerContainer`).

Typography: Fraunces (display), Inter (body), JetBrains Mono (code) — loaded via `next/font/google` for zero-CLS font swapping.

---

## 11. Deployment Architecture

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      Vercel      │       │      Render      │       │  MongoDB Atlas   │
│  Next.js Client  │ HTTPS │  Express API     │ TLS   │  Mongo Cluster   │
│  collabsphere-   ├──────▶│  collabsphere-   ├──────▶│  M0 free tier    │
│  six.vercel.app  │       │  tx7y.onrender.. │       │                  │
└──────────────────┘       └──────────────────┘       └──────────────────┘
        ▲                          ▲                          ▲
        │                          │                          │
   Deploy on push              Deploy on push            Network access:
   from main                   from main                 0.0.0.0/0
   Build: next build           Build: tsc                (Render no static IP)
   Env: NEXT_PUBLIC_API_URL    Env: MONGODB_URI,
                                    JWT_*_SECRET,
                                    CLIENT_URL,
                                    Cloudinary creds
```

**Deployment-specific code:**
- `app.set('trust proxy', 1)` (server/src/index.ts:30) — required because Render terminates TLS in front of Express.
- `secure: config.isProd` cookies — only set the Secure flag in production where HTTPS is guaranteed.
- `sameSite: 'none'` in production — required for cross-origin cookie (Vercel domain → Render domain).

---

## 12. Testing Strategy

- **Unit tests** on services with mocked repositories (Jest).
- **Integration tests** on controllers via Supertest, spinning up the Express app and an in-memory Mongo instance per test suite.
- **TDD cycle:** write failing test → minimal implementation → refactor.

**Sprint 4 stats:** 35 collaboration tests passing (15 unit + 20 integration).
**Sprint 3 stats:** 12 search tests passing (7 unit + 5 integration).

Tests live in `server/tests/<module>/`. Run with `npm test` from the server directory.

---

## 13. SOLID Principles Applied

| Principle | Where you can point to |
|---|---|
| **S**ingle Responsibility | Each module file has one job. Controllers don't touch the DB; services don't touch `req`/`res`. |
| **O**pen/Closed | `BaseRepository<T>` is open for extension (new repositories) but closed for modification. |
| **L**iskov Substitution | Any concrete `Repository` can substitute `BaseRepository<T>` because the contract holds. |
| **I**nterface Segregation | Interfaces like `IAuthService`, `ITokenService` expose only what callers need; no fat interfaces. |
| **D**ependency Inversion | Services depend on interfaces (`IUserRepository`), not concrete classes. Constructor injection wires the concrete implementation. |

---

## 14. Likely Viva Questions and Crisp Answers

**Q: Why is your access token only 15 minutes?**
A: Short access tokens limit the window of damage if one is leaked. Refresh-token rotation gives us continuous sessions without long-lived bearer tokens.

**Q: Why store the refresh token as a cookie instead of in localStorage?**
A: HttpOnly cookies are inaccessible to JavaScript, so an XSS attacker can't read them. localStorage is fully exposed to any script running on the page.

**Q: What happens if both users are offline when a message is sent?**
A: The message is persisted to MongoDB synchronously. The Socket.io broadcast is best-effort; the recipient picks up unread messages on next page load via `GET /messages?conversationId=...`.

**Q: How do you prevent a brand from accepting their own collaboration request?**
A: The `acceptRequest` service checks that `request.userId === currentUser._id`. Combined with `authorize(['creator'])` middleware, only the recipient creator can accept.

**Q: Why did you use Mongoose instead of the native MongoDB driver?**
A: Mongoose gives schema validation, middleware hooks, and population. The cost of learning Mongoose pays itself back in safer queries and clearer models.

**Q: How does the EventBus differ from EventEmitter?**
A: It's a thin wrapper around a Map of event names → handler arrays. The point isn't the mechanism — it's the architectural choice to decouple producers from consumers. CollaborationService doesn't import MessagingService; it just emits an event.

**Q: What happens when a JWT secret is rotated?**
A: All access and refresh tokens signed with the old secret become invalid. Every user is force-logged-out and has to log in again. We don't currently support multi-secret rolling rotation — it's a known limitation.

**Q: Why TypeScript on the backend?**
A: Mongoose schemas, Express request types, and Zod validation are all far safer with static types. The compile step also catches structural errors before runtime.

**Q: How does the rate limiter handle distributed deployment?**
A: It's currently in-memory per Render instance. With one instance on the free tier, that's fine. For multi-instance scaling we'd swap in `rate-limit-redis` to share counters across nodes.

**Q: What's the failure mode if MongoDB Atlas is unreachable?**
A: The connection retry in `config/database.ts` retries with backoff. If it ultimately fails, the process exits and Render auto-restarts. In-flight requests fail with 500 → caught by `errorHandler` → returns the standard error envelope.

**Q: What stops a user from spamming `/auth/email/send`?**
A: Rate limiter (100/min per IP) combined with the fact that each email triggers a Nodemailer call which itself has provider-side throttling. A future improvement is a per-user 60-second cooldown.

**Q: How does the frontend know which routes need authentication?**
A: Convention. Routes inside the `(main)` group expect `useAuth().isAuthenticated`. The shared layout in `(main)/layout.tsx` redirects to `/login` if false.

**Q: Why is there no light mode?**
A: Editorial Noir is a deliberate brand choice — dark, editorial, magazine-like. Light mode would dilute the visual identity and double the design surface area. Single-mode keeps every component consistent.

**Q: How would you scale this?**
A: Three layers. (1) Backend: containerize, run multiple Render instances behind a load balancer, swap in-memory rate-limit and Socket.io adapter for Redis-backed. (2) Database: Atlas auto-sharding on `userId`. (3) Frontend: already at the edge via Vercel.

**Q: What's the biggest weakness in the current design?**
A: We dropped phone OTP for username/password to ship faster. That removes a verification channel and makes account recovery harder. If the project continues, OTP is the first thing we'd add back.

---

## 15. Glossary (just in case)

- **JWT** — JSON Web Token, a signed string carrying claims like `userId`, `role`, `exp`.
- **HS256** — Symmetric JWT signing with HMAC-SHA-256 (one shared secret).
- **2dsphere** — MongoDB index type for spherical geospatial queries.
- **GeoJSON Point** — `{ type: 'Point', coordinates: [longitude, latitude] }`. Lng comes first.
- **Bcrypt** — Adaptive password-hashing algorithm with built-in salt and configurable cost.
- **Helmet** — Express middleware that sets recommended HTTP security headers.
- **Multer** — Express middleware for `multipart/form-data` (file uploads).
- **Zod** — TypeScript-first schema validator.
- **Socket.io** — Library that abstracts WebSocket with auto-fallback to long-polling.
- **SSR / SSG** — Server-Side Rendering / Static Site Generation, both supported by Next.js.

---

**End of architecture reference.** Read this top to bottom once before the viva, then skim the headings to anchor anything the examiner asks about. If they push on a specific module, open the file and walk them through a concrete request — that always lands better than abstract theory.
