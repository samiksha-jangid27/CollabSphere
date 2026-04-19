// ABOUTME: API client for collaboration endpoints — create, fetch inbox/sent, accept/decline requests.
// ABOUTME: Follows the same named-export object pattern as profileService.ts and searchService.ts.

import api from './api';
import type { CollaborationRequest, CreateCollaborationInput, PaginatedResponse, AcceptRequestResult } from '@/types/collaboration';

export const collaborationService = {
  async createRequest(data: CreateCollaborationInput): Promise<CollaborationRequest> {
    const { data: response } = await api.post('/collaborations', data);
    return response.data.collaboration;
  },

  async getInbox(page: number = 1, status?: string): Promise<PaginatedResponse<CollaborationRequest>> {
    const params: Record<string, string | number> = { page };
    if (status) params.status = status;
    const { data } = await api.get('/collaborations/inbox', { params });
    return data.data;
  },

  async getSent(page: number = 1, status?: string): Promise<PaginatedResponse<CollaborationRequest>> {
    const params: Record<string, string | number> = { page };
    if (status) params.status = status;
    const { data } = await api.get('/collaborations/sent', { params });
    return data.data;
  },

  async acceptRequest(id: string): Promise<AcceptRequestResult> {
    const { data } = await api.patch(`/collaborations/${id}/accept`);
    return { collaboration: data.data.collaboration, conversationId: data.data.conversationId };
  },

  async declineRequest(id: string): Promise<CollaborationRequest> {
    const { data } = await api.patch(`/collaborations/${id}/decline`);
    return data.data.collaboration;
  },
};
