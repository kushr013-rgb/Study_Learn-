import type { Role, User } from '../lib/types';
import { getDB, mutate, uid } from './db';
import { api, setStoredToken, clearStoredTokens } from './apiClient';
import { USE_API } from './config';

const SESSION_KEY = 'astraprep.session';
const USER_KEY = 'astraprep.user';

export interface Session {
  userId: string;
  role: Role;
  issuedAt: string;
}

export interface AuthResult {
  ok: boolean;
  message?: string;
  user?: PublicUser;
}

export type PublicUser = Omit<User, 'password'> & {
  studentProfile?: {
    enrollmentNumber?: string;
    college?: string;
    department?: string;
    course?: string;
    classLevel?: string;
    semester?: string;
    academicYear?: string;
    profilePhoto?: string;
    dateOfBirth?: string;
    gender?: string;
    state?: string;
    city?: string;
    targetExam?: string;
  };
  isFirstLogin?: boolean;
};

export const strip = (u: User): PublicUser => {
  const { password: _password, ...rest } = u;
  return rest;
};

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const response = await api.post<{
        user: PublicUser;
        accessToken: string;
        isFirstLogin?: boolean;
      }>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response && response.user) {
        setStoredToken(response.accessToken);
        const session: Session = {
          userId: response.user.id,
          role: response.user.role,
          issuedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));

        // Sync with local memory store for instant reactivity
        mutate((d) => {
          const idx = d.users.findIndex((u) => u.id === response.user.id);
          if (idx !== -1) {
            d.users[idx] = { ...d.users[idx], ...response.user } as User;
          } else {
            d.users.unshift({ ...response.user, password: '' } as User);
          }
        });

        return { ok: true, user: response.user };
      }
    } catch (err: unknown) {
      if (USE_API) {
        const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
        return { ok: false, message: msg };
      }
    }

    // Fallback to local demoAuth if offline / mock mode
    return demoAuth.login(email, password);
  },

  async register(input: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    confirmPassword?: string;
    enrollmentNumber?: string;
    college?: string;
    department?: string;
    course?: string;
    classLevel?: string;
    semester?: string;
    academicYear?: string;
    exam: string;
    subject?: string;
    dateOfBirth: string;
    gender: string;
    state: string;
    city: string;
    targetExam?: string;
  }): Promise<AuthResult> {
    try {
      const response = await api.post<{
        user: PublicUser;
        accessToken: string;
      }>('/auth/register', {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        mobile: input.mobile.trim(),
        password: input.password,
        confirmPassword: input.confirmPassword || input.password,
        enrollmentNumber: input.enrollmentNumber,
        college: input.college,
        department: input.department,
        course: input.course,
        classLevel: input.classLevel || 'Class 12',
        semester: input.semester || '1',
        academicYear: input.academicYear || '2026-2027',
        exam: input.exam,
        subject: input.subject,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        state: input.state,
        city: input.city,
        targetExam: input.targetExam,
      });

      if (response && response.user) {
        setStoredToken(response.accessToken);
        const session: Session = {
          userId: response.user.id,
          role: response.user.role,
          issuedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));

        mutate((d) => {
          d.users.unshift({ ...response.user, password: '' } as User);
        });

        return { ok: true, user: response.user };
      }
    } catch (err: unknown) {
      if (USE_API) {
        const msg = err instanceof Error ? err.message : 'Registration failed. Please check your information.';
        return { ok: false, message: msg };
      }
    }

    return demoAuth.register({
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      password: input.password,
      exam: input.exam,
      classLevel: input.classLevel || 'Class 12',
      subject: input.subject || 'Physics',
    });
  },

  async forgotPassword(identifier: string): Promise<{ ok: boolean; message: string; codePreview?: string }> {
    try {
      const res = await api.post<{ message: string; codePreview?: string }>('/auth/forgot-password', {
        email: identifier.trim(),
      });
      return {
        ok: true,
        message: res.message || 'If an account exists, password recovery instructions have been sent.',
        codePreview: res.codePreview,
      };
    } catch {
      return demoAuth.forgotPassword(identifier);
    }
  },

  async resetPassword(params: { email: string; otp: string; newPassword: string }): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', params);
      return { ok: true, message: res.message || 'Password updated successfully.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed.';
      return { ok: false, message: msg };
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await api.post<{ message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return { ok: true, message: res.message || 'Password changed successfully.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      return { ok: false, message: msg };
    }
  },

  session(): Session | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw) as Session & { token?: string };
      if (stored.token) {
        delete stored.token;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
      }
      return stored;
    } catch {
      return null;
    }
  },

  currentUser(): PublicUser | null {
    const s = this.session();
    if (!s) return null;
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) return JSON.parse(saved) as PublicUser;
    } catch {
      // ignore
    }
    const user = getDB().users.find((u) => u.id === s.userId);
    return user ? strip(user) : null;
  },

  logout(): void {
    api.post('/auth/logout', {}).catch(() => null);
    clearStoredTokens();
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
  },

  async updateProfile(userId: string, patch: Partial<User & { profilePhoto?: string; college?: string; department?: string; course?: string }>): Promise<PublicUser | null> {
    if (USE_API) {
      const updated = await api.patch<PublicUser>(`/students/${userId}`, patch);
      if (!updated) return null;
      mutate((d) => {
        const user = d.users.find((item) => item.id === userId);
        if (user) Object.assign(user, patch, updated);
      });
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    }

    let updated: PublicUser | null = null;
    mutate((d) => {
      const user = d.users.find((item) => item.id === userId);
      if (user) {
        if (patch.exam && user.exam && patch.exam !== user.exam) {
          const examProgress = { ...(user.examProgress ?? {}) };
          examProgress[user.exam] = user.baseline ?? { solved: 0, tests: 0, accuracy: 0, score: 0 };
          user.examProgress = examProgress;
          user.baseline = examProgress[patch.exam] ?? { solved: 0, tests: 0, accuracy: 0, score: 0 };
        }
        Object.assign(user, patch);
        updated = strip(user);
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
      }
    });
    return updated;
  },
};

export const demoAuth = {
  ...authService,
  login(email: string, password: string): AuthResult {
    const db = getDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) return { ok: false, message: 'No account found with this email or mobile number.' };
    if (user.password && user.password !== password) return { ok: false, message: 'Incorrect password. Please try again.' };
    if (user.role === 'student' && user.status !== 'verified') {
      return { ok: false, message: 'Your account is pending verification. Contact support or the admin.' };
    }
    const session: Session = {
      userId: user.id,
      role: user.role,
      issuedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const publicU = strip(user);
    localStorage.setItem(USER_KEY, JSON.stringify(publicU));
    return { ok: true, user: publicU };
  },

  register(input: {
    name: string; email: string; mobile: string; password: string;
    exam: string; classLevel: string; subject: string;
  }): AuthResult {
    const db = getDB();
    if (db.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      return { ok: false, message: 'An account with this email already exists.' };
    }
    const user: User = {
      id: uid('S'),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      mobile: input.mobile.trim(),
      password: input.password,
      role: 'student',
      exam: input.exam as User['exam'],
      classLevel: input.classLevel,
      subjects: input.subject ? [input.subject] : [],
      status: 'verified',
      createdAt: new Date().toISOString().slice(0, 10),
      streak: 0,
      baseline: { solved: 0, tests: 0, accuracy: 0, score: 0 },
    };
    mutate((d) => { d.users.unshift(user); });
    const session: Session = { userId: user.id, role: 'student', issuedAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const publicU = strip(user);
    localStorage.setItem(USER_KEY, JSON.stringify(publicU));
    return { ok: true, user: publicU };
  },

  forgotPassword(email: string): { ok: boolean; message: string; codePreview?: string } {
    return {
      ok: true,
      message: `A recovery code has been generated for ${email}. (Dev recovery OTP: 123456)`,
      codePreview: '123456',
    };
  },
};
