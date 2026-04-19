// ABOUTME: Messaging route definitions — wires middleware, validation, and controller.
// ABOUTME: Mounted at /api/v1/messages in index.ts.

import { Router } from 'express';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingRepository } from './messaging.repository';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  getConversationsSchema,
  conversationIdSchema,
  conversationByCollabSchema,
  getMessagesSchema,
  sendMessageSchema,
  markReadSchema,
} from './messaging.validation';

const repo = new MessagingRepository();
const service = new MessagingService(repo);
const controller = new MessagingController(service);

const router = Router();

// GET /api/v1/messages/conversations — list user's conversations
router.get('/conversations', authenticate, validate(getConversationsSchema), controller.getConversations);

// GET /api/v1/messages/conversations/by-collab/:collabId — get or create conversation for a collab
router.get(
  '/conversations/by-collab/:collabId',
  authenticate,
  validate(conversationByCollabSchema),
  controller.getConversationByCollab,
);

// GET /api/v1/messages/conversations/:id — get single conversation
router.get('/conversations/:id', authenticate, validate(conversationIdSchema), controller.getConversation);

// GET /api/v1/messages/conversations/:id/messages — get messages in conversation
router.get('/conversations/:id/messages', authenticate, validate(getMessagesSchema), controller.getMessages);

// POST /api/v1/messages/conversations/:id/messages — send a message
router.post('/conversations/:id/messages', authenticate, validate(sendMessageSchema), controller.sendMessage);

// PATCH /api/v1/messages/conversations/:id/read — mark conversation as read
router.patch('/conversations/:id/read', authenticate, validate(markReadSchema), controller.markAsRead);

export default router;
