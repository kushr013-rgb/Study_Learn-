import type { Attempt, AttemptAnswer, Mistake, Question } from '../lib/types';
import { getDB, mutate, uid } from './db';
import { questionService } from './questionService';
import { testService } from './testService';

export interface SubmitPayload {
  userId: string;
  mode: Attempt['mode'];
  testId?: string;
  testName: string;
  questionIds: string[];
  answers: Record<string, AttemptAnswer>;
  timeTaken: number;
}

/** Marks skipped questions explicitly so scoring is unambiguous. */
const normalise = (questionIds: string[], answers: Record<string, AttemptAnswer>) => {
  const out: Record<string, AttemptAnswer> = {};
  questionIds.forEach((id) => {
    const a = answers[id];
    out[id] = a ?? { selected: null, correct: false, timeSpent: 0, status: 'skipped' };
  });
  return out;
};

export const attemptService = {
  listByUser(userId: string, exam?: string): Attempt[] {
    const db = getDB();
    const activeExam = exam ?? db.users.find((u) => u.id === userId)?.exam;
    if (!activeExam) return [];
    const questionMap = new Map(db.questions.map((question) => [question.id, question]));
    return db.attempts.filter((attempt) =>
      attempt.userId === userId &&
      attempt.questionIds.length > 0 &&
      attempt.questionIds.every((id) => questionMap.get(id)?.exam === activeExam))
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  },

  listAll(): Attempt[] {
    return [...getDB().attempts].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  },

  getById(id: string): Attempt | undefined {
    return getDB().attempts.find((a) => a.id === id);
  },

  /** Evaluates a submission: scores it, persists it and syncs the mistake book. */
  submit(payload: SubmitPayload): Attempt {
    const answers = normalise(payload.questionIds, payload.answers);
    const questions = payload.questionIds
      .map((id) => questionService.getById(id))
      .filter((q): q is Question => Boolean(q));

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let score = 0;
    let maxScore = 0;

    questions.forEach((q) => {
      const a = answers[q.id];
      maxScore += q.marks;
      const isCorrect = a.selected !== null && String(a.selected) === String(q.answer);
      answers[q.id] = { ...a, correct: isCorrect };
      if (a.status === 'skipped' || a.selected === null) {
        skipped += 1;
      } else if (isCorrect) {
        correct += 1;
        score += q.marks;
      } else {
        wrong += 1;
        score -= q.negative;
      }
    });

    const attempted = correct + wrong;

    const attempt: Attempt = {
      id: uid('AT'),
      userId: payload.userId,
      testId: payload.testId ?? 'practice',
      testName: payload.testName,
      mode: payload.mode,
      questionIds: payload.questionIds,
      answers,
      score: Math.max(0, Math.round(score * 100) / 100),
      maxScore,
      correct,
      wrong,
      skipped,
      accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
      timeTaken: payload.timeTaken,
      submittedAt: new Date().toISOString(),
    };

    mutate((d) => {
      d.attempts.unshift(attempt);
      if (payload.testId) {
        const t = d.tests.find((x) => x.id === payload.testId);
        if (t) t.attempts += 1;
      }
      // Question usage counters (feeds admin analytics).
      payload.questionIds.forEach((id) => {
        const q = d.questions.find((x) => x.id === id);
        if (q) q.usage += 1;
      });
      // Mistake book sync: wrong answers create / refresh mistake entries.
      questions.forEach((q) => {
        const a = answers[q.id];
        if (a.selected === null || a.correct) return;
        const existing = d.mistakes.find((m) => m.userId === payload.userId && m.questionId === q.id);
        if (existing) {
          existing.attemptCount += 1;
          existing.wrongAnswer = a.selected;
          existing.resolved = false;
          existing.resolvedAt = undefined;
          existing.createdAt = attempt.submittedAt;
          existing.sourceTest = payload.testName;
        } else {
          const m: Mistake = {
            id: uid('M'),
            userId: payload.userId,
            questionId: q.id,
            wrongAnswer: a.selected,
            attemptCount: 1,
            resolved: false,
            createdAt: attempt.submittedAt,
            sourceTest: payload.testName,
          };
          d.mistakes.unshift(m);
        }
      });
    });

    // Sync attempt to MongoDB backend
    import('./apiClient').then(({ api }) => {
      api.post('/attempts', {
        testId: payload.testId || 'practice',
        answers: payload.answers,
        timeTaken: payload.timeTaken,
        mode: payload.mode,
        submissionKey: attempt.id,
      }).catch(() => null);
    }).catch(() => null);

    return attempt;
  },

  /** Re-attempt a mistake question: correct answers resolve the mistake. */
  resolveMistake(userId: string, questionId: string, selected: number | string): boolean {
    const q = questionService.getById(questionId);
    if (!q) return false;
    const isCorrect = String(selected) === String(q.answer);
    mutate((d) => {
      const m = d.mistakes.find((x) => x.userId === userId && x.questionId === questionId);
      if (!m) return;
      m.attemptCount += 1;
      m.wrongAnswer = isCorrect ? m.wrongAnswer : selected;
      if (isCorrect) {
        m.resolved = true;
        m.resolvedAt = new Date().toISOString();
      } else {
        m.resolved = false;
        m.resolvedAt = undefined;
      }
    });
    return isCorrect;
  },

  deleteMistake(userId: string, questionId: string): void {
    mutate((d) => {
      d.mistakes = d.mistakes.filter((m) => !(m.userId === userId && m.questionId === questionId));
    });
  },

  mistakesFor(userId: string): Mistake[] {
    const db = getDB();
    const exam = db.users.find((u) => u.id === userId)?.exam;
    if (!exam) return [];
    const questionMap = new Map(db.questions.map((question) => [question.id, question]));
    return db.mistakes.filter((mistake) =>
      mistake.userId === userId && questionMap.get(mistake.questionId)?.exam === exam)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  /** Questions a student has already seen (used to vary practice sets). */
  seenQuestionIds(userId: string): Set<string> {
    const set = new Set<string>();
    attemptService.listByUser(userId).forEach((attempt) => attempt.questionIds.forEach((id) => set.add(id)));
    return set;
  },

  /** Live test payload helper: full question objects bound to a test. */
  questionsFor(testId: string): Question[] {
    return testService.questions(testId);
  },
};
