import { Assessment } from '../models/Assessment';
import { AssessmentAttempt } from '../models/AssessmentAttempt';
import { Question } from '../models/Question';
import { Result } from '../models/Result';
import { Mistake } from '../models/Mistake';

export interface SubmitAttemptInput {
  userId: string;
  testId: string;
  answers: Record<string, { selected: number | string | null; timeSpent?: number }>;
  timeTaken: number;
  submissionKey?: string;
  mode?: 'test' | 'practice' | 'mistake' | 'daily';
}

export class AssessmentService {
  /**
   * Submit an assessment attempt with strict server-side evaluation.
   */
  async submitAttempt(input: SubmitAttemptInput) {
    const { userId, testId, answers = {}, timeTaken = 0, mode = 'test' } = input;
    const submissionKey = input.submissionKey || `sub-${userId}-${testId}-${Date.now()}`;

    // 1. Check for duplicate submission key (Idempotency)
    const existing = await AssessmentAttempt.findOne({ userId, submissionKey }).lean();
    if (existing) {
      return { attempt: existing, replay: true };
    }

    // 2. Fetch published test
    const test = await Assessment.findById(testId).lean();
    if (!test) {
      throw new Error('Assessment not found or unavailable.');
    }

    // 3. Fetch questions with answer keys from MongoDB
    const questionIds = [...new Set(test.questionIds || [])];
    if (questionIds.length === 0) {
      throw new Error('Assessment does not contain any questions.');
    }
    const questions = await Question.find({
      _id: { $in: questionIds },
      exam: test.exam,
      status: 'Published',
    }).lean();
    if (questions.length !== questionIds.length) {
      throw new Error('Assessment contains unavailable or mismatched questions.');
    }
    const questionMap = new Map(questions.map((q) => [q._id, q]));

    const evaluatedAnswers: Record<
      string,
      { selected: number | string | null; correct: boolean; timeSpent: number; status: 'answered' | 'skipped' }
    > = {};

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let score = 0;
    let maxScore = 0;
    const subjectScores: NonNullable<import('../models/AssessmentAttempt').IAssessmentAttempt['subjectScores']> = {};
    const newMistakes: Array<{ questionId: string; wrongAnswer: number | string | null }> = [];

    for (const qId of questionIds) {
      const q = questionMap.get(qId);
      if (!q) continue;

      const userAns = answers[qId]?.selected ?? null;
      const timeSpent = answers[qId]?.timeSpent ?? 0;
      const isSkipped = userAns === null || userAns === undefined || userAns === '';
      const marks = Number(q.marks || 4);
      const negative = Number(q.negative || 1);
      const subjectScore = subjectScores[q.subject] ??= { correct: 0, wrong: 0, skipped: 0, score: 0, maxScore: 0 };

      maxScore += marks;
      subjectScore.maxScore += marks;

      if (isSkipped) {
        skipped++;
        subjectScore.skipped++;
        evaluatedAnswers[qId] = { selected: null, correct: false, timeSpent, status: 'skipped' };
      } else {
        const isCorrect = String(userAns) === String(q.answer);
        if (isCorrect) {
          correct++;
          score += marks;
          subjectScore.correct++;
          subjectScore.score += marks;
          evaluatedAnswers[qId] = { selected: userAns, correct: true, timeSpent, status: 'answered' };
        } else {
          wrong++;
          score -= negative;
          subjectScore.wrong++;
          subjectScore.score -= negative;
          evaluatedAnswers[qId] = { selected: userAns, correct: false, timeSpent, status: 'answered' };
          newMistakes.push({ questionId: qId, wrongAnswer: userAns });
        }
      }
    }

    const attemptedCount = correct + wrong;
    const accuracy = attemptedCount > 0 ? Math.round((correct / attemptedCount) * 100) : 0;
    const finalScore = Math.max(0, Math.round(score * 100) / 100);
    const percentage = maxScore > 0 ? Math.max(0, Math.round((finalScore / maxScore) * 100)) : 0;

    const attemptId = `AT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const attemptDoc = {
      _id: attemptId,
      submissionKey,
      userId,
      testId,
      testName: test.name,
      exam: test.exam,
      examId: test.examId,
      mode,
      questionIds,
      answers: evaluatedAnswers,
      score: finalScore,
      maxScore,
      correct,
      wrong,
      skipped,
      accuracy,
      percentage,
      subjectScores,
      timeTaken: Number(timeTaken),
      submittedAt: new Date().toISOString(),
    };

    const attempt = await AssessmentAttempt.create(attemptDoc);

    // Increment assessment attempt counter & question usage
    await Assessment.updateOne({ _id: testId }, { $inc: { attempts: 1 } }).catch(() => null);
    await Question.updateMany({ _id: { $in: questionIds } }, { $inc: { usage: 1 } }).catch(() => null);

    // Create Result record
    await Result.create({
      _id: `RES-${attemptId}`,
      attemptId,
      userId,
      testId,
      testName: test.name,
      totalMarks: maxScore,
      obtainedMarks: finalScore,
      percentage,
      accuracy,
      evaluationStatus: 'completed',
      evaluatedAt: new Date(),
    }).catch(() => null);

    // Sync mistakes collection for the student
    for (const m of newMistakes) {
      await Mistake.findOneAndUpdate(
        { userId, questionId: m.questionId },
        {
          $set: { wrongAnswer: m.wrongAnswer, resolved: false, sourceTest: test.name },
          $inc: { attemptCount: 1 },
          $setOnInsert: { _id: `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`, createdAt: new Date().toISOString() },
        },
        { upsert: true }
      ).catch(() => null);
    }

    return { attempt: attempt.toObject(), replay: false };
  }
}

export const assessmentService = new AssessmentService();
