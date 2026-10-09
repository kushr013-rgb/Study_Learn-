import mongoose, { Schema, type Model } from 'mongoose';

export interface IExam {
  code: string;
  name: string;
  subjects: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const examSchema = new Schema<IExam>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    subjects: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Exam: Model<IExam> = mongoose.models.Exam || mongoose.model<IExam>('Exam', examSchema);