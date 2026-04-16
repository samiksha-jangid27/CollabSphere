// ABOUTME: Zod validation schemas for collaboration request endpoints.
// ABOUTME: Validates input at the route middleware layer before handlers execute.

import { z } from 'zod';

export const createCollaborationSchema = z.object({
  body: z.object({
    recipientId: z.string().min(1, 'Creator ID is required'),
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    description: z.string().min(1, 'Description is required').max(2000, 'Description cannot exceed 2000 characters'),
    budget: z.number().min(0, 'Budget cannot be negative'),
    deadline: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  }),
});

export const getInboxSchema = z.object({
  query: z.object({
    status: z.enum(['Open', 'Pending', 'Accepted', 'Declined', 'Closed']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const getSentSchema = z.object({
  query: z.object({
    status: z.enum(['Open', 'Pending', 'Accepted', 'Declined', 'Closed']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const requestIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Request ID is required'),
  }),
});
