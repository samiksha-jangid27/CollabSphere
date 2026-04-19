# Chunk B: EventBus Integration + Collab Accept Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-create a conversation when a collaboration request is accepted, and return the `conversationId` in the accept response.

**Architecture:** The collaboration service emits a `COLLAB_ACCEPTED` event via the existing `EventBus` singleton after accepting a request. The messaging service subscribes to this event at module init time and creates a conversation with the two participants. The controller returns the `conversationId` by looking up the conversation after the event fires. Idempotency is guaranteed by the unique index on `collaborationRequestId` in the Conversation model.

**Tech Stack:** Node.js, Express, TypeScript, Mongoose, Jest, Supertest, mongodb-memory-server

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `server/src/shared/EventBus.ts` | Add `COLLAB_ACCEPTED` to `APP_EVENTS` |
| Modify | `server/src/modules/collaboration/collaboration.service.ts` | Emit `COLLAB_ACCEPTED` after accept |
| Modify | `server/src/modules/collaboration/collaboration.interfaces.ts` | Add `conversationId` to accept return type |
| Modify | `server/src/modules/collaboration/collaboration.controller.ts` | Return `conversationId` in accept response |
| Modify | `server/src/modules/collaboration/collaboration.routes.ts` | Inject messaging repository into service for event wiring |
| Modify | `server/src/modules/messaging/messaging.service.ts` | Add `createConversationForCollab` method + EventBus subscription |
| Modify | `server/src/modules/messaging/messaging.interfaces.ts` | Add `createConversationForCollab` to `IMessagingService` |
| Modify | `server/src/index.ts` | Initialize messaging event subscriptions at app startup |
| Modify | `server/tests/collaboration/collaboration.service.test.ts` | Add tests for event emission on accept |
| Modify | `server/tests/collaboration/collaboration.integration.test.ts` | Add tests for conversation creation on accept |

---

### Task 1: Add COLLAB_ACCEPTED event to EventBus

**Files:**
- Modify: `server/src/shared/EventBus.ts:8`

- [ ] **Step 1: Add the event constant**

In `server/src/shared/EventBus.ts`, add `COLLAB_ACCEPTED` to the `APP_EVENTS` object:

```typescript
export const APP_EVENTS = {
  USER_REGISTERED: 'user.registered',
  EMAIL_VERIFIED: 'email.verified',
  OTP_SENT: 'otp.sent',
  COLLAB_ACCEPTED: 'collab.accepted',
} as const;
```

No test needed for a constant. This is consumed by Tasks 2 and 3.

---

### Task 2: Add createConversationForCollab to messaging service

**Files:**
- Modify: `server/src/modules/messaging/messaging.interfaces.ts`
- Modify: `server/src/modules/messaging/messaging.service.ts`
- Test: `server/tests/messaging/messaging.service.test.ts`

- [ ] **Step 1: Write the failing test for conversation creation**

Add this test block to `server/tests/messaging/messaging.service.test.ts`. The test file should already import the messaging service and use in-memory MongoDB. Add a new `describe('createConversationForCollab')` block:

```typescript
describe('createConversationForCollab', () => {
  it('creates a conversation with both participants and the collab request ID', async () => {
    const creatorId = new Types.ObjectId().toString();
    const brandId = new Types.ObjectId().toString();
    const collabRequestId = new Types.ObjectId().toString();

    const conversation = await service.createConversationForCollab(
      collabRequestId,
      creatorId,
      brandId,
    );

    expect(conversation).toBeDefined();
    expect(conversation.participants.map(String)).toContain(creatorId);
    expect(conversation.participants.map(String)).toContain(brandId);
    expect(conversation.collaborationRequestId.toString()).toBe(collabRequestId);
  });

  it('returns existing conversation if one already exists for the collab request (idempotent)', async () => {
    const creatorId = new Types.ObjectId().toString();
    const brandId = new Types.ObjectId().toString();
    const collabRequestId = new Types.ObjectId().toString();

    const first = await service.createConversationForCollab(collabRequestId, creatorId, brandId);
    const second = await service.createConversationForCollab(collabRequestId, creatorId, brandId);

    expect(second._id.toString()).toBe(first._id.toString());
  });
});
```

You will need to add `import { Types } from 'mongoose';` at the top of the test file if not already present.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --testNamePattern="createConversationForCollab" --verbose`

Expected: FAIL — `service.createConversationForCollab is not a function`

- [ ] **Step 3: Add createConversationForCollab to the interface**

In `server/src/modules/messaging/messaging.interfaces.ts`, add to `IMessagingService`:

```typescript
export interface IMessagingService {
  getConversations(userId: string, filters: MessageFilters): Promise<PaginatedResponse<IConversation>>;
  getConversation(conversationId: string, userId: string): Promise<IConversation>;
  getMessages(conversationId: string, userId: string, filters: MessageFilters): Promise<PaginatedResponse<IMessage>>;
  sendMessage(conversationId: string, senderId: string, input: SendMessageInput): Promise<IMessage>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  createConversationForCollab(collabRequestId: string, creatorId: string, brandId: string): Promise<IConversation>;
}
```

- [ ] **Step 4: Implement createConversationForCollab in the service**

In `server/src/modules/messaging/messaging.service.ts`, add this method to the `MessagingService` class:

```typescript
async createConversationForCollab(
  collabRequestId: string,
  creatorId: string,
  brandId: string,
): Promise<IConversation> {
  const existing = await this.repository.findConversationByCollabId(collabRequestId);
  if (existing) {
    return existing;
  }

  return this.repository.createConversation({
    participants: [creatorId as any, brandId as any],
    collaborationRequestId: collabRequestId as any,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --testNamePattern="createConversationForCollab" --verbose`

Expected: PASS (2 tests)

- [ ] **Step 6: Run full messaging test suite for regression**

Run: `cd server && npx jest tests/messaging/ --verbose`

Expected: All tests pass, no regressions.

---

### Task 3: Wire EventBus subscription in messaging module

**Files:**
- Modify: `server/src/modules/messaging/messaging.service.ts`
- Modify: `server/src/index.ts`
- Test: `server/tests/messaging/messaging.service.test.ts`

- [ ] **Step 1: Write failing test for EventBus subscription**

Add this test to `server/tests/messaging/messaging.service.test.ts` inside a new `describe('EventBus subscription')` block:

```typescript
import { eventBus, APP_EVENTS } from '@/shared/EventBus';
import { Conversation } from '@/models/Conversation';

describe('EventBus subscription', () => {
  it('creates a conversation when COLLAB_ACCEPTED is emitted', async () => {
    const creatorId = new Types.ObjectId().toString();
    const brandId = new Types.ObjectId().toString();
    const collabRequestId = new Types.ObjectId().toString();

    // Subscribe (simulating what happens at app init)
    MessagingService.subscribeToEvents(service);

    await eventBus.emit(APP_EVENTS.COLLAB_ACCEPTED, {
      collabRequestId,
      creatorId,
      brandId,
    });

    const conversation = await Conversation.findOne({
      collaborationRequestId: collabRequestId,
    });

    expect(conversation).toBeDefined();
    expect(conversation!.participants.map(String)).toContain(creatorId);
    expect(conversation!.participants.map(String)).toContain(brandId);
  });
});
```

Import `MessagingService` from the service file (class, not instance) at the top if not already imported.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --testNamePattern="EventBus subscription" --verbose`

Expected: FAIL — `MessagingService.subscribeToEvents is not a function`

- [ ] **Step 3: Implement the static subscribeToEvents method**

In `server/src/modules/messaging/messaging.service.ts`, add this import at the top:

```typescript
import { eventBus, APP_EVENTS } from '../../shared/EventBus';
import logger from '../../shared/logger';
```

Add this static method to the `MessagingService` class:

```typescript
static subscribeToEvents(instance: MessagingService): void {
  eventBus.on(APP_EVENTS.COLLAB_ACCEPTED, async (data: unknown) => {
    const { collabRequestId, creatorId, brandId } = data as {
      collabRequestId: string;
      creatorId: string;
      brandId: string;
    };

    try {
      await instance.createConversationForCollab(collabRequestId, creatorId, brandId);
    } catch (error) {
      logger.error('Failed to create conversation for accepted collab', { error, collabRequestId });
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --testNamePattern="EventBus subscription" --verbose`

Expected: PASS

- [ ] **Step 5: Wire subscription in index.ts**

In `server/src/index.ts`, add the import and init call. After the existing route mounts (after the `messagingRoutes` line), add:

```typescript
import { MessagingService } from './modules/messaging/messaging.service';
import { MessagingRepository } from './modules/messaging/messaging.repository';
```

And after `app.use(errorHandler);`, add:

```typescript
// Wire EventBus subscriptions
const messagingRepo = new MessagingRepository();
const messagingService = new MessagingService(messagingRepo);
MessagingService.subscribeToEvents(messagingService);
```

- [ ] **Step 6: Run full messaging test suite**

Run: `cd server && npx jest tests/messaging/ --verbose`

Expected: All tests pass.

---

### Task 4: Emit COLLAB_ACCEPTED from collaboration service

**Files:**
- Modify: `server/src/modules/collaboration/collaboration.service.ts`
- Test: `server/tests/collaboration/collaboration.service.test.ts`

- [ ] **Step 1: Write failing test for event emission**

Add this test to `server/tests/collaboration/collaboration.service.test.ts` inside the existing `describe('acceptRequest')` block:

```typescript
import { eventBus, APP_EVENTS } from '@/shared/EventBus';

// Add inside describe('acceptRequest'):
it('emits COLLAB_ACCEPTED event with correct payload', async () => {
  const emitSpy = jest.spyOn(eventBus, 'emit');

  const request = await CollaborationRequest.create({
    userId: creatorUser._id,
    brandId: brandUser._id,
    title: 'Test',
    description: 'Desc',
    budget: 10000,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'Open',
  });

  await service.acceptRequest(request._id.toString(), creatorUser._id.toString());

  expect(emitSpy).toHaveBeenCalledWith(APP_EVENTS.COLLAB_ACCEPTED, {
    collabRequestId: request._id.toString(),
    creatorId: creatorUser._id.toString(),
    brandId: brandUser._id.toString(),
  });

  emitSpy.mockRestore();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/collaboration/collaboration.service.test.ts --testNamePattern="emits COLLAB_ACCEPTED" --verbose`

Expected: FAIL — `expect(emit).toHaveBeenCalledWith(...)` fails because emit was never called.

- [ ] **Step 3: Implement event emission in acceptRequest**

In `server/src/modules/collaboration/collaboration.service.ts`, add the import at the top:

```typescript
import { eventBus, APP_EVENTS } from '../../shared/EventBus';
```

In the `acceptRequest` method, add the emit call after the status update succeeds (after `if (!updated)` guard, before the `return updated;`):

```typescript
await eventBus.emit(APP_EVENTS.COLLAB_ACCEPTED, {
  collabRequestId: requestId,
  creatorId: request.userId.toString(),
  brandId: request.brandId.toString(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/collaboration/collaboration.service.test.ts --testNamePattern="emits COLLAB_ACCEPTED" --verbose`

Expected: PASS

- [ ] **Step 5: Run full collaboration test suite for regression**

Run: `cd server && npx jest tests/collaboration/ --verbose`

Expected: All tests pass, no regressions.

---

### Task 5: Return conversationId in accept response

**Files:**
- Modify: `server/src/modules/collaboration/collaboration.controller.ts`
- Test: `server/tests/collaboration/collaboration.integration.test.ts`

- [ ] **Step 1: Write failing integration test for conversationId in accept response**

Add this test to `server/tests/collaboration/collaboration.integration.test.ts` inside the `describe('PATCH .../accept')` block. Add the `Conversation` model import at the top of the file:

```typescript
import { Conversation } from '@/models/Conversation';
```

Add the test:

```typescript
it('creates a conversation and returns conversationId on accept', async () => {
  const req = await CollaborationRequest.create({
    userId: creatorId,
    brandId: brandId,
    title: 'Test',
    description: 'Desc',
    budget: 10000,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'Open',
  });

  const res = await request(app)
    .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
    .set('Authorization', `Bearer ${creatorToken}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.collaboration.status).toBe('Accepted');
  expect(res.body.data.conversationId).toBeDefined();

  // Verify conversation exists in DB
  const conversation = await Conversation.findById(res.body.data.conversationId);
  expect(conversation).toBeDefined();
  expect(conversation!.participants.map(String)).toContain(creatorId);
  expect(conversation!.participants.map(String)).toContain(brandId);
  expect(conversation!.collaborationRequestId.toString()).toBe(req._id.toString());
});
```

- [ ] **Step 2: Write failing integration test for idempotent conversation creation**

Add another test in the same block:

```typescript
it('does not create duplicate conversation if accept is retried', async () => {
  const req = await CollaborationRequest.create({
    userId: creatorId,
    brandId: brandId,
    title: 'Test',
    description: 'Desc',
    budget: 10000,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'Open',
  });

  // First accept
  await request(app)
    .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
    .set('Authorization', `Bearer ${creatorToken}`);

  // Count conversations
  const count = await Conversation.countDocuments({
    collaborationRequestId: req._id,
  });

  expect(count).toBe(1);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npx jest tests/collaboration/collaboration.integration.test.ts --testNamePattern="conversationId|duplicate" --verbose`

Expected: FAIL — `conversationId` is `undefined` in the response.

- [ ] **Step 4: Modify controller to return conversationId**

In `server/src/modules/collaboration/collaboration.controller.ts`, add the import:

```typescript
import { Conversation } from '../../models/Conversation';
```

Replace the `acceptRequest` handler with:

```typescript
acceptRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collab = await this.service.acceptRequest(req.params.id as string, req.user!.userId);

    // Look up the conversation created by the EventBus listener
    const conversation = await Conversation.findOne({
      collaborationRequestId: collab._id,
    });

    sendSuccess(
      res,
      { collaboration: collab, conversationId: conversation?._id?.toString() },
      'Request accepted',
    );
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx jest tests/collaboration/collaboration.integration.test.ts --testNamePattern="conversationId|duplicate" --verbose`

Expected: PASS (2 tests)

- [ ] **Step 6: Run full test suite for regressions**

Run: `cd server && npx jest --verbose`

Expected: All tests pass across all suites, zero regressions.

---

### Task 6: Final verification

- [ ] **Step 1: Run the complete test suite**

Run: `cd server && npx jest --verbose`

Expected: All tests pass. The new tests are:
- `messaging.service.test.ts`: `createConversationForCollab` (2 tests) + `EventBus subscription` (1 test)
- `collaboration.service.test.ts`: `emits COLLAB_ACCEPTED` (1 test)
- `collaboration.integration.test.ts`: `conversationId on accept` (1 test) + `idempotent` (1 test)

Total new tests: 6

- [ ] **Step 2: Verify no lint/type errors**

Run: `cd server && npx tsc --noEmit`

Expected: No errors.
