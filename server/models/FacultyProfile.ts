import mongoose, { Schema, type Model } from 'mongoose';

export interface IFacultyProfile {
  userId: string;
  employeeId: string;
  designation: string;
  department: string;
  assignedSubjects: string[];
  assignedClasses: string[];
  profilePhoto?: string;
  accountStatus: 'verified' | 'pending' | 'rejected' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const facultyProfileSchema = new Schema<IFacultyProfile>(
  {
    userId: { type: String, required: true, unique: true, ref: 'User' },
    employeeId: { type: String, required: true, unique: true, trim: true },
    designation: { type: String, required: true, trim: true, default: 'Assistant Professor' },
    department: { type: String, required: true, trim: true, default: 'Science & Engineering' },
    assignedSubjects: { type: [String], default: [] },
    assignedClasses: { type: [String], default: [] },
    profilePhoto: { type: String, default: '' },
    accountStatus: { type: String, enum: ['verified', 'pending', 'rejected', 'inactive'], default: 'verified' },
  },
  { timestamps: true }
);

facultyProfileSchema.index({ department: 1 });

export const FacultyProfile: Model<IFacultyProfile> =
  mongoose.models.FacultyProfile || mongoose.model<IFacultyProfile>('FacultyProfile', facultyProfileSchema);
