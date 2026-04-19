# Sprint 5: Messaging System Plan

## Overview

When a creator accepts a collaboration request, a direct conversation is automatically created between the creator and the brand. Both users can then exchange messages in real time via a dedicated Messages page.

## Chunk Progress

| Chunk | Focus | Status |
|-------|-------|--------|
| **A** | Models + Backend Module + Tests | COMPLETE |
| **B** | EventBus Integration + Collab Accept Flow | COMPLETE |
| **C** | Socket.io Server Setup | COMPLETE |
| **D** | Frontend: Service, Hook, Components, Page | COMPLETE |
| **E** | Socket.io Client + Real-Time Integration | COMPLETE |

---

## Chunk A: Models + Backend Module + Tests

**Goal:** Conversation and Message models, full messaging REST module, all backend tests.

**Deliverables:**
1. `server/src/models/Conversation.ts` — Mongoose schema with indexes on `participants` and `collaborationRequestId` (unique)
2. `server/src/models/Message.ts` — Mongoose schema with compound indexes `{ conversationId, createdAt }` and `{ conversationId, senderId, readAt }`
3. `server/src/modules/messaging/` — standard 6-file module:
   - `messaging.interfaces.ts` — IMessagingService, IMessagingRepository, DTOs
   - `messaging.validation.ts` — Zod schemas for send message, get conversations, get messages
   - `messaging.repository.ts` — extends BaseRepository, conversation/message queries
   - `messaging.service.ts` — business logic, authorization, conversation creation
   - `messaging.controller.ts` — HTTP handlers
   - `messaging.routes.ts` — route definitions with auth middleware
4. Wire routes in `server/src/index.ts`
5. `server/tests/messaging/messaging.service.test.ts` — unit tests
6. `server/tests/messaging/messaging.integration.test.ts` — integration tests

**REST Endpoints:**

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 23 | GET | `/api/v1/messages/conversations` | authenticate | List user's conversations (paginated, sorted by lastMessage.createdAt desc) |
| 24 | GET | `/api/v1/messages/conversations/:id` | authenticate | Get single conversation (with participant details) |
| 25 | GET | `/api/v1/messages/conversations/:id/messages` | authenticate | Get messages for a conversation (paginated, cursor-based by createdAt) |
| 26 | POST | `/api/v1/messages/conversations/:id/messages` | authenticate | Send a message to a conversation |
| 27 | PATCH | `/api/v1/messages/conversations/:id/read` | authenticate | Mark all messages in conversation as read |

**Response Shapes:**

```typescript
// GET /conversations
{
  success: true,
  data: [
    {
      _id: "...",
      participants: [{ _id, displayName, avatar }],
      collaborationRequestId: "...",
      lastMessage: { content, senderId, createdAt },
      unreadCount: 3
    }
  ],
  pagination: { page, limit, total, hasNext }
}

// GET /conversations/:id/messages
{
  success: true,
  data: [{ _id, conversationId, senderId, content, readAt, createdAt }],
  pagination: { page, limit, total, hasNext }
}

// POST /conversations/:id/messages
{
  success: true,
  data: { _id, conversationId, senderId, content, createdAt },
  message: "Message sent"
}
```

**Data Models:**

### Conversation
```typescript
interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];          // exactly 2 user IDs
  collaborationRequestId: Types.ObjectId;  // link back to the collab that spawned it
  lastMessage?: {
    content: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Message
```typescript
interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  readAt?: Date;                           // null until recipient reads it
  createdAt: Date;
  updatedAt: Date;
}
```

**Verification:** `npm test` — all messaging tests pass, no regressions.

---

## Chunk B: EventBus Integration + Collab Accept Flow

**Goal:** Auto-create conversation when a collaboration request is accepted. Return conversationId in accept response.

**Deliverables:**
1. Add `COLLAB_ACCEPTED` event to `server/src/shared/EventBus.ts`
2. Modify `server/src/modules/collaboration/collaboration.service.ts` — emit `COLLAB_ACCEPTED` after accept
3. Messaging service subscribes to `COLLAB_ACCEPTED` — creates conversation with `participants: [creatorId, brandId]` and `collaborationRequestId`
4. Idempotent: skip creation if conversation already exists for that collab request
5. Modify `server/src/modules/collaboration/collaboration.controller.ts` — return `conversationId` in accept response
6. Update collaboration integration tests to verify conversation creation on accept

**Verification:** `npm test` — all tests pass including new collab+messaging integration.

---

## Chunk C: Socket.io Server Setup

**Goal:** Real-time WebSocket layer with JWT auth.

**Deliverables:**
1. Install `socket.io` (server) and `socket.io-client` (client)
2. Create `server/src/config/socket.ts` — attach Socket.io to HTTP server with JWT auth middleware
3. Wire socket events:
   - `join_conversation` / `leave_conversation` — room management
   - `send_message` — broadcast `new_message` to conversation room after REST persist
   - `messages_read` — notify sender their messages were read
4. Integrate socket broadcast into messaging controller (POST message + PATCH read)

**Architecture:** REST endpoints remain source of truth for all writes. Socket.io is notification/broadcast only.

**Verification:** Server starts without errors. Socket auth rejects invalid tokens.

---

## Chunk D: Frontend — Service, Hook, Components, Page

**Goal:** Full Messages UI with conversation list and chat window.

**New Files:**

| Path | Purpose |
|------|---------|
| `client/src/services/messagingService.ts` | API client for messaging endpoints |
| `client/src/hooks/useMessaging.ts` | Messaging state, send/fetch/read |
| `client/src/components/messaging/ConversationList.tsx` | Sidebar with conversation previews |
| `client/src/components/messaging/ChatWindow.tsx` | Message thread + input |
| `client/src/components/messaging/MessageBubble.tsx` | Single message display |
| `client/src/app/(main)/messages/page.tsx` | Messages page (conversation list + chat) |

**Layout:**
- Desktop: two-column split. Conversation list on left (300px), chat on right.
- Mobile: conversation list is default view. Tapping a conversation shows chat full screen. Back button returns to list.

**Modified Files:**
- `client/src/app/(main)/layout.tsx` — activate "Messages" nav link
- `client/src/hooks/useCollaboration.ts` — accept returns conversationId, navigate to `/messages?conversation={id}`
- `client/src/components/collaboration/RequestCard.tsx` — accept navigates to messages

**Design System:**
- Editorial Noir tokens (ink, paper, amber, line)
- Conversation list: 1px `--line` separators, no card wrappers
- Chat bubbles: sender (right, `--ink-2`), receiver (left, `--ink-1`)
- Input: `--ink-2` background, `--amber` focus ring, 0-radius
- Eyebrow: `04 / MESSAGES`
- Framer Motion fadeUp on page load
- No dashes in UI copy

**Verification:** Manual browser test — navigate to /messages, see conversation list, open a conversation, send a message via REST.

---

## Chunk E: Socket.io Client + Real-Time Integration

**Goal:** Wire Socket.io client so messages appear in real time without page refresh.

**New Files:**

| Path | Purpose |
|------|---------|
| `client/src/context/SocketContext.tsx` | Socket provider for the app |
| `client/src/hooks/useSocket.ts` | Socket.io connection management |

**Deliverables:**
1. SocketContext wraps the app, connects on auth, disconnects on logout
2. useSocket hook joins/leaves conversation rooms
3. `new_message` event appends message to chat in real time
4. `messages_read` event updates read receipts
5. Conversation list updates `lastMessage` preview on new messages

**Verification:** Open two browser tabs as different users. Send message in one, appears instantly in the other.
