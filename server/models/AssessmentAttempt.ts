import mongoose, { Schema, type Model } from 'mongoose';

export interface IAttemptAnswer {
  selected: number | string | null;
  correct: boolean;
  timeSpent: number;
  status: 'answered' | 'skipped' | 'marked';
}

export interface IAssessmentAttempt {
  _id: string;
  submissionKey?: string;
  userId: string;
  testId: string;
  testName: string;
  exam?: string;
  examId?: mongoose.Types.ObjectId;
  mode: 'test' | 'practice' | 'mistake' | 'daily' | 'timed';
  questionIds: string[];
  answers: Record<string, IAttemptAnswer>;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  percentage?: number;
  subjectScores?: Record<string, { correct: number; wrong: number; skipped: number; score: number; maxScore: number }>;
  timeTaken: number;
  submittedAt: string;
  createdAt: Date;
  updatedAt: Date;
}

const attemptSchema = new Schema<IAssessmentAttempt>(
  {
    _id: { type: String, required: true },
    submissionKey: { type: String, sparse: true },
    userId: { type: String, required: true, ref: 'User' },
    testId: { type: String, required: true },
    testName: { type: String, required: true },
    exam: { type: String },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
    mode: { type: String, enum: ['test', 'practice', 'mistake', 'daily', 'timed'], default: 'test' },
    questionIds: { type: [String], required: true },
    answers: { type: Schema.Types.Mixed, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    correct: { type: Number, required: true },
    wrong: { type: Number, required: true },
    skipped: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    percentage: { type: Number },
    subjectScores: { type: Schema.Types.Mixed },
    timeTaken: { type: Number, required: true },
    submittedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, submittedAt: -1 });
attemptSchema.index({ userId: 1, submissionKey: 1 }, { unique: true, sparse: true });
attemptSchema.index({ testId: 1, submittedAt: -1 });

export const AssessmentAttempt: Model<IAssessmentAttempt> =
  mongoose.models.AssessmentAttempt ||
  mongoose.model<IAssessmentAttempt>('AssessmentAttempt', attemptSchema, 'attempts');

export const Attempt = AssessmentAttempt;
