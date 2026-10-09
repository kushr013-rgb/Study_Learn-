import mongoose, { Schema, type Model } from 'mongoose';

export interface IStudentProfile {
  userId: string;
  enrollmentNumber: string;
  college: string;
  department: string;
  course: string;
  classLevel: string;
  semester: string;
  academicYear: string;
  dateOfBirth?: Date;
  gender?: 'female' | 'male' | 'other' | 'prefer-not-to-say';
  state?: string;
  city?: string;
  targetExam?: string;
  profilePhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: { type: String, required: true, unique: true, ref: 'User' },
    enrollmentNumber: { type: String, required: true, unique: true, trim: true },
    college: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    classLevel: { type: String, required: true, trim: true },
    semester: { type: String, default: '1' },
    academicYear: { type: String, default: '2025-2026' },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['female', 'male', 'other', 'prefer-not-to-say'] },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    targetExam: { type: String, trim: true },
    profilePhoto: { type: String, default: '' },
  },
  { timestamps: true }
);

studentProfileSchema.index({ department: 1, classLevel: 1 });

export const StudentProfile: Model<IStudentProfile> =
  mongoose.models.StudentProfile || mongoose.model<IStudentProfile>('StudentProfile', studentProfileSchema);
