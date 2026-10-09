import type { Response } from 'express';
import { Assessment } from '../models/Assessment';
import { Question } from '../models/Question';
import { AssessmentAttempt } from '../models/AssessmentAttempt';
import { Mistake } from '../models/Mistake';
import { Exam } from '../models/Exam';
import { assessmentService } from '../services/assessmentService';
import type { AuthenticatedRequest } from '../middleware/auth';

const publicDoc = (doc: any) => {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id };
};

const studentExam = (req: AuthenticatedRequest, res: Response): string | undefined => {
  if (req.auth?.role !== 'student') return undefined;
  const exam = req.user?.exam?.trim();
  if (!exam) {
    res.status(403).json({ message: 'No exam category is assigned to this account.', code: 'EXAM_ACCESS_DENIED' });
    return undefined;
  }
  if (typeof req.query.exam === 'string' && req.query.exam !== exam) {
    res.status(403).json({ message: 'You are not authorized to access this exam content.', code: 'EXAM_ACCESS_DENIED' });
    return undefined;
  }
  return exam;
};

const canAccessAssessment = (req: AuthenticatedRequest, res: Response, exam: string, status: string): boolean => {
  if (req.auth?.role !== 'student') return true;
  const allowedExam = studentExam(req, res);
  if (!allowedExam) return false;
  if (exam !== allowedExam) {
    res.status(403).json({ message: 'You are not authorized to access this exam content.', code: 'EXAM_ACCESS_DENIED' });
    return false;
  }
  if (status !== 'Published') {
    res.status(404).json({ message: 'Assessment not found.', code: 'NOT_FOUND' });
    return false;
  }
  return true;
};

export const assessmentController = {
  /**
   * List assessments / tests.
   */
  async getAssessments(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const exam = studentExam(req, res);
    if (auth.role === 'student' && !exam) return;
    const filter: Record<string, unknown> = {};

    for (const key of ['exam', 'subject', 'type', 'difficulty', 'status']) {
      const val = req.query[key];
      if (typeof val === 'string' && val && val !== 'All') {
        filter[key] = val;
      }
    }

    // Students only see Published assessments
    if (auth.role === 'student') {
      filter.exam = exam;
      filter.status = 'Published';
    }

    const search = req.query.search;
    if (typeof search === 'string' && search.trim()) {
      filter.name = new RegExp(search.trim(), 'i');
    }

    const tests = await Assessment.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ data: tests.map(publicDoc) });
  },

  /**
   * Get assessment by ID.
   */
  async getAssessmentById(req: AuthenticatedRequest, res: Response) {
    const test = await Assessment.findById(req.params.id).lean();
    if (!test) {
      return res.status(404).json({ message: 'Assessment not found.', code: 'NOT_FOUND' });
    }
    if (!canAccessAssessment(req, res, test.exam, test.status)) return;
    return res.json({ data: publicDoc(test) });
  },

  /**
   * Get questions for an assessment.
   * Strip answers & explanations for students before test submission!
   */
  async getAssessmentQuestions(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const test = await Assessment.findById(req.params.id).lean();
    if (!test) {
      return res.status(404).json({ message: 'Assessment not found.', code: 'NOT_FOUND' });
    }
    if (!canAccessAssessment(req, res, test.exam, test.status)) return;

    const questionIds = test.questionIds || [];
    const questionFilter: Record<string, unknown> = { _id: { $in: questionIds } };
    if (req.auth?.role === 'student') {
      questionFilter.exam = test.exam;
      questionFilter.status = 'Published';
    }
    const questions = await Question.find(questionFilter).lean();

    const includeSolutions = auth.role === 'admin' || auth.role === 'faculty';

    const safeQuestions = questions.map((q) => {
      const { _id, answer, explanation, ...rest } = q;
      if (includeSolutions) {
        return { ...rest, id: _id, answer, explanation };
      }
      return { ...rest, id: _id };
    });

    return res.json({ data: safeQuestions });
  },

  /**
   * Create assessment (Faculty/Admin).
   */
  async createAssessment(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const { name, exam, subject, type = 'Topic Test', duration = 60, difficulty = 'Medium', questionIds = [] } = req.body ?? {};

    if (!name || !exam || !subject) {
      return res.status(400).json({ message: 'Name, exam, and subject are required.' });
    }
    if (!['JEE', 'NEET', 'Class 10', 'Class 12', 'MH-CET'].includes(exam)) {
      return res.status(422).json({ message: 'Select a supported exam category.', code: 'INVALID_EXAM_CATEGORY' });
    }
    const examRecord = await Exam.findOne({ code: exam }).select('_id').lean();
    if (!examRecord) {
      return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });
    }
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(422).json({ message: 'A test must contain at least one question.', code: 'INVALID_QUESTION_SET' });
    }
    const durationMinutes = Number(duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 600) {
      return res.status(422).json({ message: 'Duration must be between 1 and 600 minutes.', code: 'INVALID_DURATION' });
    }
    const uniqueQuestionIds = [...new Set(questionIds.map(String))];
    const matchingQuestions = await Question.countDocuments({
      _id: { $in: uniqueQuestionIds },
      exam,
      examId: examRecord._id,
      subject,
      status: 'Published',
    });
    if (matchingQuestions !== uniqueQuestionIds.length) {
      return res.status(422).json({ message: 'All test questions must be published and match the selected exam and subject.', code: 'INVALID_QUESTION_SET' });
    }

    const tId = `T-${Date.now()}`;
    const test = await Assessment.create({
      _id: tId,
      name: String(name).trim(),
      exam,
      subject,
      type,
      duration: durationMinutes,
      difficulty,
      questionIds: uniqueQuestionIds,
      totalMarks: uniqueQuestionIds.length * 4,
      status: req.body?.status || 'Draft',
      createdBy: auth.sub,
      attempts: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    return res.status(201).json({ data: publicDoc(test.toObject()) });
  },

  /**
   * Update assessment.
   */
  async updateAssessment(req: AuthenticatedRequest, res: Response) {
    const patch = { ...req.body };
    delete patch._id;
    delete patch.id;
    delete patch.attempts;
    if (patch.exam) {
      const examRecord = await Exam.findOne({ code: patch.exam }).select('_id').lean();
      if (!examRecord) {
        return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });
      }
      const existing = await Assessment.findById(req.params.id).select('questionIds subject').lean();
      if (!existing) return res.status(404).json({ message: 'Assessment not found.' });
      const subject = patch.subject ?? existing.subject;
      const validQuestionCount = await Question.countDocuments({
        _id: { $in: existing.questionIds }, exam: patch.exam, subject, status: 'Published',
      });
      if (validQuestionCount !== existing.questionIds.length) {
        return res.status(422).json({ message: 'Assessment questions must match the selected exam and subject.', code: 'INVALID_QUESTION_SET' });
      }
      patch.examId = examRecord._id;
    }

    const test = await Assessment.findByIdAndUpdate(req.params.id, patch, { new: true }).lean();
    if (!test) {
      return res.status(404).json({ message: 'Assessment not found.' });
    }

    return res.json({ data: publicDoc(test) });
  },

  /**
   * Delete assessment.
   */
  async deleteAssessment(req: AuthenticatedRequest, res: Response) {
    const result = await Assessment.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) {
      return res.status(404).json({ message: 'Assessment not found.' });
    }
    return res.status(204).send();
  },

  /**
   * Submit assessment attempt (Student).
   */
  async submitAssessment(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const testId = req.body?.testId || req.params.id;
    const { answers, timeTaken, mode } = req.body ?? {};
    const submissionKey = req.header('idempotency-key') || req.body?.submissionKey;

    if (!testId) {
      return res.status(400).json({ message: 'Test ID is required.' });
    }

    const test = await Assessment.findById(testId).lean();
    if (!test) {
      return res.status(404).json({ message: 'Assessment not found.', code: 'NOT_FOUND' });
    }
    if (!canAccessAssessment(req, res, test.exam, test.status)) return;

    try {
      const result = await assessmentService.submitAttempt({
        userId: auth.sub,
        testId,
        answers,
        timeTaken: Number(timeTaken || 0),
        submissionKey,
        mode,
      });

      return res.status(result.replay ? 200 : 201).json({
        data: publicDoc(result.attempt),
        meta: { replay: result.replay },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed.';
      return res.status(400).json({ message: msg });
    }
  },

  /**
   * Get attempts.
   */
  async getAttempts(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const targetUserId = auth.role === 'admin' ? (req.query.userId as string) : auth.sub;

    const filter: Record<string, unknown> = {};
    if (targetUserId) filter.userId = targetUserId;
    if (auth.role === 'student') {
      const exam = studentExam(req, res);
      if (!exam) return;
      filter.exam = exam;
    }

    const attempts = await AssessmentAttempt.find(filter).sort({ submittedAt: -1 }).lean();
    return res.json({ data: attempts.map(publicDoc) });
  },

  /**
   * Get single attempt with full answers.
   */
  async getAttemptById(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const attempt = await AssessmentAttempt.findById(req.params.id).lean();

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.', code: 'NOT_FOUND' });
    }

    // IDOR protection
    if (auth.role !== 'admin' && attempt.userId !== auth.sub) {
      return res.status(403).json({ message: 'Access denied: not your attempt.', code: 'FORBIDDEN' });
    }
    if (auth.role === 'student') {
      const exam = studentExam(req, res);
      if (!exam) return;
      let attemptExam = attempt.exam;
      if (!attemptExam && attempt.testId !== 'practice') {
        attemptExam = (await Assessment.findById(attempt.testId).select('exam').lean())?.exam;
      }
      if (!attemptExam && attempt.questionIds.length) {
        const questions = await Question.find({ _id: { $in: attempt.questionIds } }).select('exam').lean();
        if (questions.length === attempt.questionIds.length && questions.every((question) => question.exam === questions[0].exam)) {
          attemptExam = questions[0].exam;
        }
      }
      if (attemptExam !== exam) {
        return res.status(403).json({ message: 'You are not authorized to access this exam result.', code: 'EXAM_ACCESS_DENIED' });
      }
    }

    return res.json({ data: publicDoc(attempt) });
  },

  /**
   * Get student mistakes.
   */
  async getMistakes(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const userId = auth.role === 'admin' ? (req.query.userId as string) : auth.sub;

    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (auth.role === 'student') {
      const exam = studentExam(req, res);
      if (!exam) return;
      const examQuestions = await Question.find({ exam }).distinct('_id');
      filter.questionId = { $in: examQuestions };
    }

    if (req.query.resolved !== undefined) {
      filter.resolved = req.query.resolved === 'true';
    }

    const mistakes = await Mistake.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ data: mistakes.map(publicDoc) });
  },

  /**
   * Re-attempt a mistake.
   */
  async reattemptMistake(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const questionId = req.params.questionId;
    const selected = req.body?.selected;

    const question = await Question.findById(questionId).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }
    if (auth.role === 'student') {
      const exam = studentExam(req, res);
      if (!exam) return;
      if (question.exam !== exam || question.status !== 'Published') {
        return res.status(403).json({ message: 'You are not authorized to access this exam content.', code: 'EXAM_ACCESS_DENIED' });
      }
    }

    const isCorrect = String(selected) === String(question.answer);
    const mistake = await Mistake.findOneAndUpdate(
      { userId: auth.sub, questionId },
      {
        $set: {
          resolved: isCorrect,
          resolvedAt: isCorrect ? new Date().toISOString() : undefined,
        },
        $inc: { attemptCount: 1 },
      },
      { new: true }
    ).lean();

    return res.json({
      data: {
        resolved: isCorrect,
        correct: isCorrect,
        mistake: mistake ? publicDoc(mistake) : null,
      },
    });
  },
};
