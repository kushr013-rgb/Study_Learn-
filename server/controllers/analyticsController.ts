import type { Response } from 'express';
import { User } from '../models/User';
import { Question } from '../models/Question';
import { Assessment } from '../models/Assessment';
import { AssessmentAttempt } from '../models/AssessmentAttempt';
import { Mistake } from '../models/Mistake';
import type { AuthenticatedRequest } from '../middleware/auth';

export const analyticsController = {
  /**
   * Student analytics overview.
   */
  async getOverview(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const userId = req.query.userId && auth.role === 'admin' ? (req.query.userId as string) : auth.sub;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const [attempts, openMistakes] = await Promise.all([
      AssessmentAttempt.find({ userId }).sort({ submittedAt: -1 }).lean(),
      Mistake.countDocuments({ userId, resolved: false }),
    ]);

    const baseline = user.baseline ?? { solved: 0, tests: 0, accuracy: 0, score: 0 };
    const solved = attempts.reduce((s, a) => s + Number(a.correct || 0) + Number(a.wrong || 0), 0) + (baseline.solved || 0);
    const tests = attempts.length + (baseline.tests || 0);
    const accuracy = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + Number(a.accuracy || 0), 0) / attempts.length)
      : baseline.accuracy || 0;
    const score = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + Number(a.score || 0), 0) / attempts.length)
      : baseline.score || 0;

    return res.json({
      data: {
        solved,
        tests,
        accuracy,
        score,
        openMistakes,
        recentAttempts: attempts.slice(0, 10),
      },
    });
  },

  /**
   * System-wide platform metrics (Admin).
   */
  async getPlatformStats(_req: AuthenticatedRequest, res: Response) {
    const [studentsCount, facultyCount, questionsCount, testsCount, attemptsCount] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      Question.countDocuments(),
      Assessment.countDocuments(),
      AssessmentAttempt.countDocuments(),
    ]);

    const activeStudents = await User.countDocuments({ role: 'student', status: 'verified' });

    return res.json({
      data: {
        students: studentsCount,
        activeStudents,
        faculty: facultyCount,
        questions: questionsCount,
        tests: testsCount,
        attempts: attemptsCount,
      },
    });
  },
};
