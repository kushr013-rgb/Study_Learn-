import type { Response } from 'express';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { AssessmentAttempt } from '../models/AssessmentAttempt';
import { Mistake } from '../models/Mistake';
import { AuditLog } from '../models/AuditLog';
import { Exam } from '../models/Exam';
import type { AuthenticatedRequest } from '../middleware/auth';

const publicUser = (user: any) => {
  const { passwordHash: _passwordHash, password: _password, ...safe } = user || {};
  const { _id, ...rest } = safe;
  return { ...rest, id: _id };
};

export const studentController = {
  /**
   * Get filtered, paginated students list (Admin only).
   */
  async getStudents(req: AuthenticatedRequest, res: Response) {
    const filter: Record<string, unknown> = { role: 'student' };
    const { exam, classLevel, status, search } = req.query;

    if (exam && exam !== 'All') filter.exam = exam;
    if (classLevel && classLevel !== 'All') filter.classLevel = classLevel;
    if (status && status !== 'All') filter.status = status;

    if (search && typeof search === 'string') {
      const reg = new RegExp(search, 'i');
      filter.$or = [{ name: reg }, { email: reg }, { mobile: reg }, { _id: reg }];
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 50)));

    const [students, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    const studentIds = students.map((s) => s._id);
    const [profiles, attempts] = await Promise.all([
      StudentProfile.find({ userId: { $in: studentIds } }).lean(),
      AssessmentAttempt.find({ userId: { $in: studentIds } }).lean(),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = students.map((student) => {
      const mine = attempts.filter((a) => a.userId === student._id);
      const profile = profileMap.get(student._id);
      const baseline = student.baseline ?? { solved: 0, tests: 0, accuracy: 0, score: 0 };
      const solved = mine.reduce((sum, a) => sum + Number(a.correct || 0) + Number(a.wrong || 0), 0) + (baseline.solved || 0);
      const tests = mine.length + (baseline.tests || 0);
      const accuracy = mine.length
        ? Math.round(mine.reduce((sum, a) => sum + Number(a.accuracy || 0), 0) / mine.length)
        : baseline.accuracy || 0;

      return {
        ...publicUser(student),
        profile,
        tests,
        solved,
        accuracy,
      };
    });

    return res.json({
      data: enriched,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  },

  /**
   * Get single student profile, attempts, and mistakes.
   */
  async getStudentById(req: AuthenticatedRequest, res: Response) {
    const studentId = req.params.id;
    const auth = req.auth!;

    // IDOR protection: only admin or self can access
    if (auth.role !== 'admin' && auth.sub !== studentId) {
      return res.status(403).json({ message: 'Access denied: you can only view your own profile.', code: 'FORBIDDEN' });
    }

    const student = await User.findOne({ _id: studentId, role: 'student' }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.', code: 'NOT_FOUND' });
    }

    const [profile, recentAttempts, openMistakes] = await Promise.all([
      StudentProfile.findOne({ userId: studentId }).lean(),
      AssessmentAttempt.find({ userId: studentId }).sort({ submittedAt: -1 }).limit(20).lean(),
      Mistake.countDocuments({ userId: studentId, resolved: false }),
    ]);

    return res.json({
      data: {
        profile: { ...publicUser(student), studentProfile: profile },
        recentAttempts,
        openMistakes,
      },
    });
  },

  /**
   * Update student profile.
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    const studentId = req.params.id;
    const auth = req.auth!;

    if (auth.role !== 'admin' && auth.sub !== studentId) {
      return res.status(403).json({ message: 'Access denied.', code: 'FORBIDDEN' });
    }

    const { name, mobile, classLevel, exam, subjects, profilePhoto, college, department, course, semester, academicYear, dateOfBirth, gender, state, city, targetExam } = req.body ?? {};

    if (exam && !['JEE', 'NEET', 'Class 10', 'Class 12', 'MH-CET'].includes(exam)) {
      return res.status(422).json({ message: 'Select a supported exam category.', code: 'INVALID_EXAM_CATEGORY' });
    }

    const userPatch: Record<string, unknown> = {};
    if (name) userPatch.name = String(name).trim();
    if (mobile !== undefined) userPatch.mobile = String(mobile).trim();
    if (classLevel) userPatch.classLevel = classLevel;
    if (typeof exam === 'string') {
      if (exam !== req.user?.exam) {
        const examProgress = { ...(req.user?.examProgress ?? {}) };
        if (req.user?.exam) {
          examProgress[req.user.exam] = {
            solved: req.user.baseline?.solved ?? 0,
            tests: req.user.baseline?.tests ?? 0,
            accuracy: req.user.baseline?.accuracy ?? 0,
            score: req.user.baseline?.score ?? 0,
          };
        }
        userPatch.examProgress = examProgress;
        userPatch.baseline = examProgress[exam] ?? { solved: 0, tests: 0, accuracy: 0, score: 0 };
      }
      userPatch.exam = exam;
      if (exam) {
        const examRecord = await Exam.findOne({ code: exam }).select('_id').lean();
        if (!examRecord) {
          return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });
        }
        userPatch.examId = examRecord._id;
      } else {
        userPatch.examId = undefined;
      }
    }
    if (Array.isArray(subjects)) userPatch.subjects = subjects;
    if (profilePhoto !== undefined) userPatch.avatar = profilePhoto;

    const updatedUser = await User.findOneAndUpdate(
      { _id: studentId, role: 'student' },
      { $set: userPatch },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: 'Student not found.', code: 'NOT_FOUND' });
    }

    // Update StudentProfile if academic fields are provided
    const profilePatch: Record<string, unknown> = {};
    if (college) profilePatch.college = college;
    if (department) profilePatch.department = department;
    if (course) profilePatch.course = course;
    if (classLevel) profilePatch.classLevel = classLevel;
    if (semester) profilePatch.semester = semester;
    if (academicYear) profilePatch.academicYear = academicYear;
    if (dateOfBirth) profilePatch.dateOfBirth = dateOfBirth;
    if (gender) profilePatch.gender = gender;
    if (state) profilePatch.state = state;
    if (city) profilePatch.city = city;
    if (targetExam !== undefined) profilePatch.targetExam = targetExam;
    if (profilePhoto) profilePatch.profilePhoto = profilePhoto;

    let updatedProfile = null;
    if (Object.keys(profilePatch).length > 0) {
      updatedProfile = await StudentProfile.findOneAndUpdate(
        { userId: studentId },
        { $set: profilePatch },
        { new: true, upsert: true }
      ).lean();
    } else {
      updatedProfile = await StudentProfile.findOne({ userId: studentId }).lean();
    }

    return res.json({
      data: {
        ...publicUser(updatedUser),
        studentProfile: updatedProfile,
      },
    });
  },

  /**
   * Update student status (Admin only).
   */
  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const studentId = req.params.id;
    const { status } = req.body ?? {};

    if (!status || !['verified', 'pending', 'rejected', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const student = await User.findOneAndUpdate(
      { _id: studentId, role: 'student' },
      { status },
      { new: true }
    ).lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found.', code: 'NOT_FOUND' });
    }

    await AuditLog.create({
      actorId: req.auth!.sub,
      actorRole: 'admin',
      actorName: req.auth!.name,
      action: `STUDENT_STATUS_${String(status).toUpperCase()}`,
      resource: 'students',
      resourceId: String(studentId),
      metadata: { newStatus: status },
    });

    return res.json({ data: publicUser(student) });
  },
};
