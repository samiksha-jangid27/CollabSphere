// ABOUTME: Shared CollaborationRequest TypeScript types mirroring the server model shape.
// ABOUTME: Imported by collaborationService, hooks, and all collaboration UI components.

export interface CollaborationRequest {
  _id: string;
  userId: string; // creator receiving
  brandId: string; // brand sending
  title: string;
  description: string;
  budget: number;
  deadline: string; // ISO date
  status: 'Open' | 'Pending' | 'Accepted' | 'Declined' | 'Closed';
  createdAt: string;
  updatedAt: string;
}

export interface AcceptRequestResult {
  collaboration: CollaborationRequest;
  conversationId?: string;
}

export interface CreateCollaborationInput {
  recipientId: string; // creator profile id
  title: string;
  description: string;
  budget: number;
  deadline: string; // ISO date
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
