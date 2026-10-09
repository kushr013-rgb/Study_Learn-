import type { Response } from 'express';
import { Department, Subject } from '../models/Academic';
import { Curriculum } from '../models/Curriculum';
import { Exam } from '../models/Exam';
import type { AuthenticatedRequest } from '../middleware/auth';

const publicDoc = (doc: any) => {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id };
};

export const academicController = {
  /**
   * List departments.
   */
  async getDepartments(_req: AuthenticatedRequest, res: Response) {
    let departments = await Department.find().sort({ name: 1 }).lean();
    if (departments.length === 0) {
      // Seed default departments if empty
      const defaults = [
        { _id: 'DEP-CSE', name: 'Computer Science & Engineering', code: 'CSE', description: 'Core CS and Engineering' },
        { _id: 'DEP-SCI', name: 'Science & Physics', code: 'SCI', description: 'Fundamental Sciences' },
        { _id: 'DEP-MED', name: 'Medical & Life Sciences', code: 'MED', description: 'Medical and Biology' },
        { _id: 'DEP-MATH', name: 'Mathematics & Statistics', code: 'MATH', description: 'Pure & Applied Mathematics' },
      ];
      await Department.insertMany(defaults);
      departments = defaults as never[];
    }
    return res.json({ data: departments.map(publicDoc) });
  },

  /**
   * Create department (Admin).
   */
  async createDepartment(req: AuthenticatedRequest, res: Response) {
    const { name, code, description } = req.body ?? {};
    if (!name || !code) return res.status(400).json({ message: 'Name and code are required.' });

    const depId = `DEP-${code.toUpperCase().trim()}`;
    const department = await Department.create({ _id: depId, name: name.trim(), code: code.toUpperCase().trim(), description });
    return res.status(201).json({ data: publicDoc(department.toObject()) });
  },

  /**
   * List subjects.
   */
  async getSubjects(req: AuthenticatedRequest, res: Response) {
    const filter: Record<string, unknown> = {};
    if (req.query.exam) filter.exam = req.query.exam;
    if (req.query.department) filter.department = req.query.department;

    const subjects = await Subject.find(filter).sort({ name: 1 }).lean();
    return res.json({ data: subjects.map(publicDoc) });
  },

  /**
   * Create subject (Admin/Faculty).
   */
  async createSubject(req: AuthenticatedRequest, res: Response) {
    const { name, code, department = 'General', exam = 'JEE' } = req.body ?? {};
    if (!name) return res.status(400).json({ message: 'Subject name is required.' });
    const examRecord = await Exam.findOne({ code: exam }).select('_id').lean();
    if (!examRecord) return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });

    const sId = `SUB-${Date.now()}`;
    const subject = await Subject.create({
      _id: sId,
      name: name.trim(),
      code: code ? code.trim() : name.slice(0, 4).toUpperCase(),
      department,
      exam,
      examId: examRecord._id,
    });
    return res.status(201).json({ data: publicDoc(subject.toObject()) });
  },

  /**
   * List curriculum entries.
   */
  async getCurriculum(req: AuthenticatedRequest, res: Response) {
    const filter: Record<string, unknown> = {};
    for (const key of ['exam', 'subject', 'chapter', 'topic']) {
      const val = req.query[key];
      if (typeof val === 'string' && val && val !== 'All') {
        filter[key] = val;
      }
    }

    const entries = await Curriculum.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ data: entries.map(publicDoc) });
  },

  /**
   * Create curriculum entry.
   */
  async createCurriculum(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const { exam, subject, chapter, topic } = req.body ?? {};

    if (!exam || !subject) {
      return res.status(400).json({ message: 'Exam and subject are required.' });
    }
    const examRecord = await Exam.findOne({ code: exam }).select('_id').lean();
    if (!examRecord) return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });

    const id = `CUR-${Date.now()}`;
    const entry = await Curriculum.create({
      _id: id,
      exam,
      examId: examRecord._id,
      subject: subject.trim(),
      chapter: chapter ? chapter.trim() : undefined,
      topic: topic ? topic.trim() : undefined,
      createdBy: auth.sub,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    return res.status(201).json({ data: publicDoc(entry.toObject()) });
  },

  /**
   * Delete curriculum entry.
   */
  async deleteCurriculum(req: AuthenticatedRequest, res: Response) {
    const result = await Curriculum.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Curriculum entry not found.' });
    return res.status(204).send();
  },
};
