import mongoose, { Schema, type Model } from 'mongoose';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  role: 'student' | 'faculty' | 'admin';
  status: 'verified' | 'pending' | 'rejected' | 'inactive';
  isFirstLogin: boolean;
  tempPassword?: boolean;
  exam?: string;
  examId?: mongoose.Types.ObjectId;
  classLevel?: string;
  subjects?: string[];
  avatar?: string;
  streak?: number;
  baseline?: {
    solved?: number;
    tests?: number;
    accuracy?: number;
    score?: number;
  };
  examProgress?: Record<string, { solved: number; tests: number; accuracy: number; score: number }>;
  lastLogin?: Date;
  createdAt: string;
  updatedAt: string;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
    status: { type: String, enum: ['verified', 'pending', 'rejected', 'inactive'], default: 'verified' },
    isFirstLogin: { type: Boolean, default: false },
    tempPassword: { type: Boolean, default: false },
    exam: { type: String },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
    classLevel: { type: String, default: 'Class 12' },
    subjects: { type: [String], default: [] },
    avatar: { type: String, default: '' },
    streak: { type: Number, default: 0 },
    baseline: {
      solved: { type: Number, default: 0 },
      tests: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },
    examProgress: { type: Schema.Types.Mixed, default: {} },
    lastLogin: { type: Date },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1, createdAt: -1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
