// ABOUTME: ICollaborationService interface — controllers depend on this, not the concrete class.
// ABOUTME: Enables dependency inversion and test substitution.

import { ICollaborationRequest } from '../../models/CollaborationRequest';

export interface CreateCollaborationInput {
  recipientId: string;
  title: string;
  description: string;
  budget: number;
  deadline: Date | string;
}

export interface CollaborationFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface ICollaborationService {
  createRequest(brandId: string, input: CreateCollaborationInput): Promise<ICollaborationRequest>;
  getInbox(userId: string, filters: CollaborationFilters): Promise<PaginatedResponse<ICollaborationRequest>>;
  getSent(brandId: string, filters: CollaborationFilters): Promise<PaginatedResponse<ICollaborationRequest>>;
  acceptRequest(requestId: string, creatorId: string): Promise<ICollaborationRequest>;
  declineRequest(requestId: string, creatorId: string): Promise<ICollaborationRequest>;
}

export interface ICollaborationRepository {
  create(data: Partial<ICollaborationRequest>): Promise<ICollaborationRequest>;
  findById(id: string): Promise<ICollaborationRequest | null>;
  findInbox(userId: string, filters: CollaborationFilters): Promise<{
    docs: ICollaborationRequest[];
    total: number;
  }>;
  findSent(brandId: string, filters: CollaborationFilters): Promise<{
    docs: ICollaborationRequest[];
    total: number;
  }>;
  updateById(id: string, data: Partial<ICollaborationRequest>): Promise<ICollaborationRequest | null>;
}
