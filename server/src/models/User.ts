import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  githubId: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  githubProfileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    githubProfileUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Add index on email as well if present
userSchema.index({ email: 1 }, { sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
export default User;
