import mongoose, { Schema, type Model } from 'mongoose';

export interface IExtractedQuestion {
  id?: string;
  text: string;
  options: string[];
  answer: string | number;
  marks: number;
  negative: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'MCQ' | 'Numerical';
  chapter?: string;
  topic?: string;
  valid?: boolean;
  validationError?: string;
}

export interface IQuestionPaper {
  _id: string;
  title: string;
  subject: string;
  course: string;
  semester: string;
  assessmentType: string;
  targetClass: string;
  originalFileName: string;
  storedFileName: string;
  fileType: 'pdf' | 'xlsx' | 'xls' | 'docx' | 'doc';
  fileSize: number;
  filePath: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: 'faculty' | 'admin';
  status: 'pending_review' | 'approved' | 'rejected';
  extractedQuestions: IExtractedQuestion[];
  approvedCount: number;
  totalExtracted: number;
  createdAt: string;
  updatedAt: string;
}

const extractedQuestionSchema = new Schema(
  {
    id: String,
    text: { type: String, required: true },
    options: [String],
    answer: Schema.Types.Mixed,
    marks: Number,
    negative: Number,
    explanation: String,
    difficulty: String,
    type: { type: String, default: 'MCQ' },
    chapter: String,
    topic: String,
    valid: Boolean,
    validationError: String,
  },
  { _id: false }
);

const questionPaperSchema = new Schema<IQuestionPaper>(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    course: { type: String, default: 'General' },
    semester: { type: String, default: '1' },
    assessmentType: { type: String, default: 'Chapter Test' },
    targetClass: { type: String, default: 'Class 12' },
    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'xlsx', 'xls', 'docx', 'doc'], required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    uploaderId: { type: String, required: true, ref: 'User' },
    uploaderName: { type: String, required: true },
    uploaderRole: { type: String, enum: ['faculty', 'admin'], default: 'faculty' },
    status: { type: String, enum: ['pending_review', 'approved', 'rejected'], default: 'pending_review' },
    extractedQuestions: [extractedQuestionSchema],
    approvedCount: { type: Number, default: 0 },
    totalExtracted: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

questionPaperSchema.index({ uploaderId: 1, createdAt: -1 });
questionPaperSchema.index({ status: 1 });
questionPaperSchema.index({ subject: 1 });

export const QuestionPaper: Model<IQuestionPaper> =
  mongoose.models.QuestionPaper || mongoose.model<IQuestionPaper>('QuestionPaper', questionPaperSchema);
