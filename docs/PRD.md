# CollabSphere — Sprint 1 PRD (Weeks 1-2)

## 1. Problem Statement

The creator economy is booming, but discovering the right collaborator is broken. Instagram is cluttered with personal content, LinkedIn is too corporate, and no platform is purpose-built for creator-to-creator and creator-to-brand collaboration. Creators waste hours scrolling DMs, searching hashtags, and relying on word-of-mouth. Brands struggle to discover authentic, niche-relevant creators near a target location.

## 2. Solution

**CollabSphere** is a collaboration marketplace exclusively for social media influencers, creators, and brands. It provides a structured, verified, and searchable environment where every user has one verified profile, discovery is powered by location and niche, and collaboration flows are organized.

## 3. Sprint 1 Objective

> Set up the project foundation, implement the complete authentication system, and deliver a working login experience.

**Milestone:** Users can sign up via phone OTP, verify their email, and log in with JWT tokens.

## 4. Target Users (Sprint 1)

| User | Sprint 1 Interaction |
|------|---------------------|
| **Creator / Influencer** | Signs up with phone, verifies email, logs in |
| **Brand** | Signs up with phone, verifies email, logs in |
| **Admin** | Role exists in the data model but no admin UI in Sprint 1 |

## 5. User Stories

### US-1: Phone OTP Registration
**As a** creator or brand,
**I want to** sign up using my phone number and receive an OTP,
**So that** I can create an account without needing a password.

**Acceptance Criteria:**
- User enters a valid phone number (E.164 format, e.g. +919876543210)
- System sends a 6-digit OTP to the phone number
- OTP expires after 5 minutes
- User enters OTP and is logged in with JWT tokens
- If user doesn't exist, a new account is created
- If user exists, they're logged in to their existing account
- Invalid phone format returns a 400 error
- Rate limit: max 3 OTP requests per phone per 15 minutes
- After 5 failed OTP attempts, account is locked for 30 minutes

### US-2: Email Verification
**As a** registered user,
**I want to** verify my email address,
**So that** my account has a verified communication channel.

**Acceptance Criteria:**
- After phone verification, user can submit their email
- System sends a verification link to the email
- Link contains a signed JWT token valid for 24 hours
- Clicking the link sets `emailVerified = true`
- Expired or invalid tokens return appropriate errors
- Already-verified emails are rejected with a message
- Re-send cooldown: 60 seconds between attempts

### US-3: Session Management
**As a** logged-in user,
**I want to** stay logged in across browser sessions,
**So that** I don't have to re-authenticate every 15 minutes.

**Acceptance Criteria:**
- Access token (JWT) expires in 15 minutes
- Refresh token (JWT) expires in 7 days, stored as HTTP-only cookie
- When access token expires, client silently refreshes using the cookie
- Token rotation: new refresh token issued on every refresh
- Logout invalidates the refresh token server-side
- Accessing protected routes without a valid token returns 401

### US-4: Login Page
**As a** new or returning user,
**I want to** see a clean login page with phone input and OTP verification,
**So that** I can easily sign up or log in.

**Acceptance Criteria:**
- Dark themed UI matching CollabSphere design system
- Step 1: Phone number input with +91 prefix, "Send OTP" button
- Step 2: 6-digit OTP input with auto-focus, "Verify" button
- Resend OTP countdown timer (30 seconds)
- Error states shown via toast notifications
- Loading states on buttons during API calls
- Redirect to dashboard on successful login

### US-5: Email Verification Page
**As a** logged-in user whose email is not verified,
**I want to** see an email verification page,
**So that** I can complete my account setup.

**Acceptance Criteria:**
- Shows current verification status
- "Send Verification Email" button with email input
- Handles `?token=xxx` query parameter for email confirmation
- Success state redirects to dashboard
- Error states for expired/invalid tokens

## 6. Tech Stack (Sprint 1)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router) + Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT (HS256) + Phone OTP + Email verification (Nodemailer) |
| Testing | Jest + Supertest + mongodb-memory-server |
| OTP (dev) | Console logging (no Twilio account required) |

## 7. Architecture Summary

```
Client (Next.js)  →  Express API (/api/v1/auth/*)  →  MongoDB Atlas
                         ↓
                   Middleware Stack:
                   cors → helmet → json → cookieParser
                   → rateLimiter → authenticate → validate
                   → controller → errorHandler
```

**Backend pattern:** Modular with service layer
- `auth.routes.ts` → `auth.controller.ts` → `auth.service.ts` → `auth.repository.ts` → `User` model
- Interfaces for all services (SOLID: Dependency Inversion)
- Abstract `BaseRepository` for reusable CRUD (OOP: Inheritance)
- `EventBus` singleton for decoupled side-effects (Observer Pattern)

## 8. API Endpoints (Sprint 1)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/otp/send` | Public | Send OTP to phone |
| POST | `/api/v1/auth/otp/verify` | Public | Verify OTP, issue JWT |
| POST | `/api/v1/auth/email/send` | Token | Send email verification link |
| GET | `/api/v1/auth/email/verify/:token` | Public | Confirm email via link |
| POST | `/api/v1/auth/refresh` | Cookie | Rotate access + refresh tokens |
| POST | `/api/v1/auth/logout` | Token | Invalidate refresh token |
| GET | `/api/v1/auth/me` | Token | Get current authenticated user |

See `docs/API_SPEC.md` for full request/response contracts.

## 9. Data Model (Sprint 1)

**Single collection:** `users`

Key fields: phone (unique), email (unique), phoneVerified, emailVerified, role (creator/brand/admin), isActive, isBanned, refreshToken (hashed), otp (embedded subdocument with hashed code, expiry, attempts, lockout).

See `docs/DATA_MODEL.md` for full schema.

## 10. Security Requirements

| Measure | Spec |
|---------|------|
| Access token | JWT, HS256, 15-minute expiry |
| Refresh token | JWT, HS256, 7-day expiry, hashed in DB, HTTP-only secure cookie |
| Token rotation | New refresh token on every /refresh call |
| OTP storage | bcrypt hashed, 5-minute TTL |
| OTP rate limit | Max 3 requests per phone per 15 minutes |
| OTP lockout | Lock after 5 failed attempts for 30 minutes |
| Email token | Signed JWT, 24-hour expiry, one-time use |
| Input validation | Zod schemas on every endpoint |
| API rate limit | 100 req/15min (general), 10 req/15min (auth) |
| Headers | helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Whitelist frontend origin only, credentials: true |

See `docs/AUTH_FLOWS.md` for detailed flow diagrams.

## 11. UI Specification (Sprint 1)

### Design Tokens
- **Background:** `#0F1117` (primary), `#161B26` (cards), `#1C2333` (elevated)
- **Accent:** `#6C63FF` (primary), `#4F8AFF` (secondary)
- **Text:** `#F1F3F9` (primary), `#94A3B8` (secondary), `#64748B` (muted)
- **Status:** `#34D399` (success), `#FBBF24` (warning), `#F87171` (error)
- **Font:** Inter (Google Fonts)
- **Border radius:** 12px (cards), 8px (buttons), 999px (pills)

### Pages

**Login Page (`/login`)**
```
┌──────────────────────────────────────┐
│          CollabSphere Logo           │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Step 1: Phone Number        │   │
│  │  ┌──────┬──────────────────┐ │   │
│  │  │ +91  │ Enter phone      │ │   │
│  │  └──────┴──────────────────┘ │   │
│  │  [ Send OTP ]                │   │
│  │                              │   │
│  │  Step 2: OTP Verification    │   │
│  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│  │
│  │  │  │ │  │ │  │ │  │ │  │ │  ││  │
│  │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│  │
│  │  [ Verify ]    Resend in 30s  │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

**Email Verification Page (`/verify`)**
```
┌──────────────────────────────────────┐
│          CollabSphere Logo           │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Verify Your Email            │   │
│  │                              │   │
│  │  ┌──────────────────────────┐│   │
│  │  │ Enter email address      ││   │
│  │  └──────────────────────────┘│   │
│  │  [ Send Verification Email ] │   │
│  │                              │   │
│  │  Status: Pending / Verified  │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

**Dashboard Placeholder (`/`)**
```
┌──────────────────────────────────────┐
│  CollabSphere    [Logout]            │
├──────────────────────────────────────┤
│                                      │
│  Welcome, +919876543210              │
│  Email: verified ✓ / not verified ✗  │
│                                      │
│  (Sprint 2 content goes here)        │
│                                      │
└──────────────────────────────────────┘
```

## 12. Test Cases (Sprint 1)

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-1.1 | Send OTP to valid phone | 200, OTP sent message |
| TC-1.2 | Send OTP to invalid phone | 400, validation error |
| TC-1.3 | Verify correct OTP | 200, accessToken + Set-Cookie |
| TC-1.4 | Verify incorrect OTP | 401, unauthorized |
| TC-1.5 | Verify expired OTP | 401, token expired |
| TC-1.6 | Send email verification (authenticated) | 200, email sent |
| TC-1.7 | Confirm email via valid token | 200, emailVerified = true |
| TC-1.8 | Confirm email with expired token | 400, token expired |
| TC-1.9 | Access protected route without token | 401, unauthorized |
| TC-1.10 | Refresh token rotation | 200, new accessToken |
| TC-1.11 | Logout | 200, refresh cookie cleared |

## 13. Out of Scope (Sprint 1)

These items are NOT part of Sprint 1. Do not implement them:

- Profile creation/editing (Sprint 2)
- Cloudinary/media uploads (Sprint 2)
- Discovery/search (Sprint 3)
- Collaboration requests (Sprint 4)
- Messaging/Socket.io (Sprint 5)
- Social OAuth verification (Sprint 5)
- Admin panel (Sprint 5)
- Deployment (Sprint 6)

## 14. Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| MongoDB Atlas not configured yet | .env with placeholder URI; tests use mongodb-memory-server |
| No Twilio account | Dev mode logs OTP to console |
| SMTP credentials not set up | Can use Ethereal (fake SMTP) for development |
| Cookie handling across origins | Test CORS + credentials early in dev |

## 15. Definition of Done

Sprint 1 is complete when:
- [ ] All 11 test cases pass (unit + integration)
- [ ] Login page works: phone → OTP → logged in
- [ ] Email verification works: send link → click → verified
- [ ] Token refresh works silently
- [ ] Logout works and clears session
- [ ] Protected routes redirect unauthenticated users
- [ ] Server starts without errors with valid .env
- [ ] Client starts without errors
