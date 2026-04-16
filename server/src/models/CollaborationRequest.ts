// ABOUTME: CollaborationRequest Mongoose model — represents a brand's collaboration request to a creator.
// ABOUTME: Stores request details, status transitions, and timestamps for marketplace workflow.

import { Schema, model, Document, Types } from 'mongoose';

export interface ICollaborationRequest extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  brandId: Types.ObjectId;
  title: string;
  description: string;
  budget: number;
  deadline: Date;
  status: 'Open' | 'Pending' | 'Accepted' | 'Declined' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
}

const collaborationRequestSchema = new Schema<ICollaborationRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Brand ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Open', 'Pending', 'Accepted', 'Declined', 'Closed'],
        message: 'Invalid status value',
      },
      default: 'Open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries by userId and status (for inbox)
collaborationRequestSchema.index({ userId: 1, status: 1 });

// Compound index for efficient queries by brandId and status (for sent)
collaborationRequestSchema.index({ brandId: 1, status: 1 });

export const CollaborationRequest = model<ICollaborationRequest>(
  'CollaborationRequest',
  collaborationRequestSchema
);
