# CollabSphere

A collaboration marketplace for social media creators, influencers, and brands — built as a full-stack system design project.

**Live Demo:** [collabsphere-six.vercel.app](https://collabsphere-six.vercel.app)
**Repository:** [github.com/samiksha-jangid27/CollabSphere](https://github.com/samiksha-jangid27/CollabSphere)

---

## What It Does

CollabSphere brings creators and brands onto one platform:

- **Creators** build verified profiles, link their social accounts, and receive collaboration requests from brands.
- **Brands** search for creators by city and niche, send structured collaboration requests with budgets and deadlines, and track their outbox.
- **Everyone** discovers talent through a filtered, location-aware search powered by geospatial queries.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + Tailwind CSS v4 + Framer Motion |
| Backend | Node.js + Express.js 5 + TypeScript |
| Database | MongoDB Atlas (Mongoose 9) |
| Auth | JWT (access + refresh + email tokens) + Phone OTP + Email Verification |
| File Storage | Cloudinary (avatar + cover image uploads) |
| Real-time | Socket.io (planned — Sprint 5) |
| Deployment | Vercel (frontend) + Render (backend) + MongoDB Atlas |
| Testing | Jest + Supertest + mongodb-memory-server |

---

## System Design & UML Diagrams

The complete system design is captured in seven UML diagrams. Source images live in `UML Designs/`; Mermaid sources are in `UML Designs/mermaid/` and are version-controlled alongside the code.

1. **Use Case Diagram** — actors, system boundary, and feature groupings
2. **Class Diagram** — controllers, services, domain models, and OOP relationships
3. **ER Diagram** — entities, cardinalities, and key attributes
4. **Sequence Diagram** — User Sign-Up & Verification
5. **Sequence Diagram** — Location-Based Search
6. **Sequence Diagram** — Collaboration Request Flow
7. **Sequence Diagram** — Social Account Linking (OAuth)

---

## Feature Status

| Sprint | Features | Status |
|---|---|---|
| Sprint 1 | Auth system — Phone OTP, Email verification, JWT rotation | ✅ Complete |
| Sprint 2 | Profiles — CRUD, avatar/cover upload (Cloudinary), location autocomplete | ✅ Complete |
| Sprint 3 | Discovery — City/niche/platform search, geospatial queries, profile grid | ✅ Complete |
| Sprint 4 | Collaboration marketplace — Send/receive requests, inbox, sent, accept/decline | ✅ Complete |
| Sprint 5 | Messaging (Socket.io), OAuth social verification, admin moderation | 🔜 Planned |

---

## Prerequisites

Before you start, make sure you have:

- **Node.js v23+** — check with `node -v` (or `nvm use` if you use nvm; reads `.nvmrc`)
- **npm** — comes with Node.js
- **Git**

You do **NOT** need:

- Any SMS/OTP provider account 
- Docker (tests use in-memory MongoDB)

---

## Getting Started

### 1. Clone the repo

```bash
git clone git@github.com:samiksha-jangid27/CollabSphere.git
cd CollabSphere
```

### 2. Install dependencies

Run all three install commands from the project root:

```bash
npm install                          # root (concurrently)
cd server && npm install && cd ..    # backend
cd client && npm install && cd ..    # frontend
```

### 3. Set up environment variables

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in the required values:

```env
# Required
MONGODB_URI=mongodb+srv://<your-user>:<your-password>@<your-cluster>.mongodb.net/collabsphere

# Required for avatar/cover image uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Ask the team lead for the MongoDB Atlas and Cloudinary credentials if you don't have them.

Everything else has working defaults for development — JWT secrets are pre-filled dev values, port defaults to `5001`, OTP prints to terminal, and email uses Ethereal.

### 4. Run the app

```bash
npm run dev
```

This starts both servers concurrently:

- **Backend API:** http://localhost:5001
- **Frontend:** http://localhost:3000

---

## Testing the App

Open http://localhost:3000 in your browser.

### Login flow

1. Choose the Account Type
2. Enter you newly created Username
3. Add you email address to the Sign-Up page
4. Enter a 8-digit or longer password and click **Verify** — you're redirected to the dashboard

### Email verification

1. From the dashboard, click **Verify Email**
2. Enter an email address and click **Send Verification Email**
3. A preview URL is printed in your terminal:
   ```
   [info]: Email preview URL: https://ethereal.email/message/...
   ```
4. Open that URL to see the verification email, then click **Verify Email** in it

### Collaboration request flow

1. **Log in as a brand** → visit `/discover` → find a creator → click **Send Request**
2. Fill in title, description, budget, and deadline → submit
3. Visit `/collaborations/sent` to see your outgoing request with **Open** status
4. **Log in as the creator** → visit `/collaborations/inbox` → see the incoming request
5. Click **Accept** or **Decline** — status updates immediately in the UI
6. Switch back to the brand account → `/collaborations/sent` → status reflects the creator's decision

---

## Available Scripts

From the **project root:**

| Command | What it does |
|---|---|
| `npm run dev` | Start both server + client |
| `npm run dev:server` | Start backend only (port 5001) |
| `npm run dev:client` | Start frontend only (port 3000) |
| `npm test` | Run all backend tests |

From **`server/`:**

| Command | What it does |
|---|---|
| `npm run dev` | Start backend with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run Jest test suite |

---

## Running Tests

Tests use `mongodb-memory-server` — no external database needed:

```bash
npm test
```

Expected output (Sprints 1–4):

```
PASS tests/auth/user.model.test.ts
PASS tests/auth/auth.integration.test.ts
PASS tests/collaboration/collaboration.unit.test.ts
PASS tests/collaboration/collaboration.integration.test.ts

Test Suites: 4 passed, 4 total
Tests:       59 passed, 59 total
```

---

## Project Structure

```
CollabSphere/
├── client/                              # Next.js 15 frontend
│   └── src/
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx       # Phone + OTP login
│       │   │   └── verify/page.tsx      # Email verification
│       │   └── (main)/
│       │       ├── layout.tsx           # Main layout + navigation
│       │       ├── page.tsx             # Dashboard (protected)
│       │       ├── profile/             # View + edit own profile
│       │       ├── discover/            # Creator search + filter
│       │       └── collaborations/
│       │           ├── inbox/page.tsx   # Incoming requests (creators)
│       │           └── sent/page.tsx    # Outgoing requests (brands)
│       ├── components/
│       │   ├── ui/                      # Button, Input, OtpInput, Card
│       │   ├── profile/                 # ProfileHeader, ProfileBio, ProfileEditForm
│       │   ├── search/                  # SearchBar, FilterPanel, ProfileGrid
│       │   └── collaboration/           # RequestForm, RequestCard, RequestList
│       ├── context/
│       │   └── AuthContext.tsx          # Auth state + silent JWT refresh
│       ├── hooks/                       # useAuth, useProfile, useSearch, useCollaboration
│       ├── services/                    # api.ts, authService, profileService,
│       │                               #   searchService, collaborationService
│       └── types/                       # collaboration.ts, profile.ts, etc.
│
├── server/                              # Express.js 5 backend
│   └── src/
│       ├── config/
│       │   ├── environment.ts           # Zod-validated env vars
│       │   ├── database.ts              # MongoDB connection
│       │   └── cloudinary.ts           # Cloudinary SDK setup
│       ├── middleware/
│       │   ├── authenticate.ts          # JWT verification
│       │   ├── authorize.ts             # Role-based access control
│       │   ├── validate.ts              # Zod request validation
│       │   ├── rateLimiter.ts           # Rate limiting
│       │   └── errorHandler.ts          # Global error handler
│       ├── models/                      # User, Profile, CollaborationRequest
│       ├── modules/
│       │   ├── auth/                    # OTP login, email verification, JWT
│       │   ├── profile/                 # Profile CRUD + Cloudinary uploads
│       │   ├── search/                  # Geospatial + niche/platform search
│       │   └── collaboration/           # Request create/inbox/sent/accept/decline
│       └── shared/                      # BaseRepository, EventBus, errors,
│                                        #   responseHelper, constants, logger
│
├── tests/
│   ├── auth/                            # 24 auth tests (model + integration)
│   └── collaboration/                   # 35 collaboration tests (unit + integration)
│
├── docs/
│   ├── PRD.md                           # Product requirements
│   ├── API_SPEC.md                      # Full endpoint specs (22 endpoints)
│   ├── DATA_MODEL.md                    # MongoDB schema design
│   └── AUTH_FLOWS.md                    # Auth flow diagrams
│
└── UML Designs/
    ├── mermaid/                         # Version-controlled diagram sources
    └── *.png                            # Rendered diagram images
```

---

## API Endpoints

Base URL: `http://localhost:5001/api/v1`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/otp/send` | Public | Send OTP to phone (printed to terminal in dev) |
| POST | `/auth/otp/verify` | Public | Verify OTP, receive JWT tokens |
| POST | `/auth/email/send` | Bearer | Send email verification link |
| GET | `/auth/email/verify/:token` | Public | Confirm email via signed link |
| POST | `/auth/refresh` | Cookie | Rotate access + refresh tokens |
| POST | `/auth/logout` | Bearer | Invalidate session |
| GET | `/auth/me` | Bearer | Get current user |
| GET | `/health` | Public | Server health check |

### Profiles

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/profiles` | Bearer | Create profile |
| GET | `/profiles/me` | Bearer | Get own profile |
| PATCH | `/profiles/me` | Bearer | Update own profile |
| DELETE | `/profiles/me` | Bearer | Delete own profile |
| GET | `/profiles/:id` | Bearer | View another user's profile |
| POST | `/profiles/me/avatar` | Bearer | Upload avatar image (Cloudinary) |
| POST | `/profiles/me/cover` | Bearer | Upload cover image (Cloudinary) |
| GET | `/geocode` | Bearer | City autocomplete (Nominatim proxy) |

### Search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search/profiles` | Public | Search by city, niche, platform |
| GET | `/search/cities` | Public | City autocomplete for filter UI |

### Collaborations

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/collaborations` | Bearer (brand) | Create a collaboration request |
| GET | `/collaborations/inbox` | Bearer (creator) | Incoming requests with pagination + filter |
| GET | `/collaborations/sent` | Bearer (brand) | Outgoing requests with pagination + filter |
| PATCH | `/collaborations/:id/accept` | Bearer (creator) | Accept a request |
| PATCH | `/collaborations/:id/decline` | Bearer (creator) | Decline a request |

See `docs/API_SPEC.md` for full request/response contracts.

---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `PORT` | No | `5001` | Backend server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `JWT_ACCESS_SECRET` | Yes | dev default | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | dev default | Refresh token signing key |
| `JWT_EMAIL_SECRET` | Yes | dev default | Email token signing key |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token TTL |
| `JWT_EMAIL_EXPIRY` | No | `24h` | Email verification link TTL |
| `CLOUDINARY_CLOUD_NAME` | Yes (for uploads) | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes (for uploads) | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes (for uploads) | — | Cloudinary API secret |
| `SMTP_HOST` | No | — | SMTP host (leave empty for Ethereal in dev) |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `CLIENT_URL` | No | `http://localhost:3000` | Frontend origin for CORS |

### Client (`client/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:5001` | Backend API base URL |

---

## Architecture

CollabSphere uses a strict three-layer backend architecture:

```
HTTP Request
  → Middleware (authenticate → authorize → validate → rateLimiter)
  → Controller  (parses request, shapes response)
  → Service     (business logic, owns domain rules)
  → Repository  (all MongoDB queries, extends BaseRepository)
  → MongoDB Atlas
```

Design patterns applied: **Repository** (DB abstraction), **Observer** (EventBus for notifications), **Strategy** (swappable search/OTP providers), **Singleton** (EventBus, DB connection), **Chain of Responsibility** (middleware stack).

---

## Troubleshooting

**Port 5000 blocked on macOS**
macOS AirPlay Receiver uses port 5000. This project defaults to `5001`. If you see a `403 Forbidden` from AirTunes, confirm your `.env` has `PORT=5001`.

**CORS errors in browser console**
Make sure `CLIENT_URL` in `server/.env` exactly matches where the frontend runs (`http://localhost:3000`). No trailing slash.

**"Cannot find module" errors**
Run `npm install` in all three directories: root, `server/`, and `client/`.

**Tests failing with timeout**
The first run of `mongodb-memory-server` downloads a MongoDB binary (~100 MB). This is cached after the first run. Just run the tests again.

**OTP not appearing in terminal**
If you ran `npm run dev`, both server and client logs are interleaved. Look for lines prefixed with `[0]` (server output).

**Ethereal email URL not appearing**
Make sure `SMTP_HOST` and `SMTP_USER` are **empty** in `.env`. When empty, the server auto-creates an Ethereal test account and logs the preview URL.

**Images not uploading**
Set the three `CLOUDINARY_*` variables in `server/.env`. Cloudinary is required for avatar and cover image uploads.

---

## Documentation

Detailed documentation lives in `docs/`:

- **`docs/PRD.md`** — Product requirements, user stories, acceptance criteria
- **`docs/API_SPEC.md`** — Complete API specification for all 22 endpoints
- **`docs/DATA_MODEL.md`** — MongoDB schema design and indexing strategy
- **`docs/AUTH_FLOWS.md`** — Step-by-step authentication flow diagrams

---

## Team

| Name | GitHub |
|---|---|
| Samiksha Jangid | [@samiksha-jangid27](https://github.com/samiksha-jangid27) |
| *(add remaining team members)* | |
