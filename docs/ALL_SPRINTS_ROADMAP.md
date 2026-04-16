# CollabSphere — Complete Sprint Roadmap (Simplified)

**Project:** CollabSphere — Creator collaboration marketplace  
**Status:** Sprint 2 complete (Profile system done). Starting Sprint 3.  
**Format:** High-level overview with core tasks per sprint. No bloat.

---

## Sprint 1: Authentication ✅ COMPLETE

**Status:** Done (as of 2026-04-16)

**Delivered:**
- Phone OTP login flow
- Email verification
- JWT token management (access + refresh)
- Login and verify pages
- All tests passing

**Key files:** `server/src/modules/auth/`, `client/src/app/(auth)/`

---

## Sprint 2: Profile System ✅ COMPLETE

**Status:** Done (as of 2026-04-16)

**Delivered:**
- Profile CRUD endpoints (POST, GET, PATCH, DELETE)
- Avatar/cover image upload to Cloudinary
- Location autocomplete (Nominatim proxy)
- Profile detail pages (view own, edit own, view others)
- Profile completeness indicator
- Editorial Noir design applied

**Key files:** `server/src/modules/profile/`, `client/src/app/(main)/profile/`

---

## Sprint 3: Discovery & Search (11–12 hrs)

**Goal:** Users can discover creators by filtering on city, niche, platform.

**Core Features:**
- Search endpoint with city/niche/platform filters
- Discover page with search bar + filter pills
- City autocomplete
- ProfileCard grid display

**What's NOT included (defer to 3.5):**
- Geospatial radius search
- Follower range filtering
- Pagination UI
- Sorting

**Tasks:** 17 (see `docs/SPRINT_3_SIMPLIFIED.md` for full breakdown)

**Key deliverables:**
- `POST /api/v1/search/profiles` endpoint
- `GET /api/v1/search/cities` endpoint
- `/discover` page

---

## Sprint 4: Collaboration Marketplace (14–16 hrs)

**Goal:** Creators and brands can send collaboration requests and manage them.

### Backend Tasks

**Task 1: Create CollaborationRequest Model**
- Status: pending, accepted, rejected, completed
- From user (creator), to user (brand)
- Description, proposal details
- Budget/compensation
- Timeline/duration

**Task 2: Collaboration Request CRUD**
- `POST /api/v1/collaborations` — create request
- `GET /api/v1/collaborations` — list requests (my inbox + sent)
- `PATCH /api/v1/collaborations/:id` — update status (accept/reject)
- `DELETE /api/v1/collaborations/:id` — cancel request

**Task 3: Add Validation**
- Only creators can receive requests, brands/admins can send
- Status transitions: pending → accepted/rejected → completed
- Users can't request themselves
- Zod schemas for all inputs

**Task 4: Write Tests**
- CRUD tests
- Status transition tests
- Authorization tests

### Frontend Tasks

**Task 5: Create Collaboration Request Form**
- Modal or page to create new request
- Fields: to (user selector), description, budget, duration
- Submit button, error handling

**Task 6: Create Inbox Page**
- List incoming collaboration requests
- Show requester, description, status
- Accept/reject/delete actions
- Filter by status (pending, accepted, rejected)

**Task 7: Create Sent Requests Page**
- List outgoing collaboration requests
- Show recipient, status
- Cancel action

**Task 8: Add to Profile Page**
- Show "Active Collaborations" section on profile
- Only visible to profile owner
- Quick link to inbox

### Database
- New collection: `collaborationrequests`
- Index on: `fromUserId`, `toUserId`, `status`, `createdAt`

### Documentation
- Add 4 endpoints to API_SPEC.md
- Add error codes

---

## Sprint 5: Messaging & Social Verification (18–20 hrs)

**Goal:** Creators can message each other in real-time. Link social accounts for verification.

### Backend Tasks

**Task 1: Socket.io Setup**
- Configure Socket.io on Express server
- Authentication via JWT
- Namespace: `/messages`

**Task 2: Message Model & Schema**
- Conversation collection (participants, lastMessage, updatedAt)
- Message collection (conversationId, senderId, text, timestamp, read status)
- Index on conversationId, timestamp

**Task 3: Message CRUD Endpoints**
- `POST /api/v1/messages` — send message
- `GET /api/v1/conversations` — list conversations
- `GET /api/v1/conversations/:id/messages` — get conversation messages (paginated)
- `PATCH /api/v1/messages/:id/read` — mark as read

**Task 4: Socket Events**
- `message:send` — broadcast new message
- `message:read` — broadcast read receipt
- `user:typing` — typing indicator
- `user:online` / `user:offline` — presence

**Task 5: OAuth Integration (Instagram/Twitter/YouTube)**
- Create OAuth routes for each platform
- Store access tokens encrypted in User model
- Verify creator's follower count from actual platform API

**Task 6: Verification Badge Logic**
- Mark profile as verified if:
  - Follower count on linked platform matches reported count
  - Email verified
  - Phone verified
- Cron job to refresh verification weekly

**Task 7: Admin Panel Basics**
- `/admin` route (authenticated + admin role)
- List all users, mark/unmark verified, ban/unban users
- View flagged profiles
- Simple table UI

**Task 8: Write Tests**
- Socket.io tests (message send/receive)
- OAuth flow tests
- Message CRUD tests

### Frontend Tasks

**Task 9: Real-time Messaging Page**
- `/messages` page
- Left sidebar: conversation list (avatar, name, last message, unread count)
- Right pane: message thread (messages, input box, send button)
- Auto-scroll to latest message
- Typing indicator

**Task 10: Conversation Start Modal**
- Search for user to message
- Create new conversation

**Task 11: Socket.io Integration**
- Connect on mount, authenticate with JWT
- Listen for `message:send`, `message:read`, `user:typing`
- Emit events on message send, read receipts

**Task 12: Social Link UI**
- Profile edit: "Link Instagram", "Link Twitter", "Link YouTube"
- OAuth redirect, token stored
- Show verified badge if verified

**Task 13: Admin Dashboard (Basic)**
- List all users with verification status
- Ban/unban buttons
- View profile details

### Database
- New collections: `conversations`, `messages`
- Update User model: add `verifiedPlatforms` array, `isVerified` boolean, OAuth tokens

### Documentation
- Add 6 endpoints to API_SPEC.md
- Add Socket.io events to docs
- Add OAuth flow diagram

---

## Sprint 6: Polish & Deployment (10–12 hrs)

**Goal:** Ship to production. Handle edge cases. Write final report.

### Backend Tasks

**Task 1: Performance Optimization**
- Add caching (Redis or in-memory) for frequently accessed profiles
- Optimize search queries with better indexes
- Rate limiting on all public endpoints

**Task 2: Error Handling Audit**
- Ensure all endpoints return proper error responses
- Test error cases (invalid input, unauthorized, not found)
- Add middleware for 404s

**Task 3: Security Audit**
- HTTPS only (verify in deployment)
- Helmet.js headers
- Input sanitization
- SQL injection / NoSQL injection tests
- CORS whitelist validation
- Token expiry handling

**Task 4: Logging & Monitoring**
- Add structured logging (Winston or Pino)
- Log all API calls, errors, auth events
- Set up basic alerting

### Frontend Tasks

**Task 5: UX Polish**
- Test responsive layout on real devices
- Fix any design inconsistencies
- Smooth transitions between pages
- Error boundary components
- 404 page

**Task 6: Performance**
- Lazy load images (Cloudinary + next/image)
- Code splitting
- Bundle analysis
- Remove unused dependencies

**Task 7: Accessibility**
- Test keyboard navigation
- ARIA labels on all interactive elements
- Color contrast check
- Semantic HTML

### Deployment Tasks

**Task 8: Deploy Backend**
- Push to Render with MongoDB Atlas connection
- Set environment variables (.env)
- Run migrations if needed
- Test API endpoints in production

**Task 9: Deploy Frontend**
- Push to Vercel
- API endpoints point to production backend
- Test full user flows
- Monitor Vercel analytics

**Task 10: Final Testing**
- Smoke tests (login, signup, search, message, profile)
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile device testing
- Load testing (simple)

### Documentation

**Task 11: Write Final Report**
- Feature summary
- Architecture overview
- Known limitations
- Deployment guide
- Testing coverage report

**Task 12: Create README**
- Project overview
- Tech stack
- Installation instructions
- API docs link
- Contributing guide

### Database
- No schema changes

---

## Summary Table

| Sprint | Focus | Effort | Status |
|--------|-------|--------|--------|
| **1** | Auth | 8 hrs | ✅ Complete |
| **2** | Profile | 10 hrs | ✅ Complete |
| **3** | Discovery & Search | 11–12 hrs | 🔄 Next |
| **4** | Collaboration Marketplace | 14–16 hrs | Planned |
| **5** | Messaging & Social Verification | 18–20 hrs | Planned |
| **6** | Polish & Deployment | 10–12 hrs | Planned |

**Total:** ~71–78 hours over 12 weeks (5–6 hrs/week average)

---

## Key Decisions (Simplified Rules)

1. **No feature creep** — stick to the sprint scope, defer P2 items to later sprints
2. **Build to scale** — add indexes, caching, rate limiting from day 1
3. **Test first** — TDD cycle: test → implement → refactor
4. **Ship incrementally** — each sprint ships a working feature, not a half-baked component
5. **Simplify before complexity** — start with basic functionality, polish in Sprint 3.5+

---

## Execution Notes

- Sprints are 2 weeks each
- Check this document before starting a new sprint
- If a sprint is running over, bump lower-priority items to next sprint (marked P2)
- Use `docs/SPRINT_X_SIMPLIFIED.md` for full task breakdown when starting
- Update this file as priorities change

---

## Post-Sprint 6: Future Enhancements (Not in MVP)

- Advanced analytics dashboard
- Creator portfolio pages
- Portfolio site generation
- Payment processing (Stripe)
- Contract/agreement templates
- Review/rating system
- Recommendation algorithm
- Mobile app (iOS/Android)
- Webhook system for third-party integrations

These are intentionally NOT in the 6-sprint plan. They're nice-to-have for Phase 2.
