import mongoose, { Schema, type Model } from 'mongoose';

export interface IAssessment {
  _id: string;
  name: string;
  exam: string;
  examId?: mongoose.Types.ObjectId;
  subject: string;
  type: string;
  duration: number; // in minutes
  totalMarks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionIds: string[];
  assignedClasses: string[];
  assignedDepartments: string[];
  instructions?: string;
  startTime?: Date;
  endTime?: Date;
  status: 'Draft' | 'Published' | 'Archived';
  createdBy: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

const assessmentSchema = new Schema<IAssessment>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    exam: { type: String, required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
    subject: { type: String, required: true },
    type: { type: String, default: 'Topic Test' },
    duration: { type: Number, required: true, default: 60 },
    totalMarks: { type: Number, default: 100 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    questionIds: { type: [String], default: [] },
    assignedClasses: { type: [String], default: [] },
    assignedDepartments: { type: [String], default: [] },
    instructions: { type: String, default: 'Read each question carefully. Each MCQ has only one correct answer.' },
    startTime: { type: Date },
    endTime: { type: Date },
    status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Published' },
    createdBy: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

assessmentSchema.index({ exam: 1, subject: 1, status: 1 });
assessmentSchema.index({ createdBy: 1 });
assessmentSchema.index({ status: 1, createdAt: -1 });

export const Assessment: Model<IAssessment> =
  mongoose.models.Assessment || mongoose.model<IAssessment>('Assessment', assessmentSchema, 'tests');

export const Test = Assessment;
