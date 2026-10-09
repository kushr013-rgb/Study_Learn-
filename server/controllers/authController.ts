import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { authService } from '../services/authService';
import { AuditLog } from '../models/AuditLog';
import type { AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';
import { Exam } from '../models/Exam';

const accessCookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax' as const,
  path: '/',
};
const refreshCookieOptions = {
  ...accessCookieOptions,
  path: '/api/v1/auth',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, { ...accessCookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, {
    ...refreshCookieOptions,
    maxAge: config.refreshTokenTtlSeconds * 1000,
  });
}

function getCookie(req: Request, name: string): string | undefined {
  const item = req.headers.cookie?.split(';').find((part) => part.trim().startsWith(`${name}=`));
  return item ? decodeURIComponent(item.trim().slice(name.length + 1)) : undefined;
}

const publicUser = (user: import('../models/User').IUser | Record<string, unknown>) => {
  const obj = typeof (user as { toObject?: () => Record<string, unknown> }).toObject === 'function'
    ? (user as { toObject: () => Record<string, unknown> }).toObject()
    : { ...user };
  delete obj.passwordHash;
  delete obj.password;
  const { _id, ...rest } = obj;
  return { ...rest, id: _id };
};

export const authController = {
  /**
   * Login with email or mobile and password.
   */
  async login(req: Request, res: Response) {
    const identifier = String(req.body?.email ?? req.body?.identifier ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email and password are required.', code: 'INVALID_INPUT' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }, { _id: identifier }],
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials. Please verify your email and password.', code: 'INVALID_CREDENTIALS' });
    }

    if (user.status !== 'verified') {
      return res.status(403).json({
        message: user.status === 'pending'
          ? 'Your account registration is pending admin verification.'
          : 'Your account has been deactivated or rejected. Contact support.',
        code: 'ACCOUNT_NOT_ACTIVE',
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const sessionId = `${user._id}:${Date.now()}`;
    const claims = {
      sub: user._id,
      role: user.role,
      sessionId,
      email: user.email,
      name: user.name,
    };

    const accessToken = authService.issueAccessToken(claims);
    const refreshToken = await authService.issueRefreshToken(claims);

    setAuthCookies(res, accessToken, refreshToken);

    // Also fetch student profile if student
    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = await StudentProfile.findOne({ userId: user._id }).lean();
    }

    return res.json({
      data: {
        user: { ...publicUser(user), studentProfile },
        accessToken,
        isFirstLogin: user.isFirstLogin,
      },
    });
  },

  /**
   * Direct student registration.
   */
  async register(req: Request, res: Response) {
    const {
      name,
      email,
      mobile,
      password,
      confirmPassword,
      studentId,
      enrollmentNumber,
      enrollmentId,
      college,
      department,
      course,
      classLevel = 'Class 12',
      semester = '1',
      academicYear = '2025-2026',
      exam,
      subject,
      dateOfBirth,
      gender,
      state,
      city,
      targetExam,
    } = req.body ?? {};

    if (!name || !email || !mobile || !password || !confirmPassword || !exam || !dateOfBirth || !gender || !state || !city) {
      return res.status(400).json({ message: 'Name, email, mobile, password, exam category, date of birth, gender, state, and city are required.', code: 'MISSING_FIELDS' });
    }

    const validExams = ['JEE', 'NEET', 'Class 10', 'Class 12', 'MH-CET'];
    if (typeof exam !== 'string' || !validExams.includes(exam)) {
      return res.status(422).json({ message: 'Select a supported exam category.', code: 'INVALID_EXAM_CATEGORY' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).replace(/\D/g, '');
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(422).json({ message: 'Enter a valid email address.', code: 'INVALID_EMAIL' });
    }
    if (!/^\d{10}$/.test(cleanMobile)) {
      return res.status(422).json({ message: 'Enter a valid 10-digit mobile number.', code: 'INVALID_MOBILE' });
    }
    if (typeof password !== 'string' || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(422).json({ message: 'Password must be at least 8 characters and include upper-case, lower-case, and numeric characters.', code: 'WEAK_PASSWORD' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.', code: 'PASSWORD_MISMATCH' });
    }

    if (!['female', 'male', 'other', 'prefer-not-to-say'].includes(gender)) {
      return res.status(422).json({ message: 'Select a valid gender option.', code: 'INVALID_GENDER' });
    }
    const parsedDateOfBirth = new Date(dateOfBirth);
    if (Number.isNaN(parsedDateOfBirth.getTime()) || parsedDateOfBirth >= new Date()) {
      return res.status(422).json({ message: 'Enter a valid date of birth.', code: 'INVALID_DATE_OF_BIRTH' });
    }

    const cleanEnrollment = String(enrollmentNumber || enrollmentId || studentId || `ENR-${Date.now().toString().slice(-6)}`).trim();

    // Check duplicate email
    if (await User.exists({ email: cleanEmail })) {
      return res.status(409).json({ message: 'An account with this email address already exists.', code: 'EMAIL_EXISTS' });
    }
    if (await User.exists({ mobile: cleanMobile })) {
      return res.status(409).json({ message: 'An account with this mobile number already exists.', code: 'MOBILE_EXISTS' });
    }

    // Check duplicate enrollment number
    if (await StudentProfile.exists({ enrollmentNumber: cleanEnrollment })) {
      return res.status(409).json({ message: 'This Student ID / Enrollment Number is already registered.', code: 'ENROLLMENT_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `S-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
    const examRecord = await Exam.findOne({ code: exam }).select('_id').lean();
    if (!examRecord) {
      return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });
    }

    const user = await User.create({
      _id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      passwordHash,
      role: 'student',
      status: 'verified', // active student
      isFirstLogin: false,
      exam,
      examId: examRecord._id,
      classLevel,
      subjects: subject ? [subject] : [],
      streak: 0,
      baseline: { solved: 0, tests: 0, accuracy: 0, score: 0 },
      createdAt: new Date().toISOString().slice(0, 10),
    });

    const profile = await StudentProfile.create({
      userId,
      enrollmentNumber: cleanEnrollment,
      college: String(college || 'National Institute of Technology').trim(),
      department: String(department || 'Computer Science & Engineering').trim(),
      course: String(course || 'B.Tech / Senior Secondary').trim(),
      classLevel,
      semester,
      academicYear,
      dateOfBirth: parsedDateOfBirth,
      gender,
      state: String(state).trim(),
      city: String(city).trim(),
      targetExam: String(targetExam || '').trim(),
    });

    await AuditLog.create({
      actorId: userId,
      actorRole: 'student',
      actorName: user.name,
      action: 'STUDENT_REGISTERED',
      resource: 'users',
      resourceId: userId,
      metadata: { email: cleanEmail, enrollmentNumber: cleanEnrollment },
    });

    const sessionId = `${userId}:${Date.now()}`;
    const claims = { sub: userId, role: 'student' as const, sessionId, email: cleanEmail, name: user.name };
    const accessToken = authService.issueAccessToken(claims);
    const refreshToken = await authService.issueRefreshToken(claims);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      data: {
        user: { ...publicUser(user), studentProfile: profile },
        accessToken,
      },
    });
  },

  /**
   * Get currently authenticated user profile.
   */
  async me(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const user = await User.findById(auth.sub).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.', code: 'NOT_FOUND' });
    }

    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ userId: user._id }).lean();
    } else if (user.role === 'faculty') {
      profile = await import('../models/FacultyProfile').then((m) => m.FacultyProfile.findOne({ userId: user._id }).lean());
    }

    return res.json({
      data: {
        ...publicUser(user),
        profile,
      },
    });
  },

  /**
   * Rotate refresh token.
   */
  async refresh(req: Request, res: Response) {
    const token = String(getCookie(req, 'refreshToken') ?? req.body?.refreshToken ?? '');
    const rotated = await authService.rotateRefreshToken(token);
    if (!rotated) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.', code: 'REFRESH_INVALID' });
    }
    setAuthCookies(res, rotated.accessToken, rotated.refreshToken);
    return res.json({ data: { accessToken: rotated.accessToken } });
  },

  /**
   * Logout and revoke session.
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth;
    if (auth?.sessionId) {
      await authService.revokeSession(auth.sessionId);
    }
    res.clearCookie('accessToken', accessCookieOptions);
    res.clearCookie('refreshToken', refreshCookieOptions);
    return res.status(204).send();
  },

  /**
   * Forgot password request (generic response).
   */
  async forgotPassword(req: Request, res: Response) {
    const identifier = String(req.body?.email ?? req.body?.identifier ?? '');
    const ip = req.ip;
    const result = await authService.requestPasswordReset(identifier, ip);
    return res.status(202).json({
      data: result,
      message: result.message,
    });
  },

  /**
   * Reset password with token/OTP.
   */
  async resetPassword(req: Request, res: Response) {
    const { email, otp, token, newPassword } = req.body ?? {};
    if (!email || (!otp && !token) || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP/Token, and new password are required.', code: 'MISSING_FIELDS' });
    }

    try {
      await authService.resetPassword({
        email,
        otpOrToken: String(otp || token),
        newPassword: String(newPassword),
      });
      return res.json({ message: 'Password has been successfully updated. You may now log in.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed.';
      return res.status(400).json({ message: msg, code: 'RESET_FAILED' });
    }
  },

  /**
   * Change password for logged-in user.
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(auth.sub);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: 'Current password is incorrect.', code: 'INVALID_CURRENT_PASSWORD' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.isFirstLogin = false;
    user.tempPassword = false;
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      actorName: user.name,
      action: 'PASSWORD_CHANGED',
      resource: 'auth',
    });

    return res.json({ message: 'Password changed successfully.' });
  },
};
