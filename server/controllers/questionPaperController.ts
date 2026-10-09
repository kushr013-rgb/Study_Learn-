import type { Response } from 'express';
import path from 'node:path';
import { QuestionPaper, type IExtractedQuestion } from '../models/QuestionPaper';
import { Question } from '../models/Question';
import { Exam } from '../models/Exam';
import { parserService } from '../services/parserService';
import { AuditLog } from '../models/AuditLog';
import type { AuthenticatedRequest } from '../middleware/auth';

export const questionPaperController = {
  /**
   * Upload question paper (PDF, Excel, Word), parse and return extraction preview.
   */
  async uploadPaper(req: AuthenticatedRequest, res: Response) {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded. Please select a valid PDF, Excel, or Word document.', code: 'NO_FILE' });
    }

    const {
      title,
      subject = 'General',
      course = 'Standard',
      semester = '1',
      assessmentType = 'Chapter Test',
      targetClass = 'Class 12',
    } = req.body ?? {};

    const auth = req.auth!;
    const paperId = `QP-${Date.now()}`;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '') as 'pdf' | 'xlsx' | 'xls' | 'docx' | 'doc';

    try {
      // Parse file using ParserService
      const parseResult = await parserService.parseFile(file.path, ext, subject);

      const paper = await QuestionPaper.create({
        _id: paperId,
        title: String(title || file.originalname.replace(/\.[^/.]+$/, '')).trim(),
        subject,
        course,
        semester,
        assessmentType,
        targetClass,
        originalFileName: file.originalname,
        storedFileName: file.filename,
        fileType: ext,
        fileSize: file.size,
        filePath: file.path,
        uploaderId: auth.sub,
        uploaderName: auth.name || 'Faculty Member',
        uploaderRole: (auth.role === 'admin' ? 'admin' : 'faculty') as 'faculty' | 'admin',
        status: 'pending_review',
        extractedQuestions: parseResult.questions,
        totalExtracted: parseResult.totalParsed,
        approvedCount: 0,
        createdAt: new Date().toISOString(),
      });

      await AuditLog.create({
        actorId: auth.sub,
        actorRole: auth.role,
        actorName: auth.name,
        action: 'QUESTION_PAPER_UPLOADED',
        resource: 'question_papers',
        resourceId: paperId,
        metadata: {
          originalName: file.originalname,
          totalParsed: parseResult.totalParsed,
          validCount: parseResult.validCount,
        },
      });

      return res.status(201).json({
        data: {
          paper,
          parseSummary: {
            totalParsed: parseResult.totalParsed,
            validCount: parseResult.validCount,
            invalidCount: parseResult.invalidCount,
            warnings: parseResult.warnings,
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse document.';
      return res.status(422).json({
        message: `Question paper parsing error: ${msg}`,
        code: 'PARSE_FAILED',
      });
    }
  },

  /**
   * List uploaded question papers.
   */
  async listPapers(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const filter: Record<string, unknown> = {};

    // Faculty sees only their papers, Admin sees all
    if (auth.role === 'faculty') {
      filter.uploaderId = auth.sub;
    }

    const { subject, status } = req.query;
    if (subject && subject !== 'All') filter.subject = String(subject);
    if (status && status !== 'All') filter.status = String(status);

    const papers = await QuestionPaper.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ data: papers });
  },

  /**
   * Get question paper details with extraction preview.
   */
  async getPaperById(req: AuthenticatedRequest, res: Response) {
    const paper = await QuestionPaper.findById(String(req.params.id)).lean();
    if (!paper) {
      return res.status(404).json({ message: 'Question paper not found.', code: 'NOT_FOUND' });
    }

    return res.json({ data: paper });
  },

  /**
   * Approve questions from paper and write them into the Question collection.
   */
  async approveQuestions(req: AuthenticatedRequest, res: Response) {
    const paperId = String(req.params.id);
    const paper = await QuestionPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: 'Question paper not found.', code: 'NOT_FOUND' });
    }

    const auth = req.auth!;
    // Allow either the approved questions from body or the paper's extracted questions
    const questionsToApprove: IExtractedQuestion[] = req.body?.questions || paper.extractedQuestions;

    if (!Array.isArray(questionsToApprove) || questionsToApprove.length === 0) {
      return res.status(400).json({ message: 'No questions provided for approval.' });
    }

    const defaultExam = req.body?.exam || 'JEE';
    const defaultSubject = req.body?.subject || paper.subject || 'Physics';
    const defaultStatus = req.body?.publish ? 'Published' : 'Draft';
    const examRecord = await Exam.findOne({ code: defaultExam }).select('_id').lean();
    if (!examRecord) {
      return res.status(422).json({ message: 'Select a configured exam category.', code: 'INVALID_EXAM_CATEGORY' });
    }

    const createdQuestions = [];
    for (const [index, q] of questionsToApprove.entries()) {
      const qId = `Q-${Date.now()}-${index + 1}`;
      const doc = await Question.create({
        _id: qId,
        exam: defaultExam,
        examId: examRecord._id,
        subject: defaultSubject,
        chapter: q.chapter || `${paper.subject} Chapter`,
        topic: q.topic || 'Concept Test',
        difficulty: q.difficulty || 'Medium',
        type: q.type || 'MCQ',
        text: q.text,
        options: q.options,
        answer: q.answer,
        marks: Number(q.marks || 4),
        negative: Number(q.negative || 1),
        explanation: q.explanation || 'Detailed answer explanation.',
        status: defaultStatus,
        createdBy: auth.sub,
        paperId: paper._id,
        usage: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      createdQuestions.push(doc);
    }

    paper.status = 'approved';
    paper.approvedCount = createdQuestions.length;
    await paper.save();

    await AuditLog.create({
      actorId: auth.sub,
      actorRole: auth.role,
      actorName: auth.name,
      action: 'QUESTION_PAPER_APPROVED',
      resource: 'question_papers',
      resourceId: paperId,
      metadata: { count: createdQuestions.length, status: defaultStatus },
    });

    return res.json({
      message: `Successfully approved and stored ${createdQuestions.length} questions in MongoDB.`,
      data: {
        paper,
        createdQuestionsCount: createdQuestions.length,
      },
    });
  },

  /**
   * Reject paper.
   */
  async rejectPaper(req: AuthenticatedRequest, res: Response) {
    const paper = await QuestionPaper.findByIdAndUpdate(
      String(req.params.id),
      { status: 'rejected' },
      { new: true }
    );
    if (!paper) {
      return res.status(404).json({ message: 'Question paper not found.' });
    }
    return res.json({ data: paper });
  },
};
