import mongoose, { Schema, type Model } from 'mongoose';

export interface ICurriculum {
  _id: string;
  exam: string;
  examId?: mongoose.Types.ObjectId;
  subject: string;
  chapter?: string;
  topic?: string;
  createdBy: string;
  createdAt: string;
}

const curriculumSchema = new Schema<ICurriculum>(
  {
    _id: { type: String, required: true },
    exam: { type: String, required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
    subject: { type: String, required: true },
    chapter: { type: String },
    topic: { type: String },
    createdBy: { type: String, default: 'admin' },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

curriculumSchema.index({ exam: 1, subject: 1, chapter: 1, topic: 1 });

export const Curriculum: Model<ICurriculum> =
  mongoose.models.Curriculum || mongoose.model<ICurriculum>('Curriculum', curriculumSchema);
