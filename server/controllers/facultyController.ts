import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { FacultyProfile } from '../models/FacultyProfile';
import { Question } from '../models/Question';
import { Assessment } from '../models/Assessment';
import { AuditLog } from '../models/AuditLog';
import { authService } from '../services/authService';
import type { AuthenticatedRequest } from '../middleware/auth';

const publicUser = (user: any) => {
  const { passwordHash: _passwordHash, password: _password, ...safe } = user;
  const { _id, ...rest } = safe;
  return { ...rest, id: _id };
};

export const facultyController = {
  /**
   * Get all faculty members (Admin only).
   */
  async getFaculty(_req: AuthenticatedRequest, res: Response) {
    const facultyList = await User.find({ role: 'faculty' }).sort({ createdAt: -1 }).lean();
    const facultyIds = facultyList.map((f) => f._id);

    const [profiles, questions, tests] = await Promise.all([
      FacultyProfile.find({ userId: { $in: facultyIds } }).lean(),
      Question.find({ createdBy: { $in: facultyIds } }).lean(),
      Assessment.find({ createdBy: { $in: facultyIds } }).lean(),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = facultyList.map((f) => {
      const profile = profileMap.get(f._id);
      return {
        ...publicUser(f),
        profile,
        employeeId: profile?.employeeId || f._id,
        designation: profile?.designation || 'Faculty Member',
        department: profile?.department || 'Academic Department',
        questions: questions.filter((q) => q.createdBy === f._id).length,
        tests: tests.filter((t) => t.createdBy === f._id).length,
      };
    });

    return res.json({ data: enriched });
  },

  /**
   * Admin creates a faculty account with temporary credentials.
   */
  async createFaculty(req: AuthenticatedRequest, res: Response) {
    const {
      name,
      email,
      mobile,
      password,
      temporaryPassword,
      employeeId,
      department = 'Engineering & Science',
      designation = 'Assistant Professor',
      subjects = [],
      assignedClasses = ['Class 11', 'Class 12'],
      profilePhoto = '',
    } = req.body ?? {};

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.', code: 'MISSING_FIELDS' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (await User.exists({ email: cleanEmail })) {
      return res.status(409).json({ message: 'An account with this email address already exists.', code: 'EMAIL_EXISTS' });
    }

    const cleanEmpId = String(employeeId || `FAC-${Date.now().toString().slice(-5)}`).trim();
    if (await FacultyProfile.exists({ employeeId: cleanEmpId })) {
      return res.status(409).json({ message: 'This Faculty ID / Employee ID is already assigned.', code: 'EMPLOYEE_ID_EXISTS' });
    }

    const tempPassword = temporaryPassword || password || `Temp@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const facultyId = cleanEmpId.startsWith('F-') ? cleanEmpId : `F-${cleanEmpId}`;

    const facultyUser = await User.create({
      _id: facultyId,
      name: String(name).trim(),
      email: cleanEmail,
      mobile: String(mobile || '').trim(),
      passwordHash,
      role: 'faculty',
      status: 'verified',
      isFirstLogin: true, // Requires password change on first login
      tempPassword: true,
      subjects: Array.isArray(subjects) ? subjects : [subjects],
      avatar: profilePhoto,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    const profile = await FacultyProfile.create({
      userId: facultyId,
      employeeId: cleanEmpId,
      designation: String(designation).trim(),
      department: String(department).trim(),
      assignedSubjects: Array.isArray(subjects) ? subjects : [subjects],
      assignedClasses: Array.isArray(assignedClasses) ? assignedClasses : [assignedClasses],
      profilePhoto,
      accountStatus: 'verified',
    });

    await AuditLog.create({
      actorId: req.auth!.sub,
      actorRole: 'admin',
      actorName: req.auth!.name,
      action: 'FACULTY_ACCOUNT_CREATED',
      resource: 'faculty',
      resourceId: facultyId,
      metadata: { email: cleanEmail, employeeId: cleanEmpId },
    });

    return res.status(201).json({
      data: {
        ...publicUser(facultyUser),
        profile,
        temporaryPassword: tempPassword,
        tempPasswordNote: 'Temporary credentials generated. Faculty will be prompted to set a new password on first login.',
      },
    });
  },

  /**
   * Update faculty account (Admin or self).
   */
  async updateFaculty(req: AuthenticatedRequest, res: Response) {
    const facultyId = req.params.id;
    const auth = req.auth!;

    if (auth.role !== 'admin' && auth.sub !== facultyId) {
      return res.status(403).json({ message: 'Access denied.', code: 'FORBIDDEN' });
    }

    const { name, mobile, subjects, designation, department, assignedClasses, profilePhoto } = req.body ?? {};

    const userPatch: Record<string, unknown> = {};
    if (name) userPatch.name = String(name).trim();
    if (mobile !== undefined) userPatch.mobile = String(mobile).trim();
    if (Array.isArray(subjects)) userPatch.subjects = subjects;
    if (profilePhoto) userPatch.avatar = profilePhoto;

    const updatedUser = await User.findOneAndUpdate(
      { _id: facultyId, role: 'faculty' },
      { $set: userPatch },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: 'Faculty member not found.', code: 'NOT_FOUND' });
    }

    const profilePatch: Record<string, unknown> = {};
    if (designation) profilePatch.designation = designation;
    if (department) profilePatch.department = department;
    if (Array.isArray(subjects)) profilePatch.assignedSubjects = subjects;
    if (Array.isArray(assignedClasses)) profilePatch.assignedClasses = assignedClasses;
    if (profilePhoto) profilePatch.profilePhoto = profilePhoto;

    const profile = await FacultyProfile.findOneAndUpdate(
      { userId: facultyId },
      { $set: profilePatch },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      data: {
        ...publicUser(updatedUser),
        profile,
      },
    });
  },

  /**
   * Activate, deactivate, or suspend faculty (Admin only).
   */
  async setFacultyStatus(req: AuthenticatedRequest, res: Response) {
    const facultyId = String(req.params.id);
    const { status } = req.body ?? {};

    if (!status || !['verified', 'inactive', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const faculty = await User.findOneAndUpdate(
      { _id: facultyId, role: 'faculty' },
      { status },
      { new: true }
    ).lean();

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty member not found.', code: 'NOT_FOUND' });
    }

    await FacultyProfile.updateOne({ userId: facultyId }, { accountStatus: status });

    // If deactivated or suspended, revoke all active sessions immediately
    if (status !== 'verified') {
      await authService.revokeSession(`${facultyId}:*`);
    }

    await AuditLog.create({
      actorId: req.auth!.sub,
      actorRole: 'admin',
      actorName: req.auth!.name,
      action: `FACULTY_STATUS_${status.toUpperCase()}`,
      resource: 'faculty',
      resourceId: facultyId,
      metadata: { newStatus: status },
    });

    return res.json({ data: publicUser(faculty) });
  },

  /**
   * Get faculty profile and assigned classes/subjects.
   */
  async getFacultyById(req: AuthenticatedRequest, res: Response) {
    const facultyId = String(req.params.id);
    const faculty = await User.findOne({ _id: facultyId, role: 'faculty' }).lean();
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found.', code: 'NOT_FOUND' });
    }

    const profile = await FacultyProfile.findOne({ userId: facultyId }).lean();
    return res.json({
      data: {
        ...publicUser(faculty),
        profile,
      },
    });
  },
};
