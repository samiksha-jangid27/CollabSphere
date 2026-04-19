// ABOUTME: Hook for collaboration request state management — create, fetch inbox/sent, accept/decline.
// ABOUTME: Encapsulates request state, pagination, loading, and error handling.

'use client';

import { useState, useCallback } from 'react';
import { collaborationService } from '@/services/collaborationService';
import type { CollaborationRequest, CreateCollaborationInput, PaginatedResponse, AcceptRequestResult } from '@/types/collaboration';

interface UseCollaborationState {
  requests: CollaborationRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  loading: boolean;
  error: string | null;
}

export function useCollaboration() {
  const [state, setState] = useState<UseCollaborationState>({
    requests: [],
    pagination: { page: 1, limit: 10, total: 0, hasNext: false },
    loading: false,
    error: null,
  });

  const createRequest = useCallback(
    async (data: CreateCollaborationInput): Promise<CollaborationRequest> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await collaborationService.createRequest(data);
        setState((prev) => ({ ...prev, loading: false }));
        return result;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          axiosErr.response?.data?.error?.message ?? 'Failed to create request';
        setState((prev) => ({ ...prev, loading: false, error: message }));
        throw new Error(message);
      }
    },
    []
  );

  const getInbox = useCallback(
    async (page: number = 1, status?: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await collaborationService.getInbox(page, status);
        setState({
          requests: response.data,
          pagination: response.pagination,
          loading: false,
          error: null,
        });
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          axiosErr.response?.data?.error?.message ?? 'Failed to fetch inbox';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
          pagination: prev.pagination,
          requests: [],
        }));
      }
    },
    []
  );

  const getSent = useCallback(
    async (page: number = 1, status?: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await collaborationService.getSent(page, status);
        setState({
          requests: response.data,
          pagination: response.pagination,
          loading: false,
          error: null,
        });
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          axiosErr.response?.data?.error?.message ?? 'Failed to fetch sent';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
          pagination: prev.pagination,
          requests: [],
        }));
      }
    },
    []
  );

  const acceptRequest = useCallback(
    async (id: string): Promise<AcceptRequestResult> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await collaborationService.acceptRequest(id);
        // Update the request in state
        setState((prev) => ({
          ...prev,
          requests: prev.requests.map((r) =>
            r._id === id ? { ...r, status: 'Accepted' as const } : r
          ),
          loading: false,
        }));
        return result;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          axiosErr.response?.data?.error?.message ?? 'Failed to accept request';
        setState((prev) => ({ ...prev, loading: false, error: message }));
        throw new Error(message);
      }
    },
    []
  );

  const declineRequest = useCallback(
    async (id: string): Promise<CollaborationRequest> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await collaborationService.declineRequest(id);
        // Update the request in state
        setState((prev) => ({
          ...prev,
          requests: prev.requests.map((r) =>
            r._id === id ? { ...r, status: 'Declined' as const } : r
          ),
          loading: false,
        }));
        return result;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          axiosErr.response?.data?.error?.message ?? 'Failed to decline request';
        setState((prev) => ({ ...prev, loading: false, error: message }));
        throw new Error(message);
      }
    },
    []
  );

  return {
    ...state,
    createRequest,
    getInbox,
    getSent,
    acceptRequest,
    declineRequest,
  };
}
