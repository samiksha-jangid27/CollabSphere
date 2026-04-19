// ABOUTME: Zod validation schemas for messaging endpoints.
// ABOUTME: Validates params, query, and body at the route middleware layer.

import { z } from 'zod';

export const getConversationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

export const conversationIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
  body: z.object({
    content: z.string().min(1, 'Message content is required').max(5000, 'Message cannot exceed 5000 characters'),
  }),
});

export const conversationByCollabSchema = z.object({
  params: z.object({
    collabId: z.string().min(1, 'Collaboration ID is required'),
  }),
});

export const markReadSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
});
