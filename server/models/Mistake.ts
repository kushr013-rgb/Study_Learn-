import mongoose, { Schema, type Model } from 'mongoose';

export interface IMistake {
  _id: string;
  userId: string;
  questionId: string;
  wrongAnswer: number | string | null;
  attemptCount: number;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
  sourceTest?: string;
}

const mistakeSchema = new Schema<IMistake>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: 'User' },
    questionId: { type: String, required: true, ref: 'Question' },
    wrongAnswer: { type: Schema.Types.Mixed, default: null },
    attemptCount: { type: Number, default: 1 },
    resolved: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
    resolvedAt: { type: String },
    sourceTest: { type: String, default: '' },
  },
  { timestamps: true }
);

mistakeSchema.index({ userId: 1, questionId: 1 }, { unique: true });
mistakeSchema.index({ userId: 1, resolved: 1 });

export const Mistake: Model<IMistake> =
  mongoose.models.Mistake || mongoose.model<IMistake>('Mistake', mistakeSchema);
