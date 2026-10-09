import mongoose, { Schema, type Model } from 'mongoose';

export interface IResult {
  _id: string;
  attemptId: string;
  userId: string;
  testId: string;
  testName: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  accuracy: number;
  grade?: string;
  evaluationStatus: 'completed' | 'pending_review';
  evaluatedAt: Date;
}

const resultSchema = new Schema<IResult>(
  {
    _id: { type: String, required: true },
    attemptId: { type: String, required: true, unique: true, ref: 'AssessmentAttempt' },
    userId: { type: String, required: true, ref: 'User' },
    testId: { type: String, required: true },
    testName: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    grade: { type: String, default: 'A' },
    evaluationStatus: { type: String, enum: ['completed', 'pending_review'], default: 'completed' },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

resultSchema.index({ userId: 1, testId: 1 });
resultSchema.index({ testId: 1, obtainedMarks: -1 });

export const Result: Model<IResult> =
  mongoose.models.Result || mongoose.model<IResult>('Result', resultSchema);
