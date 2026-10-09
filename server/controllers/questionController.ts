import type { Response } from 'express';
import { Question } from '../models/Question';
import { Assessment } from '../models/Assessment';
import { Exam } from '../models/Exam';
import type { AuthenticatedRequest } from '../middleware/auth';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getStudentExam = (req: AuthenticatedRequest, res: Response): string | undefined => {
  if (req.auth?.role !== 'student') return undefined;
  const exam = req.user?.exam?.trim();
  if (!exam) {
    res.status(403).json({ message: 'No exam category is assigned to this account.', code: 'EXAM_ACCESS_DENIED' });
    return undefined;
  }

  const requestedExam = req.query.exam;
  if (typeof requestedExam === 'string' && requestedExam !== exam) {
    res.status(403).json({ message: 'You are not authorized to access this exam content.', code: 'EXAM_ACCESS_DENIED' });
    return undefined;
  }

  return exam;
};

const publicQuestion = (question: any, includeSolutions: boolean) => {
  if (!question) return question;
  const { _id, ...safe } = question;
  const item: any = { ...safe, id: _id };
  if (includeSolutions) return item;
  delete item.answer;
  delete item.explanation;
  return item;
};

export const questionController = {
  /**
   * List questions with search, filters, and pagination.
   */
  async getQuestions(req: AuthenticatedRequest, res: Response) {
    const studentExam = getStudentExam(req, res);
    if (req.auth?.role === 'student' && !studentExam) return;

    const filter: Record<string, unknown> = {};
    for (const key of ['exam', 'subject', 'chapter', 'topic', 'difficulty', 'status']) {
      const val = req.query[key];
      if (typeof val === 'string' && val && val !== 'All') {
        filter[key] = val;
      }
    }
    if (studentExam) {
      filter.exam = studentExam;
      filter.status = 'Published';
    }

    const search = req.query.search;
    if (typeof search === 'string' && search.trim()) {
      const reg = new RegExp(escapeRegex(search.trim().slice(0, 120)), 'i');
      filter.$or = [{ text: reg }, { chapter: reg }, { topic: reg }, { subject: reg }];
    }

    const pageValue = Number(req.query.page ?? 1);
    const pageSizeValue = Number(req.query.pageSize ?? req.query.limit ?? 50);
    const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
    const pageSize = Number.isFinite(pageSizeValue) ? Math.min(100, Math.max(1, Math.floor(pageSizeValue))) : 50;

    const [items, total] = await Promise.all([
      Question.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Question.countDocuments(filter),
    ]);

    const auth = req.auth;
    const includeSolutions = auth?.role === 'admin' || auth?.role === 'faculty';

    return res.json({
      data: {
        items: items.map((q) => publicQuestion(q, includeSolutions)),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  },

  /**
   * Get single question.
   */
  async getQuestionById(req: AuthenticatedRequest, res: Response) {
    const question = await Question.findById(req.params.id).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found.', code: 'NOT_FOUND' });
    }

    const auth = req.auth;
    if (auth?.role === 'student') {
      const exam = getStudentExam(req, res);
      if (!exam) return;
      if (question.exam !== exam) {
        return res.status(403).json({ message: 'You are not authorized to access this exam content.', code: 'EXAM_ACCESS_DENIED' });
      }
      if (question.status !== 'Published') {
        return res.status(404).json({ message: 'Question not found.', code: 'NOT_FOUND' });
      }
    }
    const includeSolutions = auth?.role === 'admin' || auth?.role === 'faculty';
    return res.json({ data: publicQuestion(question, includeSolutions) });
  },

  /**
   * Create question.
   */
  async createQuestion(req: AuthenticatedRequest, res: Response) {
    const input = req.body ?? {};
    const auth = req.auth!;

    const required = ['exam', 'subject', 'chapter', 'topic', 'difficulty', 'type', 'text', 'marks', 'negative'];
    for (const r of required) {
      if (input[r] === undefined || input[r] === '') {
        return res.status(400).json({ message: `Field '${r}' is required.` });
      }
    }
    const examRecord = await Exam.findOne({ code: input.exam }).select('_id').lean();
    if (!examRecord) {
      return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });
    }

    const qId = `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const question = await Question.create({
      ...input,
      _id: qId,
      examId: examRecord._id,
      status: input.status || 'Published',
      createdBy: auth.sub,
      usage: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    return res.status(201).json({ data: publicQuestion(question.toObject(), true) });
  },

  /**
   * Update question.
   */
  async updateQuestion(req: AuthenticatedRequest, res: Response) {
    const patch = { ...req.body };
    delete patch._id;
    delete patch.id;
    delete patch.usage;
    if (patch.exam) {
      const examRecord = await Exam.findOne({ code: patch.exam }).select('_id').lean();
      if (!examRecord) {
        return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });
      }
      patch.examId = examRecord._id;
    }

    const question = await Question.findByIdAndUpdate(req.params.id, patch, { new: true }).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found.', code: 'NOT_FOUND' });
    }

    return res.json({ data: publicQuestion(question, true) });
  },

  /**
   * Update question status.
   */
  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const { status } = req.body ?? {};
    if (!status || !['Draft', 'Published', 'Archived'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Draft, Published, or Archived.' });
    }

    const question = await Question.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found.', code: 'NOT_FOUND' });
    }

    return res.json({ data: publicQuestion(question, true) });
  },

  /**
   * Delete question.
   */
  async deleteQuestion(req: AuthenticatedRequest, res: Response) {
    const qId = req.params.id;
    const result = await Question.deleteOne({ _id: qId });
    await Assessment.updateMany({}, { $pull: { questionIds: qId } });

    if (!result.deletedCount) {
      return res.status(404).json({ message: 'Question not found.', code: 'NOT_FOUND' });
    }

    return res.status(204).send();
  },

  /**
   * Category counts.
   */
  async getCategories(req: AuthenticatedRequest, res: Response) {
    const studentExam = getStudentExam(req, res);
    if (req.auth?.role === 'student' && !studentExam) return;
    const match: Record<string, unknown> = { status: 'Published' };
    if (studentExam) match.exam = studentExam;
    const categories = await Question.aggregate([
      { $match: match },
      { $group: { _id: { exam: '$exam', subject: '$subject', chapter: '$chapter', topic: '$topic' }, count: { $sum: 1 } } },
      { $sort: { count: -1, '_id.exam': 1, '_id.subject': 1 } },
      { $project: { _id: 0, exam: '$_id.exam', subject: '$_id.subject', chapter: '$_id.chapter', topic: '$_id.topic', count: 1 } },
    ]);
    return res.json({ data: categories });
  },

  /**
   * Stats aggregation.
   */
  async getStats(req: AuthenticatedRequest, res: Response) {
    const studentExam = getStudentExam(req, res);
    if (req.auth?.role === 'student' && !studentExam) return;
    const pipeline = studentExam
      ? [{ $match: { exam: studentExam, status: 'Published' } }]
      : [];
    const stats = await Question.aggregate([
      ...pipeline,
      { $group: { _id: { status: '$status', difficulty: '$difficulty', exam: '$exam' }, count: { $sum: 1 } } },
    ]);
    return res.json({ data: stats });
  },

  /**
   * Practice set generator (strips answer and explanation!).
   */
  async getPracticeSet(req: AuthenticatedRequest, res: Response) {
    const studentExam = getStudentExam(req, res);
    if (req.auth?.role === 'student' && !studentExam) return;
    const { subject = 'Physics', chapter, topic, difficulty = 'Mixed', count = 10 } = req.query;
    const exam = studentExam ?? (typeof req.query.exam === 'string' ? req.query.exam : 'JEE');
    const filter: Record<string, unknown> = { exam, subject, status: 'Published' };

    if (chapter && chapter !== 'All') filter.chapter = chapter;
    if (topic && topic !== 'All' && topic !== 'All Topics') filter.topic = topic;
    if (difficulty && difficulty !== 'Mixed') filter.difficulty = difficulty;

    const countValue = Number(count);
    const limit = Number.isFinite(countValue) ? Math.min(50, Math.max(1, Math.floor(countValue))) : 10;
    const questions = await Question.find(filter).limit(limit).lean();
    return res.json({
      data: questions.map((q) => publicQuestion(q, false)),
    });
  },
};
