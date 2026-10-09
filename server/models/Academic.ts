import mongoose, { Schema, type Model } from 'mongoose';

export interface IDepartment {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

export interface ISubject {
  _id: string;
  name: string;
  code: string;
  department: string;
  exam: string;
  examId?: mongoose.Types.ObjectId;
}

const departmentSchema = new Schema<IDepartment>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const subjectSchema = new Schema<ISubject>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    exam: { type: String, default: 'JEE' },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
  },
  { timestamps: true }
);

subjectSchema.index({ name: 1, exam: 1 }, { unique: true });

export const Department: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>('Department', departmentSchema);

export const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>('Subject', subjectSchema);
