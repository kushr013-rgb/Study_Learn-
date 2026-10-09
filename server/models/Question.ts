import mongoose, { Schema, type Model } from 'mongoose';

export interface IQuestion {
  _id: string;
  exam: string;
  examId?: mongoose.Types.ObjectId;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'MCQ' | 'Numerical';
  text: string;
  options: string[];
  answer: string | number;
  marks: number;
  negative: number;
  explanation: string;
  status: 'Draft' | 'Published' | 'Archived';
  createdBy: string;
  paperId?: string;
  usage: number;
  createdAt: string;
  updatedAt: string;
}

const questionSchema = new Schema<IQuestion>(
  {
    _id: { type: String, required: true },
    exam: { type: String, required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    type: { type: String, enum: ['MCQ', 'Numerical'], default: 'MCQ' },
    text: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: Schema.Types.Mixed, required: true },
    marks: { type: Number, default: 4 },
    negative: { type: Number, default: 1 },
    explanation: { type: String, default: '' },
    status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Published' },
    createdBy: { type: String, required: true },
    paperId: { type: String, ref: 'QuestionPaper' },
    usage: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

questionSchema.index({ exam: 1, subject: 1, chapter: 1, topic: 1, status: 1 });
questionSchema.index({ status: 1, difficulty: 1 });
questionSchema.index({ text: 'text' });
questionSchema.index({ createdBy: 1 });

export const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', questionSchema);
