// ABOUTME: Conversation Mongoose model — represents a direct message thread between two users.
// ABOUTME: Created automatically when a collaboration request is accepted (one conversation per collab).

import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  collaborationRequestId: Types.ObjectId;
  lastMessage?: {
    content: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: [true, 'Participants are required'],
      validate: {
        validator: (v: Types.ObjectId[]) => v.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
    },
    collaborationRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'CollaborationRequest',
      required: [true, 'Collaboration request ID is required'],
      unique: true,
    },
    lastMessage: {
      type: {
        content: { type: String, required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, required: true },
      },
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ participants: 1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
